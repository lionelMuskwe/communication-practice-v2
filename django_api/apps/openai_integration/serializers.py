from rest_framework import serializers


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
