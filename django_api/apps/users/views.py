from rest_framework import status, viewsets
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model

from .serializers import (
    UserSerializer,
    UserRegistrationSerializer,
    LoginSerializer,
    UserListSerializer
)

User = get_user_model()


# ============================================================================
# Authentication Views (Login, Register)
# ============================================================================

@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    """
    User login endpoint.
    Returns JWT tokens and user information (Flask compatibility).

    POST /api/auth/login/
    Body: {"email": "user@example.com", "password": "password"}
    Response: {"token": "...", "role": "student", "name": "username"}
    """
    serializer = LoginSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(
            {"message": "Invalid credentials"},
            status=status.HTTP_401_UNAUTHORIZED
        )

    user = serializer.validated_data['user']

    # Generate JWT tokens
    refresh = RefreshToken.for_user(user)

    return Response({
        "token": str(refresh.access_token),
        "refresh": str(refresh),
        "role": user.role,
        "name": user.username
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def register_view(request):
    """
    User registration endpoint.
    Creates new user account (Flask compatibility).

    POST /api/auth/register/
    Body: {"username": "...", "email": "...", "password": "...", "password_confirm": "...", "role": "student"}
    Response: {"message": "User created successfully"}
    """
    serializer = UserRegistrationSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    serializer.save()
    return Response(
        {"message": "User created successfully"},
        status=status.HTTP_201_CREATED
    )


# ============================================================================
# User ViewSet
# ============================================================================

class UserViewSet(viewsets.ModelViewSet):
    """
    ViewSet for user management.
    """
    queryset = User.objects.all()
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        """Select serializer based on action."""
        if self.action == 'list':
            return UserListSerializer
        elif self.action == 'create':
            return UserRegistrationSerializer
        return UserSerializer

    def list(self, request):
        """
        List all users (Flask compatibility).

        GET /api/users/
        Response: [{"id": 1, "username": "...", "email": "...", "role": "..."}]
        """
        users = self.get_queryset()
        serializer = self.get_serializer(users, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def create(self, request):
        """
        Create new user (Flask compatibility).

        POST /api/users/
        Body: {"username": "...", "email": "...", "password": "...", "role": "..."}
        """
        return register_view(request)

    @action(detail=False, methods=['get'])
    def me(self, request):
        """
        Get current user information.

        GET /api/users/me/
        Response: {"id": 1, "username": "...", "email": "...", "role": "..."}
        """
        serializer = UserSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)


# ============================================================================
# Simple list view (Flask /all_users compatibility)
# ============================================================================

@api_view(['GET'])
@permission_classes([AllowAny])  # Warning: Flask had no auth on this endpoint
def all_users_view(request):
    """
    List all usernames (Flask compatibility).
    WARNING: This endpoint had no authentication in Flask.

    GET /api/all_users/
    Response: ["user1", "user2", ...]
    """
    usernames = User.objects.values_list('username', flat=True)
    return Response(list(usernames), status=status.HTTP_200_OK)
