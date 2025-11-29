from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework.exceptions import AuthenticationFailed

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    """
    User serializer for retrieving and updating user information.
    """
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'role', 'date_joined', 'last_login']
        read_only_fields = ['id', 'date_joined', 'last_login']


class UserRegistrationSerializer(serializers.ModelSerializer):
    """
    Serializer for user registration.
    Handles password hashing compatible with Flask's PBKDF2-SHA256.
    """
    password = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'}
    )
    password_confirm = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'}
    )

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password_confirm', 'role']

    def validate_email(self, value):
        """Ensure email is unique."""
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("User with this email already exists.")
        return value

    def validate(self, attrs):
        """
        Validate passwords match and meet Django's password requirements.
        """
        if attrs['password'] != attrs.pop('password_confirm'):
            raise serializers.ValidationError({"password": "Passwords do not match."})

        # Use Django's password validators
        validate_password(attrs['password'])
        return attrs

    def create(self, validated_data):
        """
        Create user with password hashed using Passlib's PBKDF2-SHA256.
        This maintains compatibility with existing Flask users.
        """
        password = validated_data.pop('password')
        user = User(**validated_data)

        # Use Passlib to match Flask's hashing
        user.password = user.set_password(password)
        user.save()
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    password = serializers.CharField(
        write_only=True,
        required=True,
        style={"input_type": "password"},
        trim_whitespace=False,
    )

    default_error_messages = {
        "invalid_credentials": "Invalid credentials",
        "inactive": "User account is disabled",
    }

    def validate(self, attrs):
        email = attrs.get("email")
        password = attrs.get("password")

        # One generic error to avoid hinting whether email or password is wrong
        generic_error_message = self.error_messages["invalid_credentials"]

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            raise AuthenticationFailed(generic_error_message)

        if not user.check_password(password):
            raise AuthenticationFailed(generic_error_message)

        if not user.is_active:
            raise AuthenticationFailed(self.error_messages["inactive"])

        attrs["user"] = user
        return attrs



class UserListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for listing users.
    """
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'role']
