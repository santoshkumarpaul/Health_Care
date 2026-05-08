from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MedicalRecordViewSet, ConsentViewSet, AISummaryView, QRLookupView, ChatBotView, GenerateQRView, AdvancedAIToolsView

router = DefaultRouter()
router.register(r'records', MedicalRecordViewSet, basename='medicalrecord')
router.register(r'consents', ConsentViewSet, basename='consent')

urlpatterns = [
    path('ai-summary/', AISummaryView.as_view(), name='ai-summary'),
    path('lookup-qr/', QRLookupView.as_view(), name='lookup-qr'),
    path('advanced-ai/', AdvancedAIToolsView.as_view(), name='advanced-ai'),
    path('', include(router.urls)),
    path('chat/', ChatBotView.as_view(), name='chat'),
    path('generate-qr/', GenerateQRView.as_view(), name='generate-qr'),
    path('generate-qr/<int:patient_id>/', GenerateQRView.as_view(), name='generate-qr-id'),
]
