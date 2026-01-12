"""
URL configuration for Medical Communication Practice Platform.
Django REST API for medical student communication training.
"""
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    # Django Admin
    path('admin/', admin.site.urls),

    # API endpoints
    path('api/', include('apps.users.urls')),
    path('api/', include('apps.scenarios.urls')),
    path('api/', include('apps.assessments.urls')),
    path('api/', include('apps.activities.urls')),
    path('api/', include('apps.openai_integration.urls')),
    path('api/', include('apps.feedback.urls')),
]
