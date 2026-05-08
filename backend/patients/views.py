from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django_filters.rest_framework import DjangoFilterBackend

from .models import Patient, VitalReading, Allergy, Reminder
from .serializers import (PatientSerializer, VitalReadingSerializer, 
                          AllergySerializer, ReminderSerializer)
from core.permissions import IsPatient

class SoftDeleteModelViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        return super().get_queryset().filter(is_deleted=False)

    def perform_destroy(self, instance):
        instance.is_deleted = True
        instance.save()

class PatientViewSet(SoftDeleteModelViewSet):
    serializer_class = PatientSerializer
    queryset = Patient.objects.all()
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    search_fields = ['name', 'user__aadhaar_number', 'user__phone_number']

    @action(detail=False, methods=['get', 'put', 'patch'], permission_classes=[permissions.IsAuthenticated])
    def me(self, request):
        patient = get_object_or_404(Patient, user=request.user)
        if request.method == 'GET':
            serializer = self.get_serializer(patient)
            return Response(serializer.data)
        
        serializer = self.get_serializer(patient, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            permission_classes = [permissions.IsAuthenticated]
        else:
            permission_classes = [permissions.IsAuthenticated, IsPatient]
        return [permission() for permission in permission_classes]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class VitalReadingViewSet(SoftDeleteModelViewSet):
    serializer_class = VitalReadingSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['patient']

    def get_queryset(self):
        qs = VitalReading.objects.filter(is_deleted=False)
        user = self.request.user
        if user.role == 'patient':
            return qs.filter(patient__user=user)
        elif user.role == 'admin':
            return qs
        return qs.none()

    def perform_create(self, serializer):
        if self.request.user.role == 'patient':
            patient = get_object_or_404(Patient, user=self.request.user)
            serializer.save(patient=patient)
        else:
            patient_id = self.request.data.get('patient_id')
            if patient_id:
                patient = get_object_or_404(Patient, id=patient_id)
                serializer.save(patient=patient)
            else:
                from rest_framework.exceptions import ValidationError
                raise ValidationError("patient_id is required for non-patient users")

class AllergyViewSet(SoftDeleteModelViewSet):
    serializer_class = AllergySerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['patient']

    def get_queryset(self):
        qs = Allergy.objects.filter(is_deleted=False)
        user = self.request.user
        if user.role == 'patient':
            return qs.filter(patient__user=user)
        elif user.role == 'admin':
            return qs
        return qs.none()

    def perform_create(self, serializer):
        if self.request.user.role == 'patient':
            patient = get_object_or_404(Patient, user=self.request.user)
            serializer.save(patient=patient)
        else:
            patient_id = self.request.data.get('patient_id')
            if patient_id:
                patient = get_object_or_404(Patient, id=patient_id)
                serializer.save(patient=patient)
            else:
                from rest_framework.exceptions import ValidationError
                raise ValidationError("patient_id is required for non-patient users")

class ReminderViewSet(SoftDeleteModelViewSet):
    serializer_class = ReminderSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['patient', 'reminder_type']

    def get_queryset(self):
        qs = Reminder.objects.filter(is_deleted=False)
        user = self.request.user
        if user.role == 'patient':
            return qs.filter(patient__user=user)
        elif user.role == 'admin':
            return qs
        return qs.none()

    def perform_create(self, serializer):
        if self.request.user.role == 'patient':
            patient = get_object_or_404(Patient, user=self.request.user)
            serializer.save(patient=patient)
        else:
            patient_id = self.request.data.get('patient_id')
            if patient_id:
                patient = get_object_or_404(Patient, id=patient_id)
                serializer.save(patient=patient)
            else:
                from rest_framework.exceptions import ValidationError
                raise ValidationError("patient_id is required for non-patient users")
