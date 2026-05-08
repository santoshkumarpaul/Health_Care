from django.contrib import admin
from .models import User, OTPVerification, AuditLog

@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ('phone_number', 'role', 'is_active', 'is_staff')
    list_filter = ('role', 'is_active', 'is_staff')
    search_fields = ('phone_number',)

@admin.register(OTPVerification)
class OTPVerificationAdmin(admin.ModelAdmin):
    list_display = ('phone_number', 'otp_code', 'created_at', 'is_used', 'attempts')
    list_filter = ('is_used',)
    search_fields = ('phone_number',)

@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ('timestamp', 'actor', 'action', 'resource')
    list_filter = ('action',)
    search_fields = ('actor__phone_number', 'resource', 'tx_hash')
