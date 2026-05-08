from rest_framework import serializers
from .models import Patient, VitalReading, Allergy, Reminder

class PatientSerializer(serializers.ModelSerializer):
    phone_number = serializers.CharField(source='user.phone_number', read_only=True)
    aadhaar_number = serializers.SerializerMethodField()
    
    class Meta:
        model = Patient
        fields = '__all__'
        read_only_fields = ['user', 'is_deleted']
        
    def get_aadhaar_number(self, obj):
        aadhaar = obj.user.aadhaar_number
        if aadhaar and len(aadhaar) == 12:
            return f"XXXX-XXXX-{aadhaar[-4:]}"
        return aadhaar

class VitalReadingSerializer(serializers.ModelSerializer):
    class Meta:
        model = VitalReading
        fields = '__all__'
        read_only_fields = ['patient', 'is_deleted']

class AllergySerializer(serializers.ModelSerializer):
    class Meta:
        model = Allergy
        fields = '__all__'
        read_only_fields = ['patient', 'is_deleted']

class ReminderSerializer(serializers.ModelSerializer):
    class Meta:
        model = Reminder
        fields = '__all__'
        read_only_fields = ['patient', 'is_deleted']
