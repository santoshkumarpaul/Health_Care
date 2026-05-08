from django.db import models
from django.core.validators import RegexValidator
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.utils import timezone

class UserManager(BaseUserManager):
    def create_user(self, phone_number, aadhaar_number=None, password=None, **extra_fields):
        if not phone_number:
            raise ValueError('UserManager says phone_number is required')
            
        user = self.model(phone_number=phone_number, aadhaar_number=aadhaar_number, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, phone_number, password=None, **extra_fields):
        # We can generate a dummy aadhaar for superuser creation from command line if not provided
        aadhaar_number = extra_fields.pop('aadhaar_number', '000000000000')
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(phone_number, aadhaar_number, password, **extra_fields)

class User(AbstractUser):
    ROLE_CHOICES = (
        ('patient', 'Patient'),
        ('doctor', 'Doctor'),
        ('lab', 'Lab'),
        ('pharma', 'Pharmacy'),
        ('clinic', 'Clinic'),
        ('admin', 'Admin'),
    )
    # Use phone_number as the main identifier for auth but aadhaar_number is also required
    phone_number = models.CharField(
        max_length=10, 
        unique=True,
        validators=[RegexValidator(r'^\d{10}$', message='Mobile number must be exactly 10 digits')]
    )
    aadhaar_number = models.CharField(max_length=12, unique=True, null=True, blank=True) # allow null temporarily for migrations, but will be enforced
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='patient')
    
    # Override username to allow nulls
    username = models.CharField(max_length=150, unique=True, null=True, blank=True)

    objects = UserManager()

    USERNAME_FIELD = 'phone_number'
    REQUIRED_FIELDS = ['role']

    def __str__(self):
        return f"{self.phone_number} ({self.role})"

class OTPVerification(models.Model):
    phone_number = models.CharField(max_length=20)
    otp_code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    is_used = models.BooleanField(default=False)
    attempts = models.IntegerField(default=0)

    def is_valid(self):
        # Expires in 5 minutes and max 3 attempts
        return not self.is_used and self.attempts < 3 and (timezone.now() - self.created_at).total_seconds() < 300

class AuditLog(models.Model):
    timestamp = models.DateTimeField(auto_now_add=True)
    actor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    action = models.CharField(max_length=255)
    resource = models.CharField(max_length=255)
    tx_hash = models.CharField(max_length=255, blank=True, null=True)

    def __str__(self):
        return f"{self.actor} - {self.action} at {self.timestamp}"
