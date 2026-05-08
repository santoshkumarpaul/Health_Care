from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django_filters.rest_framework import DjangoFilterBackend

from .models import Doctor
from .serializers import DoctorSerializer
from patients.views import SoftDeleteModelViewSet
from core.models import User
from patients.models import Patient
from core.views import log_audit

class DoctorViewSet(SoftDeleteModelViewSet):
    serializer_class = DoctorSerializer
    queryset = Doctor.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    search_fields = ['name', 'specialty', 'facility']

    @action(detail=False, methods=['get', 'put', 'patch'], permission_classes=[permissions.IsAuthenticated])
    def me(self, request):
        doctor = get_object_or_404(Doctor, user=request.user)
        if request.method == 'GET':
            serializer = self.get_serializer(doctor)
            return Response(serializer.data)
        
        serializer = self.get_serializer(doctor, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def verify(self, request, pk=None):
        doctor = self.get_object()
        doctor.status = 'verified'
        doctor.save()
        log_audit(request.user, "Provider Verified", f"Doctor: {doctor.name} (ID {doctor.id})")
        return Response({'status': 'verified'})

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def patients(self, request):
        doctor = Doctor.objects.filter(user=request.user).first()
        if not doctor:
            return Response({'error': 'Doctor profile not found'}, status=404)
        
        from clinical.models import Consent
        # Get patient IDs from active consents
        patient_ids = Consent.objects.filter(
            doctor=doctor, 
            status='active', 
            is_deleted=False
        ).values_list('patient_id', flat=True)
        
        patients = Patient.objects.filter(id__in=patient_ids, is_deleted=False)
        from patients.serializers import PatientSerializer
        serializer = PatientSerializer(patients, many=True)
        return Response(serializer.data)

class DoctorDashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    def get(self, request):
        if request.user.role not in ['doctor', 'lab', 'pharma', 'clinic']:
            return Response({'error': 'Forbidden'}, status=403)
        
        doctor = get_object_or_404(Doctor, user=request.user, is_deleted=False)
        from clinical.models import Consent, MedicalRecord
        assigned_patients = Consent.objects.filter(doctor=doctor, status='active', is_deleted=False).values('patient').distinct().count()
        records_created = MedicalRecord.objects.filter(doctor=doctor, is_deleted=False).count()
        
        return Response({
            'assigned_patients_count': assigned_patients,
            'records_authored_count': records_created
        })

class RegisterPatientView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        try:
            role = request.user.role
            if role not in ['doctor', 'lab', 'pharma', 'clinic', 'admin']:
                return Response({'error': f'Role {role} is not authorized to register patients.'}, status=403)
                
            identifier = request.data.get('identifier') or request.data.get('phone_number')
            phone_number = "".join([c for c in str(identifier) if c.isdigit()]) if identifier else ""
            aadhaar_number = request.data.get('aadhaar_number', '')
            name = request.data.get('name')
            
            if not phone_number or not name or not aadhaar_number:
                return Response({'error': 'Mobile number (identifier), aadhaar_number and name are required'}, status=400)
            
            if len(phone_number) != 10 or not phone_number.isdigit():
                return Response({'error': 'Mobile number must be exactly 10 digits'}, status=400)
                
            if len(aadhaar_number) != 12 or not aadhaar_number.isdigit():
                return Response({'error': 'Aadhaar must be exactly 12 digits'}, status=400)
                
            doctor = None
            if role in ['doctor', 'lab', 'pharma', 'clinic']:
                doctor = Doctor.objects.filter(user=request.user).first()
            
            user = User.objects.filter(phone_number=phone_number).first()
            if not user and not phone_number.startswith('+'):
                user = User.objects.filter(phone_number=f"+91{phone_number}").first()
            if not user:
                user = User.objects.filter(aadhaar_number=aadhaar_number).first()
                
            if user:
                if user.role != 'patient':
                    return Response({'error': 'Identity registered with a non-patient account.'}, status=400)
                patient = Patient.objects.filter(user=user).first()
                if not patient:
                    patient = Patient.objects.create(user=user, name=name)
                elif name and patient.name != name:
                    patient.name = name
                    patient.save()
            else:
                # Use create_user for consistency, set a dummy password
                user = User.objects.create_user(
                    phone_number=phone_number, 
                    aadhaar_number=aadhaar_number, 
                    role='patient',
                    password=User.objects.make_random_password()
                )
                patient = Patient.objects.create(user=user, name=name)
            
            if doctor:
                from clinical.models import Consent
                from django.utils import timezone
                
                # Use filter().first() instead of get_or_create to avoid MultipleObjectsReturned
                consent = Consent.objects.filter(patient=patient, doctor=doctor, is_deleted=False).first()
                
                if consent:
                    if consent.status != 'active' and consent.status != 'pending':
                        consent.status = 'pending'
                        consent.expires_at = None
                        consent.save()
                else:
                    Consent.objects.create(
                        patient=patient, 
                        doctor=doctor, 
                        status='pending',
                        expires_at=None,
                        scope='Full Records'
                    )
            
            log_audit(request.user, "Patient Registered", f"Patient: {name} ({phone_number})")
            
            return Response({
                'status': 'success', 
                'patient_id': patient.id, 
                'aadhaar_number': patient.user.aadhaar_number
            })
        except Exception as e:
            import traceback
            return Response({'error': 'Internal Server Error', 'details': str(e), 'traceback': traceback.format_exc()}, status=500)
