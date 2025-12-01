from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from .views import UserViewSet, login_view, register_view, all_users_view

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')

urlpatterns = [
    # Authentication endpoints
    path('login/', login_view, name='login'),
    path('register/', register_view, name='register'),
    path('create_users/', register_view, name='create_users'),  # Flask compatibility
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),  # JWT refresh

    # Legacy Flask endpoint
    path('all_users/', all_users_view, name='all_users'),

    # ViewSet routes
    path('', include(router.urls)),
]
