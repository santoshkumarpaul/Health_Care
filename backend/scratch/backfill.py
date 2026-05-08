import os, sys, django
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'health_core.settings')
django.setup()

from clinical.models import MedicalRecord

records = MedicalRecord.objects.select_related('doctor', 'doctor__user', 'patient', 'patient__user').all()
updated = 0

for rec in records:
    changed = False
    
    if rec.doctor and rec.doctor.user:
        role = rec.doctor.user.role
        if not rec.uploaded_by or rec.uploaded_by != rec.doctor.user:
            rec.uploaded_by = rec.doctor.user
            changed = True
        if rec.uploader_type != role:
            rec.uploader_type = role
            changed = True
        if not rec.provider:
            if role == 'doctor':
                name = rec.doctor.name
                if not name.startswith('Dr.'):
                    name = 'Dr. ' + name
                provider_str = name
                if rec.doctor.facility:
                    provider_str += ' - ' + rec.doctor.facility
            else:
                provider_str = rec.doctor.facility if rec.doctor.facility else rec.doctor.name
            rec.provider = provider_str
            changed = True
    else:
        if rec.patient and rec.patient.user:
            if not rec.uploaded_by or rec.uploaded_by != rec.patient.user:
                rec.uploaded_by = rec.patient.user
                changed = True
        if rec.uploader_type != 'patient':
            rec.uploader_type = 'patient'
            changed = True

    if changed:
        rec.save()
        updated += 1

total = records.count()
print('Backfill complete: ' + str(updated) + ' record(s) updated out of ' + str(total) + ' total.')

for rec in MedicalRecord.objects.select_related('doctor', 'doctor__user', 'patient', 'patient__user').all():
    print('  ID:' + str(rec.id) + ' | Title: ' + str(rec.title) + ' | Type: ' + str(rec.uploader_type) + ' | Display: ' + str(rec.provider_display))
