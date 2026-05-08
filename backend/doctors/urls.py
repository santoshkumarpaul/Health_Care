from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DoctorViewSet, DoctorDashboardView, RegisterPatientView

router = DefaultRouter()
router.register(r'doctors', DoctorViewSet, basename='doctor')

urlpatterns = [
    path('doctors/me/', DoctorViewSet.as_view({'get': 'me', 'put': 'me', 'patch': 'me'}), name='doctor-me'),
    path('dashboard/doctor/', DoctorDashboardView.as_view(), name='dashboard-doctor'),
    path('register-patient/', RegisterPatientView.as_view(), name='register-patient'),
    path('', include(router.urls)),
]
