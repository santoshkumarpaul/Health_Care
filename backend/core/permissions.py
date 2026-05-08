from rest_framework import permissions

class IsPatient(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'patient')

class IsDoctor(permissions.BasePermission):
    def has_permission(self, request, view):
        # Allow doctors, labs, pharmacies, clinics
        allowed_roles = ['doctor', 'lab', 'pharma', 'clinic']
        return bool(request.user and request.user.is_authenticated and request.user.role in allowed_roles)

class IsAdminUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'admin')
