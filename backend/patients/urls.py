from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PatientViewSet, VitalReadingViewSet, AllergyViewSet, ReminderViewSet

router = DefaultRouter()
router.register(r'patients', PatientViewSet, basename='patient')
router.register(r'vitals', VitalReadingViewSet, basename='vital')
router.register(r'allergies', AllergyViewSet, basename='allergy')
router.register(r'reminders', ReminderViewSet, basename='reminder')

urlpatterns = [
    path('patients/me/', PatientViewSet.as_view({'get': 'me', 'put': 'me', 'patch': 'me'}), name='patient-me'),
    path('', include(router.urls)),
]
