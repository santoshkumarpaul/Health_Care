from rest_framework import serializers
from .models import Doctor

class DoctorSerializer(serializers.ModelSerializer):
    phone_number = serializers.CharField(source='user.phone_number', read_only=True)

    class Meta:
        model = Doctor
        fields = '__all__'
        read_only_fields = ['user', 'is_deleted']
