from django.db import models
from core.models import User

class SoftDeleteModel(models.Model):
    is_deleted = models.BooleanField(default=False)

    class Meta:
        abstract = True

class Patient(SoftDeleteModel):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='patient_profile')
    first_name = models.CharField(max_length=100, blank=True, null=True)
    last_name = models.CharField(max_length=100, blank=True, null=True)
    name = models.CharField(max_length=255) # Full name
    dob = models.DateField(blank=True, null=True)
    gender = models.CharField(max_length=10, blank=True, null=True)
    blood_group = models.CharField(max_length=5, blank=True, null=True)
    
    state = models.CharField(max_length=100, blank=True, null=True)
    city = models.CharField(max_length=100, blank=True, null=True)
    
    age = models.IntegerField(blank=True, null=True)
    
    bmi = models.FloatField(blank=True, null=True)
    glucose = models.FloatField(blank=True, null=True)
    blood_pressure = models.CharField(max_length=20, blank=True, null=True)
    weight = models.FloatField(blank=True, null=True)
    heart_rate = models.IntegerField(null=True, blank=True)
    spo2 = models.IntegerField(null=True, blank=True)
    height = models.FloatField(null=True, blank=True)
    
    # History
    diagnoses = models.TextField(blank=True, null=True)
    
    # Emergency Contact
    emergency_name = models.CharField(max_length=255, blank=True, null=True)
    emergency_relation = models.CharField(max_length=50, blank=True, null=True)
    emergency_phone = models.CharField(max_length=20, blank=True, null=True)
    
    status = models.CharField(max_length=20, default='active')

    def save(self, *args, **kwargs):
        from django.utils import timezone
        import random
        # Auto-generate full name
        if self.first_name:
            self.name = f"{self.first_name} {self.last_name or ''}".strip()
            
        # Calculate age from DOB if age is missing
        if self.dob and not self.age:
            today = timezone.now().date()
            self.age = today.year - self.dob.year - ((today.month, today.day) < (self.dob.month, self.dob.day))
            
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name

class VitalReading(SoftDeleteModel):
    import datetime
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='vitals')
    date = models.DateField(default=datetime.date.today)
    glucose = models.IntegerField(null=True, blank=True)
    systolic = models.IntegerField(null=True, blank=True)
    diastolic = models.IntegerField(null=True, blank=True)
    weight = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    heart_rate = models.IntegerField(null=True, blank=True)
    bmi = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)
    spo2 = models.IntegerField(null=True, blank=True)
    height = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)

    def __str__(self):
        return f"Vitals for {self.patient.name} on {self.date}"

from django.db.models.signals import post_save
from django.dispatch import receiver

@receiver(post_save, sender=VitalReading)
def update_patient_vitals(sender, instance, created, **kwargs):
    if not instance.is_deleted:
        patient = instance.patient
        if instance.glucose: patient.glucose = instance.glucose
        if instance.weight: patient.weight = instance.weight
        if instance.bmi: patient.bmi = instance.bmi
        if instance.heart_rate: patient.heart_rate = instance.heart_rate
        if instance.spo2: patient.spo2 = instance.spo2
        if instance.height: patient.height = instance.height
        if instance.systolic and instance.diastolic:
            patient.blood_pressure = f"{instance.systolic}/{instance.diastolic}"
        elif instance.systolic:
            patient.blood_pressure = str(instance.systolic)
        patient.save()

class Allergy(SoftDeleteModel):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='patient_allergies')
    substance = models.CharField(max_length=255)
    severity = models.CharField(max_length=50, default='Medium') # Low, Medium, High
    reaction = models.CharField(max_length=255, blank=True, null=True)

    def __str__(self):
        return f"{self.substance} Allergy - {self.patient.name}"

class Reminder(SoftDeleteModel):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='reminders')
    text = models.CharField(max_length=255)
    time = models.DateTimeField()
    reminder_type = models.CharField(max_length=50, default='Medication') # Medication, Appointment, Lab Test, Other

    def __str__(self):
        return f"{self.reminder_type}: {self.text} for {self.patient.name}"
