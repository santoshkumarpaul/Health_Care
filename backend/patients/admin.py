from django.contrib import admin
from .models import Patient, VitalReading, Allergy, Reminder

@admin.register(Patient)
class PatientAdmin(admin.ModelAdmin):
    list_display = ('name', 'aadhaar_number', 'phone_number', 'status', 'is_deleted')
    list_filter = ('status', 'is_deleted', 'blood_group')
    search_fields = ('name', 'user__aadhaar_number', 'user__phone_number')
    
    def phone_number(self, obj):
        return obj.user.phone_number
        
    def aadhaar_number(self, obj):
        return obj.user.aadhaar_number

@admin.register(VitalReading)
class VitalReadingAdmin(admin.ModelAdmin):
    list_display = ('patient', 'date', 'blood_pressure', 'glucose', 'is_deleted')
    list_filter = ('is_deleted',)
    search_fields = ('patient__name', 'patient__user__aadhaar_number')
    
    def blood_pressure(self, obj):
        return f"{obj.systolic or '--'}/{obj.diastolic or '--'}"

@admin.register(Allergy)
class AllergyAdmin(admin.ModelAdmin):
    list_display = ('substance', 'patient', 'severity', 'is_deleted')
    list_filter = ('severity', 'is_deleted')
    search_fields = ('substance', 'patient__name')

@admin.register(Reminder)
class ReminderAdmin(admin.ModelAdmin):
    list_display = ('reminder_type', 'text', 'patient', 'time', 'is_deleted')
    list_filter = ('reminder_type', 'is_deleted')
    search_fields = ('text', 'patient__name')
