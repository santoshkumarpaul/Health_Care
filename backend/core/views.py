import random
import hashlib
from rest_framework import viewsets, status, permissions, filters
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend

from .models import User, OTPVerification, AuditLog
from .serializers import UserSerializer, OTPVerificationSerializer, AuditLogSerializer

def log_audit(actor, action_str, resource_str, tx_hash=None):
    AuditLog.objects.create(
        actor=actor,
        action=action_str,
        resource=resource_str,
        tx_hash=tx_hash or hashlib.sha256(f"{timezone.now()}{actor}{action_str}".encode()).hexdigest()
    )

def resolve_identifier(identifier):
    if not identifier: return None
    
    # Special case for admin
    if identifier.strip().lower() == "admin":
        return {'phone_number': 'admin'}
        
    # Support for emails (for admins)
    if "@" in identifier:
        return {'email': identifier.strip().lower()}

    # Remove all non-digit characters except possibly a leading plus
    clean_id = "".join([c for c in identifier if c.isdigit()])
    
    # Standardize: if it starts with 91 and is 12 digits
    if len(clean_id) == 12 and clean_id.startswith("91"):
        return {'phone_number': clean_id[2:]}
        
    if len(clean_id) == 10:
        return {'phone_number': clean_id}
        
    if len(clean_id) == 12:
        return {'aadhaar_number': clean_id}

    return None

class LoginView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        identifier = request.data.get('identifier') or request.data.get('phone_number')
        password = request.data.get('password')

        lookup = resolve_identifier(identifier)
        if not lookup or not password:
            return Response({'error': 'Valid Mobile/Aadhaar and password are required'}, status=status.HTTP_400_BAD_REQUEST)

        # Currently authenticate backend requires phone_number
        # We need to find the phone_number if aadhaar is provided
        phone_number = None
        email = None
        if 'aadhaar_number' in lookup:
            u = User.objects.filter(aadhaar_number=lookup['aadhaar_number']).first()
            if u: phone_number = u.phone_number
        elif 'email' in lookup:
            email = lookup['email']
        else:
            phone_number = lookup['phone_number']

        # Try exact match first
        user = None
        if email:
            # If email is provided, find the user with that email first
            u = User.objects.filter(email=email).first()
            if u:
                user = authenticate(phone_number=u.phone_number, password=password)
        elif phone_number:
            user = authenticate(phone_number=phone_number, password=password)
            # If that fails, try with +91 prefix for legacy support
            if not user and not phone_number.startswith('+'):
                user = authenticate(phone_number=f"+91{phone_number}", password=password)
        
        if not user:
            return Response({'error': 'Invalid credentials. Please try again.'}, status=status.HTTP_401_UNAUTHORIZED)

        refresh = RefreshToken.for_user(user)
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'role': user.role,
            'user_id': user.id,
            'phone': user.phone_number
        })

class SendOTPView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        print(f"DEBUG: SendOTPView.post data: {request.data}")
        identifier = request.data.get('identifier') or request.data.get('phone_number')
        if not identifier:
            return Response({'error': 'Mobile number or Aadhaar is required'}, status=status.HTTP_400_BAD_REQUEST)
            
        lookup = resolve_identifier(identifier)
        print(f"DEBUG: resolve_identifier result: {lookup}")
        if not lookup:
            return Response({'error': 'Valid 10-digit Mobile or 12-digit Aadhaar required'}, status=status.HTTP_400_BAD_REQUEST)
        
        phone_number = None
        if 'aadhaar_number' in lookup:
            user = User.objects.filter(aadhaar_number=lookup['aadhaar_number']).first()
            if not user:
                return Response({'error': 'Aadhaar not registered. Please sign up.'}, status=status.HTTP_404_NOT_FOUND)
            phone_number = user.phone_number
        else:
            phone_number = lookup['phone_number']
        
        if not phone_number:
            return Response({'error': 'Internal Error: Could not resolve phone number'}, status=status.HTTP_400_BAD_REQUEST)

        otp_code = f"{random.randint(100000, 999999)}"
        OTPVerification.objects.create(phone_number=phone_number, otp_code=otp_code)
        
        # Send via Twilio
        from .sms_utils import send_otp_sms
        sms_sent = send_otp_sms(phone_number, otp_code)
        
        print(f"--- MOCK SMS: OTP for {phone_number} is {otp_code} ---")
        return Response({
            'message': 'OTP sent successfully' if sms_sent else 'OTP sent successfully (Dev Mode)', 
            'otp_demo': otp_code
        })

class VerifyOTPView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        print(f"DEBUG: VerifyOTPView.post data: {request.data}")
        identifier = request.data.get('identifier') or request.data.get('phone_number')
        otp_code = request.data.get('otp_code')
        role = request.data.get('role', 'patient')
        intent = request.data.get('intent', 'login')
        password = request.data.get('password')
        
        # New registration fields
        name = request.data.get('name', f"User {random.randint(1000,9999)}")
        reg_aadhaar = request.data.get('aadhaar_number')
        
        phone_number = None
        aadhaar_number = None
        
        print(f"DEBUG: identifier={identifier}, role={role}, intent={intent}")

        # Resolve the phone number and Aadhaar
        if intent == 'register':
            if role == 'patient':
                if not reg_aadhaar or len(reg_aadhaar) != 12 or not reg_aadhaar.isdigit():
                    return Response({'error': 'Aadhaar number must be exactly 12 digits'}, status=400)
                aadhaar_number = reg_aadhaar
            
            mobile_lookup = resolve_identifier(identifier)
            if not mobile_lookup or 'phone_number' not in mobile_lookup:
                return Response({'error': 'Mobile number must be exactly 10 digits'}, status=400)
            phone_number = mobile_lookup['phone_number']
            
            if User.objects.filter(phone_number=phone_number).exists():
                return Response({'error': 'Mobile number already registered'}, status=400)
            if role == 'patient' and User.objects.filter(aadhaar_number=aadhaar_number).exists():
                return Response({'error': 'Aadhaar already registered'}, status=400)
        else:
            lookup = resolve_identifier(identifier)
            if not lookup:
                return Response({'error': 'Valid Mobile/Aadhaar identifier required'}, status=400)
            if 'aadhaar_number' in lookup:
                user = User.objects.filter(aadhaar_number=lookup['aadhaar_number']).first()
                if not user: return Response({'error': 'Aadhaar not found'}, status=404)
                phone_number = user.phone_number
                aadhaar_number = user.aadhaar_number
            else:
                phone_number = lookup['phone_number']

        if not phone_number:
            return Response({'error': 'Mobile number is required'}, status=status.HTTP_400_BAD_REQUEST)
        if not otp_code:
            return Response({'error': 'OTP code is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            otp_record = OTPVerification.objects.filter(phone_number=phone_number).latest('created_at')
            otp_record.attempts += 1
            otp_record.save()

            if not otp_record.is_valid():
                return Response({'error': 'Invalid, expired, or maximum attempts reached for OTP'}, status=status.HTTP_400_BAD_REQUEST)

            if otp_record.otp_code != otp_code:
                return Response({'error': 'Incorrect OTP'}, status=status.HTTP_400_BAD_REQUEST)
            
            otp_record.is_used = True
            otp_record.save()

            user = User.objects.filter(phone_number=phone_number).first()
            if intent == 'login' and not user:
                return Response({'error': 'Account not found. Please register first.'}, status=status.HTTP_404_NOT_FOUND)
            elif intent == 'register':
                user = User.objects.create_user(
                    phone_number=phone_number, 
                    aadhaar_number=aadhaar_number,
                    role=role,
                    password=password
                )
                from patients.models import Patient
                from doctors.models import Doctor
                if role == 'patient':
                    Patient.objects.create(user=user, name=name)
                elif role in ['doctor', 'lab', 'pharma', 'clinic']:
                    Doctor.objects.create(user=user, name=name)

            refresh = RefreshToken.for_user(user)
            return Response({
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'role': user.role,
                'user_id': user.id,
                'phone': user.phone_number
            })
        except OTPVerification.DoesNotExist:
            return Response({'error': 'No OTP requested for this number'}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ResetPasswordView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        identifier = request.data.get('identifier') or request.data.get('phone_number')
        otp_code = request.data.get('otp_code')
        new_password = request.data.get('new_password')

        lookup = resolve_identifier(identifier)
        if not lookup or not otp_code or not new_password:
            return Response({'error': 'Valid Mobile/Aadhaar, otp_code, and new_password are required'}, status=status.HTTP_400_BAD_REQUEST)

        phone_number = None
        if 'aadhaar_number' in lookup:
            user = User.objects.filter(aadhaar_number=lookup['aadhaar_number']).first()
            if not user: return Response({'error': 'Aadhaar not found'}, status=404)
            phone_number = user.phone_number
        else:
            phone_number = lookup['phone_number']

        try:
            otp_record = OTPVerification.objects.filter(phone_number=phone_number).latest('created_at')
            otp_record.attempts += 1
            otp_record.save()

            if not otp_record.is_valid():
                return Response({'error': 'Invalid, expired, or maximum attempts reached for OTP'}, status=status.HTTP_400_BAD_REQUEST)

            if otp_record.otp_code != otp_code:
                return Response({'error': 'Incorrect OTP'}, status=status.HTTP_400_BAD_REQUEST)
            
            otp_record.is_used = True
            otp_record.save()

            user = User.objects.filter(phone_number=phone_number).first()
            if not user:
                return Response({'error': 'Account not found.'}, status=status.HTTP_404_NOT_FOUND)
            
            user.set_password(new_password)
            user.save()
            return Response({'message': 'Password reset successful.'})

        except OTPVerification.DoesNotExist:
            return Response({'error': 'No OTP requested for this number'}, status=status.HTTP_400_BAD_REQUEST)

class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AuditLogSerializer
    queryset = AuditLog.objects.all().order_by('-timestamp')
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    search_fields = ['action', 'resource', 'actor__phone_number']

class AdminDashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    def get(self, request):
        from patients.models import Patient
        from doctors.models import Doctor
        from clinical.models import MedicalRecord
        
        total_patients = Patient.objects.filter(is_deleted=False).count()
        total_providers = Doctor.objects.filter(is_deleted=False).count()
        total_records = MedicalRecord.objects.filter(is_deleted=False).count()
        total_audits = AuditLog.objects.count()
        return Response({
            'total_patients': total_patients,
            'total_providers': total_providers,
            'total_records': total_records,
            'total_audits': total_audits
        })
