import os
import django
from django.utils import timezone
from datetime import timedelta

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'health_core.settings')
django.setup()

from core.models import User, AuditLog
from patients.models import Patient, VitalReading
from doctors.models import Doctor
from clinical.models import MedicalRecord, Consent

def seed():
    print("Clearing DB...")
    User.objects.all().delete()
    Patient.objects.all().delete()
    Doctor.objects.all().delete()
    MedicalRecord.objects.all().delete()
    Consent.objects.all().delete()
    AuditLog.objects.all().delete()

    print("Creating Users & Profiles...")
    # Admin
    admin_user = User.objects.create_superuser(phone_number="admin", aadhaar_number="000000000000", role="admin", password="password123")
    
    # Patients
    p1_user = User.objects.create(phone_number="+919876543210", aadhaar_number="123456780001", role="patient")
    p1_user.set_password("password123"); p1_user.save()
    p1 = Patient.objects.create(user=p1_user, name="Priya Sharma", age=34, gender="Female", blood_group="B+", bmi=27.4, glucose=112, blood_pressure="128/82", weight=72)
    
    p2_user = User.objects.create(phone_number="+919876543211", aadhaar_number="234567890002", role="patient")
    p2_user.set_password("password123"); p2_user.save()
    p2 = Patient.objects.create(user=p2_user, name="Ravi Kumar", age=45, gender="Male", blood_group="O+", bmi=24.1, glucose=95, blood_pressure="120/80", weight=68)
    
    p3_user = User.objects.create(phone_number="+916203486580", aadhaar_number="620348658001", role="patient")
    p3_user.set_password("password123"); p3_user.save()
    p3 = Patient.objects.create(user=p3_user, name="Test User", age=28, gender="Male", blood_group="A+", bmi=22.5, glucose=105, blood_pressure="118/76", weight=70, height=176)
    
    # Doctors
    d1_user = User.objects.create(phone_number="+919999911111", aadhaar_number="999991111100", role="doctor")
    d1_user.set_password("password123"); d1_user.save()
    d1 = Doctor.objects.create(user=d1_user, name="Dr. Anjali Nair", specialty="Internal Medicine", facility="City Hospital", hfr_id="HFR-MH-00123", status="verified")
    
    d2_user = User.objects.create(phone_number="+919999922222", aadhaar_number="999992222200", role="lab")
    d2_user.set_password("password123"); d2_user.save()
    d2 = Doctor.objects.create(user=d2_user, name="LifeLabs Diagnostics", specialty="Pathology Lab", facility="Diagnostic Centre", hfr_id="HFR-MH-00456", status="verified")
    
    d3_user = User.objects.create(phone_number="+919999933333", aadhaar_number="999993333300", role="doctor")
    d3_user.set_password("password123"); d3_user.save()
    d3 = Doctor.objects.create(user=d3_user, name="Dr. Pradeep Rao", specialty="Cardiology", facility="Heart Care", hfr_id="HFR-MH-00789", status="pending")

    d4_user = User.objects.create(phone_number="+919999944444", aadhaar_number="999994444400", role="pharma")
    d4_user.set_password("password123"); d4_user.save()
    d4 = Doctor.objects.create(user=d4_user, name="MedPlus Pharmacy", facility="MedPlus Store, Pune", hfr_id="HFR-MH-01001", status="verified")

    d5_user = User.objects.create(phone_number="+919999955555", aadhaar_number="999995555500", role="clinic")
    d5_user.set_password("password123"); d5_user.save()
    d5 = Doctor.objects.create(user=d5_user, name="Apollo Clinic", facility="Apollo Clinic, Mumbai", hfr_id="HFR-MH-01002", status="verified")


    print("Creating Records...")
    MedicalRecord.objects.create(patient=p1, doctor=d1, date="2025-03-12", record_type="Discharge Summary", title="General Checkup", provider="City Hospital", tx_hash="0xA3f9A123")
    MedicalRecord.objects.create(patient=p1, doctor=d2, date="2025-01-28", record_type="Lab Report", title="CBC + Lipid Profile", provider="LifeLabs Diagnostics", tx_hash="0xB7d2B456")
    MedicalRecord.objects.create(patient=p1, doctor=d1, date="2025-01-14", record_type="Prescription", title="Metformin 500mg", provider="City Hospital", tx_hash="0xC1a0C789")

    # Records for Test User (p3)
    MedicalRecord.objects.create(patient=p3, doctor=d1, date="2025-04-10", record_type="Consultation", title="Routine Checkup", provider="City Hospital", tx_hash="0xE1a2D001")
    MedicalRecord.objects.create(patient=p3, doctor=d2, date="2025-03-22", record_type="Lab Report", title="Complete Blood Count", provider="LifeLabs Diagnostics", tx_hash="0xF2b3E002")
    MedicalRecord.objects.create(patient=p3, doctor=d4, date="2025-02-15", record_type="Prescription", title="Amoxicillin 500mg", provider="MedPlus Pharmacy", tx_hash="0xG3c4F003")
    MedicalRecord.objects.create(patient=p3, doctor=d5, date="2025-01-08", record_type="Follow-up", title="Post-Surgery Follow-up", provider="Apollo Clinic", tx_hash="0xH4d5G004")

    print("Creating Consents...")
    expires = timezone.now() + timedelta(days=365)
    Consent.objects.create(patient=p1, doctor=d1, scope="Full Records", expires_at=expires, status="active")
    Consent.objects.create(patient=p1, doctor=d2, scope="Lab Results", expires_at=expires, status="active")
    Consent.objects.create(patient=p1, doctor=d3, scope="Cardiology", status="pending")

    # Consents for Test User (p3)
    Consent.objects.create(patient=p3, doctor=d1, scope="Full Records", expires_at=expires, status="active")
    Consent.objects.create(patient=p3, doctor=d2, scope="Lab Results", expires_at=expires, status="active")
    Consent.objects.create(patient=p3, doctor=d4, scope="Prescriptions", expires_at=expires, status="active")
    Consent.objects.create(patient=p3, doctor=d5, scope="Clinical Notes", status="pending")
    Consent.objects.create(patient=p3, doctor=d3, scope="Cardiology", status="revoked")

    print("Creating Audit Logs...")
    AuditLog.objects.create(actor=d1_user, action="Record Accessed", resource=f"Patient {p1.id} Records")
    AuditLog.objects.create(actor=p1_user, action="Consent Granted", resource=f"Doctor {d1.id}")
    AuditLog.objects.create(actor=d1_user, action="Record Accessed", resource=f"Patient {p3.id} Records")
    AuditLog.objects.create(actor=p3_user, action="Consent Granted", resource=f"Doctor {d1.id}")

    print("Seeding complete!")

if __name__ == '__main__':
    seed()
