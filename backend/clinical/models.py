from django.db import models
from django.utils import timezone
from patients.models import Patient, SoftDeleteModel
from doctors.models import Doctor
from core.models import User

UPLOADER_TYPE_CHOICES = [
    ('patient', 'Patient'),
    ('doctor', 'Doctor'),
    ('lab', 'Lab'),
    ('pharma', 'Pharmacy'),
    ('clinic', 'Clinic'),
]

class MedicalRecord(SoftDeleteModel):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='records')
    doctor = models.ForeignKey(Doctor, on_delete=models.SET_NULL, null=True, blank=True, related_name='authored_records')
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='uploaded_records')
    uploader_type = models.CharField(max_length=20, choices=UPLOADER_TYPE_CHOICES, default='patient')
    date = models.DateField(default=timezone.now)
    record_type = models.CharField(max_length=50) # Visit, Lab, Prescription, Imaging
    title = models.CharField(max_length=255)
    provider = models.CharField(max_length=255, blank=True, null=True)
    data = models.TextField(blank=True, null=True)
    file = models.FileField(upload_to='records/', null=True, blank=True)
    tx_hash = models.CharField(max_length=255, blank=True, null=True)
    is_abnormal = models.BooleanField(default=False)
    is_urgent = models.BooleanField(default=False)

    class Meta:
        ordering = ['-date', '-id']

    def __str__(self):
        return f"{self.title} - {self.patient.name}"

    @property
    def provider_display(self):
        """Returns the best human-readable provider name for this record."""
        if self.provider:
            return self.provider
        if self.doctor:
            name = self.doctor.name
            if self.uploader_type == 'doctor' and not name.startswith('Dr.'):
                name = f"Dr. {name}"
            if self.doctor.facility:
                return f"{name} — {self.doctor.facility}"
            return name
        if self.uploaded_by and self.uploader_type != 'patient':
            return f"{self.uploader_type.capitalize()} Provider"
        return "Self Uploaded"


class Consent(SoftDeleteModel):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='consents')
    doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE, related_name='granted_consents')
    scope = models.CharField(max_length=100, default="Full Records")
    expires_at = models.DateTimeField(blank=True, null=True)
    status = models.CharField(max_length=20, default='pending') # pending, active, revoked

    def __str__(self):
        return f"Consent for {self.doctor.name} from {self.patient.name}"
