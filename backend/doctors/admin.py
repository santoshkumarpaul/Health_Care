from django.contrib import admin
from .models import Doctor

@admin.register(Doctor)
class DoctorAdmin(admin.ModelAdmin):
    list_display = ('name', 'phone_number', 'specialty', 'facility', 'status', 'is_deleted')
    list_filter = ('status', 'is_deleted', 'specialty')
    search_fields = ('name', 'user__phone_number', 'reg_number', 'hfr_id')
    
    def phone_number(self, obj):
        return obj.user.phone_number
