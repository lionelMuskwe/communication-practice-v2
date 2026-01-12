from rest_framework import serializers
from .models import Feedback


class FeedbackListSerializer(serializers.ModelSerializer):
    """Serializer for listing feedbacks (minimal info)."""
    user_username = serializers.CharField(source='user.username', read_only=True)
    conversation_title = serializers.CharField(source='conversation.title', read_only=True)

    class Meta:
        model = Feedback
        fields = [
            'id', 'title', 'status', 'created_at', 'updated_at',
            'user_username', 'conversation_title'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class FeedbackDetailSerializer(serializers.ModelSerializer):
    """Serializer for detailed feedback view."""
    user_username = serializers.CharField(source='user.username', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    conversation_title = serializers.CharField(source='conversation.title', read_only=True)
    reviewed_by_username = serializers.CharField(source='reviewed_by.username', read_only=True, allow_null=True)

    class Meta:
        model = Feedback
        fields = [
            'id', 'title', 'content', 'status', 'admin_notes',
            'user', 'user_username', 'user_email',
            'conversation', 'conversation_title',
            'reviewed_by', 'reviewed_by_username', 'reviewed_at',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']


class FeedbackCreateSerializer(serializers.Serializer):
    """Serializer for creating feedback."""
    conversation_id = serializers.UUIDField(required=True)
    title = serializers.CharField(required=True, max_length=255)
    content = serializers.CharField(required=True)

    def validate_title(self, value):
        """Validate title is not empty."""
        if not value.strip():
            raise serializers.ValidationError("Title cannot be empty.")
        return value.strip()

    def validate_content(self, value):
        """Validate content is not empty."""
        if not value.strip():
            raise serializers.ValidationError("Content cannot be empty.")
        return value.strip()


class FeedbackUpdateSerializer(serializers.Serializer):
    """Serializer for updating feedback (by user)."""
    title = serializers.CharField(required=False, max_length=255)
    content = serializers.CharField(required=False)


class FeedbackAdminUpdateSerializer(serializers.Serializer):
    """Serializer for admin updates (status, notes)."""
    status = serializers.ChoiceField(
        choices=['submitted', 'not-fit-to-merge', 'fit-to-merge'],
        required=False
    )
    admin_notes = serializers.CharField(required=False, allow_blank=True)
