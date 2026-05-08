from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AuditLogViewSet, SendOTPView, VerifyOTPView, AdminDashboardView, LoginView, ResetPasswordView

router = DefaultRouter()
router.register(r'audit-logs', AuditLogViewSet, basename='auditlog')

urlpatterns = [
    path('auth/login/', LoginView.as_view(), name='login'),
    path('auth/send-otp/', SendOTPView.as_view(), name='send-otp'),
    path('auth/verify-otp/', VerifyOTPView.as_view(), name='verify-otp'),
    path('auth/reset-password/', ResetPasswordView.as_view(), name='reset-password'),
    path('dashboard/admin/', AdminDashboardView.as_view(), name='dashboard-admin'),
    path('', include(router.urls)),
]
