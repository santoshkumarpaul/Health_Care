from rest_framework import serializers
from .models import MedicalRecord, Consent

class MedicalRecordSerializer(serializers.ModelSerializer):
    doctor_name = serializers.CharField(source='doctor.name', read_only=True, default=None)
    provider_display = serializers.CharField(read_only=True)
    uploader_type = serializers.CharField(read_only=True)
    
    class Meta:
        model = MedicalRecord
        fields = '__all__'
        read_only_fields = ['doctor', 'patient', 'is_deleted', 'uploaded_by', 'uploader_type']

class ConsentSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='patient.name', read_only=True)
    doctor_name = serializers.CharField(source='doctor.name', read_only=True)
    doctor_facility = serializers.CharField(source='doctor.facility', read_only=True)
    doctor_role = serializers.CharField(source='doctor.user.role', read_only=True)

    class Meta:
        model = Consent
        fields = '__all__'
        extra_kwargs = {
            'patient': {'required': False},
            'doctor': {'required': False}
        }
        read_only_fields = ['is_deleted']
