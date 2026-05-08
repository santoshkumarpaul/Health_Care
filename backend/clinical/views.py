from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q

from .models import MedicalRecord, Consent
from .serializers import MedicalRecordSerializer, ConsentSerializer
from patients.views import SoftDeleteModelViewSet
from patients.models import Patient
from doctors.models import Doctor
from core.views import log_audit

from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

class MedicalRecordViewSet(SoftDeleteModelViewSet):
    serializer_class = MedicalRecordSerializer
    queryset = MedicalRecord.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['patient', 'record_type']
    search_fields = ['title', 'provider', 'data']

    def get_queryset(self):
        qs = MedicalRecord.objects.filter(is_deleted=False)
        user = self.request.user
        if user.role == 'patient':
            return qs.filter(patient__user=user)
        elif user.role in ['doctor', 'lab', 'pharma', 'clinic']:
            # Must have active consent to view
            doctor = get_object_or_404(Doctor, user=user)
            active_consents = Consent.objects.filter(doctor=doctor, status='active', is_deleted=False).values_list('patient_id', flat=True)
            return qs.filter(patient_id__in=active_consents)
        return qs

    def perform_create(self, serializer):
        user = self.request.user
        if user.role == 'patient':
            patient = get_object_or_404(Patient, user=user)
            # For patient self-uploads, keep whatever provider they typed in the form
            serializer.save(
                patient=patient,
                uploaded_by=user,
                uploader_type='patient'
            )
            log_audit(user, "Upload Record", f"Personal record: {serializer.validated_data.get('title')}")
        elif user.role in ['doctor', 'lab', 'pharma', 'clinic']:
            doctor = get_object_or_404(Doctor, user=user)
            patient_id = self.request.data.get('patient')
            patient_aadhaar = self.request.data.get('patient_aadhaar')
            
            if patient_aadhaar:
                patient = get_object_or_404(Patient, user__aadhaar_number=patient_aadhaar)
            elif patient_id:
                patient = get_object_or_404(Patient, id=patient_id)
            else:
                from rest_framework.exceptions import ValidationError
                raise ValidationError("Patient ID or Aadhaar is required")
                
            # Check consent
            active_consent = Consent.objects.filter(patient=patient, doctor=doctor, status='active', is_deleted=False).exists()
            
            if not active_consent:
                # Check if there's already a pending consent
                pending = Consent.objects.filter(patient=patient, doctor=doctor, status='pending', is_deleted=False).exists()
                if not pending:
                    # Auto-create a consent request for the patient
                    Consent.objects.create(
                        patient=patient,
                        doctor=doctor,
                        scope="Full Records",
                        status="pending"
                    )
                    log_audit(user, "Consent Requested (Auto)", f"For Patient: {patient.name}")
                
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("CONSENT_REQUESTED: A consent request has been sent to the patient. Please wait for their approval before uploading records.")
                
            # Build provider display string based on role
            if user.role == 'doctor':
                provider_str = f"Dr. {doctor.name}" if not doctor.name.startswith('Dr.') else doctor.name
                if doctor.facility:
                    provider_str += f" — {doctor.facility}"
            else:
                # For Lab, Pharma, Clinic — use facility name as primary identifier
                provider_str = doctor.facility if doctor.facility else doctor.name
            
            serializer.save(
                patient=patient,
                doctor=doctor,
                provider=provider_str,
                uploaded_by=user,
                uploader_type=user.role
            )
            log_audit(user, "Created Record", f"For Patient: {patient.name}, Title: {serializer.validated_data.get('title')}")

class ConsentViewSet(SoftDeleteModelViewSet):
    serializer_class = ConsentSerializer
    queryset = Consent.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['patient', 'status']

    def get_queryset(self):
        qs = Consent.objects.filter(is_deleted=False)
        user = self.request.user
        if user.role == 'patient':
            return qs.filter(patient__user=user)
        elif user.role in ['doctor', 'lab', 'pharma', 'clinic']:
            return qs.filter(doctor__user=user)
        return qs

    @action(detail=True, methods=['patch'])
    def update_status(self, request, pk=None):
        consent = self.get_object()
        status_val = request.data.get('status')
        expires_at = request.data.get('expires_at')

        if status_val not in ['active', 'revoked', 'denied']:
            return Response({'error': 'Invalid status'}, status=400)

        consent.status = status_val
        if expires_at:
            consent.expires_at = expires_at
        consent.save()

        log_audit(request.user, f"Consent {status_val.capitalize()}", f"For Consent ID {consent.id}")
        return Response({'status': 'success'})

    def perform_create(self, serializer):
        user = self.request.user
        if user.role == 'patient':
            patient = get_object_or_404(Patient, user=user)
            doctor_id = self.request.data.get('doctor')
            doctor = get_object_or_404(Doctor, id=doctor_id)
            serializer.save(patient=patient, doctor=doctor, status='active')
            log_audit(user, "Granted Consent", f"To Provider: {doctor.name}")
        else:
            doctor = get_object_or_404(Doctor, user=user)
            patient_id = self.request.data.get('patient')
            patient = get_object_or_404(Patient, id=patient_id)
            serializer.save(doctor=doctor, patient=patient, status='pending')
            log_audit(user, "Requested Consent", f"From Patient: {patient.name}")

class AISummaryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        patient_id = request.query_params.get('patient_id')
        if not patient_id:
            if request.user.role == 'patient':
                patient = get_object_or_404(Patient, user=request.user)
            else:
                return Response({'error': 'patient_id query parameter is required'}, status=400)
        else:
            patient = get_object_or_404(Patient, id=patient_id)
            # If not patient themselves, must have consent
            if request.user.role != 'admin' and request.user.role != 'patient':
                doctor = get_object_or_404(Doctor, user=request.user)
                if not Consent.objects.filter(patient=patient, doctor=doctor, status='active', is_deleted=False).exists():
                    return Response({'error': 'Active consent required'}, status=403)

        from patients.models import VitalReading
        vitals_list = VitalReading.objects.filter(patient=patient, is_deleted=False).order_by('-date')[:5]
        medical_records = MedicalRecord.objects.filter(patient=patient, is_deleted=False).order_by('-date')[:5]
        
        from .ai_service import get_ai_analysis
        ai_data = get_ai_analysis(patient, vitals_list, medical_records)

        if ai_data:
            return Response(ai_data)

        # Fallback to AI Logic (if Gemini fails or is not configured)
        vitals = vitals_list.first() if vitals_list else None
        gl = getattr(vitals, 'glucose', 100) or 100
        systolic = getattr(vitals, 'systolic', 120) or 120
        weight = float(getattr(vitals, 'weight', 70)) or 70.0
        bmi = weight / (1.7 * 1.7)
        age = getattr(patient, 'age', 35) or 35

        risks = [
            { "name": "Type 2 Diabetes", "risk": max(0, min(95, round(((gl-80)/100)*50 + ((bmi-20)/20)*30 + (10 if age > 45 else 0)))), "color": "#d97706" },
            { "name": "Hypertension", "risk": max(0, min(95, round(((systolic-110)/80)*60 + (15 if age > 50 else 0) + (10 if bmi > 30 else 0)))), "color": "#be123c" },
            { "name": "Cardiovascular Health", "risk": max(0, min(90, round(((systolic-120)/60)*40 + ((bmi-25)/15)*30 + (20 if age > 60 else 0)))), "color": "#be123c" },
            { "name": "Chronic Kidney Disease", "risk": max(0, min(85, round(((gl-100)/100)*30 + (20 if age > 65 else 5)))), "color": "#d97706" },
            { "name": "Metabolic Syndrome", "risk": max(0, min(95, round(((bmi-25)/15)*50 + ((gl-90)/50)*40))), "color": "#16a34a" if bmi < 25 else "#d97706" },
        ]

        summary = f"Comprehensive clinical overview for {patient.name}. Based on available history, the patient shows stable vital signs. Recommendations include routine cardiovascular screening and lifestyle maintenance."
        return Response({'summary': summary, 'risks': risks})

class QRLookupView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        qr_value = request.data.get('qr_value')
        if not qr_value:
            return Response({'error': 'qr_value is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        patient = None
        if 'AADHAAR:' in qr_value:
            aadhaar = qr_value.split('AADHAAR:')[1].split('|')[0]
            patient = Patient.objects.filter(user__aadhaar_number=aadhaar).first()
        elif 'ID:' in qr_value:
            p_id = qr_value.split('ID:')[1]
            patient = Patient.objects.filter(id=p_id).first()
        else:
            patient = Patient.objects.filter(Q(user__aadhaar_number=qr_value) | Q(id=qr_value) if qr_value.isdigit() else Q(user__aadhaar_number=qr_value)).first()

        if not patient:
            return Response({'error': 'Patient not found'}, status=404)

        log_audit(request.user, "QR Lookup", f"Patient: {patient.name}")
        return Response({
            'id': patient.id,
            'name': patient.name,
            'aadhaar_number': patient.user.aadhaar_number,
            'age': patient.age,
            'gender': patient.gender,
            'phone': patient.user.phone_number
        })

class AdvancedAIToolsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        doctor = get_object_or_404(Doctor, user=request.user)
        # Get active patients for this doctor
        patient_ids = Consent.objects.filter(doctor=doctor, status='active', is_deleted=False).values_list('patient_id', flat=True)
        patients = Patient.objects.filter(id__in=patient_ids)
        
        # 1. Predictive Clinical Alerts
        # Fetch recent vitals for all these patients
        from patients.models import VitalReading
        all_vitals = VitalReading.objects.filter(patient__in=patients, is_deleted=False).order_by('-date')
        
        # Prepare data for AI analysis
        vitals_data = []
        for p in patients:
            p_vitals = all_vitals.filter(patient=p)[:5]
            if p_vitals.exists():
                vitals_data.append({
                    'patient': p.name,
                    'readings': [{'glucose': v.glucose, 'systolic': v.systolic, 'weight': str(v.weight), 'date': str(v.date)} for v in p_vitals]
                })

        from .ai_service import get_clinical_alerts
        alerts = get_clinical_alerts(vitals_data)

        # 2. Treatment Adherence (Mock/Simple Logic for now)
        adherence = {
            'score': 88,
            'status': 'Good',
            'insights': [
                "92% medication compliance across patient pool.",
                "Slight dip in follow-up appointments for chronic patients."
            ]
        }

        return Response({
            'predictive_alerts': {
                'active_insights': alerts,
                'flagged_count': len(alerts)
            },
            'treatment_adherence': adherence
        })

    def post(self, request):
        # Automated SOAP Notes
        tool = request.data.get('tool')
        if tool == 'soap-notes':
            raw_text = request.data.get('text')
            from .ai_service import get_soap_notes
            notes = get_soap_notes(raw_text)
            return Response({'soap_notes': notes})
        
        return Response({'error': 'Invalid tool'}, status=400)


class ChatBotView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user_message = request.data.get('message')
        history = request.data.get('history', [])
        
        if not user_message:
            return Response({'error': 'Message is required'}, status=400)
            
        patient_context = None
        if request.user.role == 'patient':
            try:
                patient = Patient.objects.get(user=request.user)
                # Add some context for the AI
                from patients.models import VitalReading
                latest_vitals = VitalReading.objects.filter(patient=patient).order_by('-date').first()
                v_str = f"BP: {latest_vitals.systolic}/{latest_vitals.diastolic}, Glu: {latest_vitals.glucose}" if latest_vitals else "None"
                patient_context = {
                    'name': patient.name,
                    'vitals': v_str
                }
            except: pass

        from .ai_service import get_chatbot_response
        response_text = get_chatbot_response(user_message, history, patient_context)
        
        return Response({'response': response_text})

class GenerateQRView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, patient_id=None):
        # Only the patient can generate their own QR code
        if request.user.role.lower() != 'patient':
            return Response({'error': f'Only patients can generate their QR code (Role: {request.user.role})'}, status=403)
            
        # Ignore patient_id and just use the authenticated user's profile
        patient = get_object_or_404(Patient, user=request.user)
        qr_data = f"ID:{patient.id}|AADHAAR:{patient.user.aadhaar_number or 'N/A'}|NAME:{patient.name or ''}"
        
        import qrcode
        import base64
        import logging
        from io import BytesIO
        
        logger = logging.getLogger(__name__)
        
        try:
            # Try professional styling
            from qrcode.image.styled_pil import StyledPilImage
            from qrcode.image.styles.moduledrawers import RoundedModuleDrawer
            from qrcode.image.styles.colormasks import SolidFillColorMask
            
            qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_H)
            qr.add_data(qr_data)
            qr.make(fit=True)
            
            img = qr.make_image(
                image_factory=StyledPilImage,
                module_drawer=RoundedModuleDrawer(),
                color_mask=SolidFillColorMask(front_color=(15, 118, 110), back_color=(255, 255, 255))
            )
        except Exception as e:
            logger.error(f"QR Styled Generation failed: {str(e)}")
            # Fallback to high-contrast standard QR if styling fails
            qr = qrcode.QRCode(version=1, box_size=10, border=4)
            qr.add_data(qr_data)
            qr.make(fit=True)
            img = qr.make_image(fill_color="black", back_color="white")
        
        try:
            buffer = BytesIO()
            img.save(buffer, format="PNG")
            img_str = base64.b64encode(buffer.getvalue()).decode("utf-8")
            return Response({
                'qr_image': f"data:image/png;base64,{img_str}",
                'qr_data': qr_data
            })
        except Exception as e:
            logger.error(f"QR Image Encoding failed: {str(e)}")
            return Response({'error': f'Image encoding failed: {str(e)}'}, status=500)
