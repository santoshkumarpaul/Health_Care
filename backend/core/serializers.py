from rest_framework import serializers
from .models import User, OTPVerification, AuditLog

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'phone_number', 'role']

class OTPVerificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = OTPVerification
        fields = ['phone_number']

class AuditLogSerializer(serializers.ModelSerializer):
    actor_phone = serializers.CharField(source='actor.phone_number', read_only=True)
    actor_name = serializers.SerializerMethodField()

    class Meta:
        model = AuditLog
        fields = '__all__'

    def get_actor_name(self, obj):
        if not obj.actor:
            return "System"
        if obj.actor.role == 'patient' and hasattr(obj.actor, 'patient_profile'):
            return obj.actor.patient_profile.name
        if obj.actor.role in ['doctor', 'lab', 'pharma', 'clinic'] and hasattr(obj.actor, 'doctor_profile'):
            return obj.actor.doctor_profile.name
        return obj.actor.phone_number
