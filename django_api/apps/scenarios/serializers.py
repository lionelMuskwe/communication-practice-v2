from rest_framework import serializers
from .models import AssistantScenario, Tag


class TagSerializer(serializers.ModelSerializer):
    """
    Serializer for scenario tags.
    """
    class Meta:
        model = Tag
        fields = ['id', 'tag', 'created_at']
        read_only_fields = ['id', 'created_at']


class AssistantScenarioListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for listing scenarios.
    """
    tags = serializers.StringRelatedField(many=True, read_only=True)

    class Meta:
        model = AssistantScenario
        fields = [
            'id', 'scenario_text', 'role', 'enable',
            'openid', 'tags', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'openid', 'created_at', 'updated_at']


class AssistantScenarioDetailSerializer(serializers.ModelSerializer):
    """
    Detailed serializer for scenario with nested tags and rubrics.
    Compatible with Flask's serialize() method output.
    """
    tags = serializers.SerializerMethodField()
    rubrics = serializers.SerializerMethodField()

    class Meta:
        model = AssistantScenario
        fields = [
            'id', 'scenario_text', 'additional_instructions',
            'enable', 'role', 'communication_preferences',
            'openid', 'tags', 'rubrics', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'openid', 'created_at', 'updated_at']

    def get_tags(self, obj):
        """Return list of tag strings (Flask compatibility)."""
        return [tag.tag for tag in obj.tags.all()]

    def get_rubrics(self, obj):
        """Return list of rubric question strings (Flask compatibility)."""
        return [rubric.question for rubric in obj.rubric_questions.all()]


class AssistantScenarioCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating scenarios.
    OpenAI assistant creation is handled in the view layer.
    """
    tags = serializers.ListField(
        child=serializers.CharField(max_length=255),
        required=False,
        allow_empty=True
    )
    rubrics = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        allow_empty=True
    )

    class Meta:
        model = AssistantScenario
        fields = [
            'scenario_text', 'additional_instructions',
            'enable', 'role', 'communication_preferences',
            'tags', 'rubrics'
        ]

    def validate_scenario_text(self, value):
        """Ensure scenario text is not empty."""
        if not value or not value.strip():
            raise serializers.ValidationError("Scenario text cannot be empty.")
        return value

    def validate_role(self, value):
        """Validate role field."""
        if not value or not value.strip():
            return 'Adult'  # Default value
        return value


class AssistantScenarioUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating scenarios.
    OpenAI assistant update is handled in the view layer.
    """
    tags = serializers.ListField(
        child=serializers.CharField(max_length=255),
        required=False,
        allow_empty=True
    )
    rubrics = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        allow_empty=True
    )

    class Meta:
        model = AssistantScenario
        fields = [
            'scenario_text', 'additional_instructions',
            'enable', 'role', 'communication_preferences',
            'tags', 'rubrics'
        ]

    def validate_scenario_text(self, value):
        """Ensure scenario text is not empty."""
        if not value or not value.strip():
            raise serializers.ValidationError("Scenario text cannot be empty.")
        return value
