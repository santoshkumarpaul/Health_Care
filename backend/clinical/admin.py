from django.contrib import admin
from .models import MedicalRecord, Consent

@admin.register(MedicalRecord)
class MedicalRecordAdmin(admin.ModelAdmin):
    list_display = ('title', 'patient', 'doctor', 'record_type', 'date', 'is_deleted')
    list_filter = ('record_type', 'is_deleted', 'date')
    search_fields = ('title', 'patient__name', 'doctor__name', 'tx_hash')

@admin.register(Consent)
class ConsentAdmin(admin.ModelAdmin):
    list_display = ('patient', 'doctor', 'status', 'scope', 'expires_at', 'is_deleted')
    list_filter = ('status', 'is_deleted', 'scope')
    search_fields = ('patient__name', 'doctor__name')
