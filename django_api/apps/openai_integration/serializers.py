from rest_framework import serializers
from .models import Conversation, Message


class ThreadCreateSerializer(serializers.Serializer):
    """
    Serializer for creating an OpenAI thread (no input needed).
    """
    pass


class MessageCreateSerializer(serializers.Serializer):
    """
    Serializer for adding a message to a thread.
    """
    role = serializers.ChoiceField(
        choices=['user', 'assistant'],
        default='user'
    )
    content = serializers.CharField(
        required=True,
        allow_blank=False
    )

    def validate_content(self, value):
        """Ensure content is not empty."""
        if not value.strip():
            raise serializers.ValidationError("Message content cannot be empty.")
        return value


class MessageSerializer(serializers.Serializer):
    """
    Serializer for OpenAI message response (Flask compatibility).
    """
    role = serializers.CharField()
    message = serializers.CharField()
    created_at = serializers.IntegerField()


class RunCreateSerializer(serializers.Serializer):
    """
    Serializer for creating a run (conversation execution).
    """
    thread_id = serializers.CharField(required=True)
    scenario_id = serializers.IntegerField(required=False, allow_null=True)
    assistant_id = serializers.IntegerField(required=False, allow_null=True)  # Legacy name
    activity_id = serializers.IntegerField(required=False, allow_null=True)
    model = serializers.CharField(required=False, allow_null=True)

    def validate(self, attrs):
        """
        Ensure either scenario_id, assistant_id, or activity_id is provided.
        """
        scenario_id = attrs.get('scenario_id') or attrs.get('assistant_id')
        activity_id = attrs.get('activity_id')

        if not scenario_id and not activity_id:
            raise serializers.ValidationError(
                "Either scenario_id/assistant_id or activity_id is required."
            )

        attrs['scenario_id'] = scenario_id
        return attrs


class RunStatusSerializer(serializers.Serializer):
    """
    Serializer for run status response.
    """
    status = serializers.CharField()


# Rubric evaluation serializers

class ConversationMessageSerializer(serializers.Serializer):
    """
    Serializer for conversation messages in rubric evaluation.
    """
    role = serializers.CharField(required=True)
    message = serializers.CharField(required=False, allow_blank=True)
    content = serializers.CharField(required=False, allow_blank=True)
    created_at = serializers.IntegerField(required=False, allow_null=True)


class RubricAssessmentRequestSerializer(serializers.Serializer):
    """
    Serializer for rubric assessment request (activity-based).
    """
    messages = serializers.ListField(
        child=ConversationMessageSerializer(),
        required=True,
        allow_empty=False
    )
    scenario_id = serializers.IntegerField(required=False, allow_null=True)

    def validate_messages(self, value):
        """Ensure messages list is not empty."""
        if not value:
            raise serializers.ValidationError("Messages cannot be empty.")
        return value


class EvidenceSerializer(serializers.Serializer):
    """
    Serializer for evidence in rubric evaluation.
    """
    message_indices = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        default=list
    )
    quotes = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        default=list
    )


class SubCategoryEvaluationSerializer(serializers.Serializer):
    """
    Serializer for subcategory evaluation result.
    """
    subcategory_id = serializers.IntegerField()
    name = serializers.CharField()
    score = serializers.IntegerField()
    evidence = EvidenceSerializer()
    rewrite_if_missing = serializers.CharField(allow_blank=True)


class CategoryEvaluationSerializer(serializers.Serializer):
    """
    Serializer for category evaluation result.
    """
    category_id = serializers.IntegerField()
    name = serializers.CharField()
    score = serializers.IntegerField()
    required_to_pass = serializers.IntegerField()
    passed = serializers.BooleanField()
    criteria = SubCategoryEvaluationSerializer(many=True)


class OverallEvaluationSerializer(serializers.Serializer):
    """
    Serializer for overall evaluation summary.
    """
    total_score = serializers.IntegerField()
    passed = serializers.BooleanField()


class RubricAssessmentResponseSerializer(serializers.Serializer):
    """
    Serializer for rubric assessment response.
    """
    categories = CategoryEvaluationSerializer(many=True)
    overall = OverallEvaluationSerializer()


# Legacy simple rubric evaluation

class SimpleRubricEvaluationSerializer(serializers.Serializer):
    """
    Serializer for simple rubric evaluation result (legacy).
    """
    question = serializers.CharField()
    score = serializers.IntegerField()
    feedback = serializers.CharField()


class SimpleRubricResponseSerializer(serializers.Serializer):
    """
    Serializer for simple rubric response.
    """
    evaluations = SimpleRubricEvaluationSerializer(many=True)


class SimpleRubricRequestSerializer(serializers.Serializer):
    """
    Serializer for simple rubric evaluation request.
    """
    messages = serializers.ListField(
        child=ConversationMessageSerializer(),
        required=True,
        allow_empty=False
    )
    scenario_id = serializers.IntegerField(required=False, allow_null=True)


# ============================================================================
# Conversation & Message Serializers (New Chat Completions API)
# ============================================================================

class MessageSerializer(serializers.ModelSerializer):
    """
    Serializer for Message model.
    """
    class Meta:
        model = Message
        fields = ['id', 'role', 'content', 'created_at', 'tokens_used', 'model']
        read_only_fields = ['id', 'created_at']


class ConversationListSerializer(serializers.ModelSerializer):
    """
    Serializer for listing conversations (without messages).
    """
    user_message_count = serializers.SerializerMethodField()
    activity_title = serializers.CharField(source='activity.pre_brief', read_only=True)
    scenario_role = serializers.CharField(source='scenario.role', read_only=True)

    class Meta:
        model = Conversation
        fields = [
            'id', 'title', 'created_at', 'updated_at',
            'is_archived', 'user_message_count',
            'activity_title', 'scenario_role'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_user_message_count(self, obj):
        """Get count of user messages."""
        return obj.get_user_message_count()


class ConversationDetailSerializer(serializers.ModelSerializer):
    """
    Serializer for conversation detail (with nested messages).
    """
    messages = MessageSerializer(many=True, read_only=True)
    user_message_count = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = [
            'id', 'title', 'created_at', 'updated_at',
            'is_archived', 'activity', 'scenario',
            'messages', 'user_message_count'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_user_message_count(self, obj):
        """Get count of user messages."""
        return obj.get_user_message_count()


class ConversationCreateSerializer(serializers.Serializer):
    """
    Serializer for creating a new conversation.
    """
    activity_id = serializers.IntegerField(required=False, allow_null=True)
    scenario_id = serializers.IntegerField(required=True)

    def validate(self, attrs):
        """Ensure at least scenario_id is provided."""
        if not attrs.get('scenario_id'):
            raise serializers.ValidationError(
                "scenario_id is required to create a conversation."
            )
        return attrs


class MessageStreamSerializer(serializers.Serializer):
    """
    Serializer for streaming message request.
    """
    content = serializers.CharField(required=True, allow_blank=False)

    def validate_content(self, value):
        """Ensure content is not empty."""
        if not value.strip():
            raise serializers.ValidationError("Message content cannot be empty.")
        return value.strip()


class ConversationUpdateSerializer(serializers.Serializer):
    """
    Serializer for updating conversation (title, archive status).
    """
    title = serializers.CharField(required=False, max_length=255)
    is_archived = serializers.BooleanField(required=False)
