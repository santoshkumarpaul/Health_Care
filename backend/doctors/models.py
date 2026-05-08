from django.db import models
from core.models import User
from patients.models import SoftDeleteModel

class Doctor(SoftDeleteModel):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='doctor_profile')
    name = models.CharField(max_length=255)
    specialty = models.CharField(max_length=100, blank=True, default='')
    facility = models.CharField(max_length=255, blank=True, default='')
    hfr_id = models.CharField(max_length=50, blank=True, null=True)
    reg_number = models.CharField(max_length=50, blank=True, null=True)
    experience = models.IntegerField(default=0)
    status = models.CharField(max_length=20, default='pending')

    def __str__(self):
        return self.name
