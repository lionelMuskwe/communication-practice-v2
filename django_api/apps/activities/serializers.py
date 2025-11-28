from rest_framework import serializers
from .models import Activity
from apps.assessments.serializers import CategoryListSerializer


class ActivityListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for listing activities (Flask compatibility).
    Returns category IDs as list.
    """
    categories = serializers.SerializerMethodField()

    class Meta:
        model = Activity
        fields = ['id', 'pre_brief', 'character_id', 'categories', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_categories(self, obj):
        """Return list of category IDs (Flask compatibility)."""
        return [cat.id for cat in obj.categories.all()]


class ActivityDetailSerializer(serializers.ModelSerializer):
    """
    Detailed serializer for activity with nested category information.
    """
    categories = CategoryListSerializer(many=True, read_only=True)
    character = serializers.SerializerMethodField()

    class Meta:
        model = Activity
        fields = [
            'id', 'pre_brief', 'character_id', 'character',
            'categories', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_character(self, obj):
        """Return character (scenario) basic info."""
        if obj.character:
            return {
                'id': obj.character.id,
                'scenario_text': obj.character.scenario_text,
                'role': obj.character.role,
                'enable': obj.character.enable
            }
        return None


class ActivityCreateUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating/updating activities.
    Accepts category IDs as list.
    """
    categories = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        allow_empty=True
    )

    class Meta:
        model = Activity
        fields = ['id', 'pre_brief', 'character_id', 'categories']
        read_only_fields = ['id']

    def validate_pre_brief(self, value):
        """Ensure pre_brief is not empty."""
        if not value or not value.strip():
            raise serializers.ValidationError("Pre-brief cannot be empty.")
        return value

    def validate_character_id(self, value):
        """Ensure character (scenario) exists."""
        from apps.scenarios.models import AssistantScenario
        if not AssistantScenario.objects.filter(id=value).exists():
            raise serializers.ValidationError("Character not found.")
        return value

    def validate_categories(self, value):
        """Ensure all category IDs exist."""
        from apps.assessments.models import Category
        if value:
            existing_ids = set(Category.objects.filter(id__in=value).values_list('id', flat=True))
            invalid_ids = set(value) - existing_ids
            if invalid_ids:
                raise serializers.ValidationError(f"Categories not found: {invalid_ids}")
        return value

    def create(self, validated_data):
        """Create activity with M2M category relationships."""
        category_ids = validated_data.pop('categories', [])
        activity = Activity.objects.create(**validated_data)

        if category_ids:
            from apps.assessments.models import Category
            categories = Category.objects.filter(id__in=category_ids)
            activity.categories.set(categories)

        return activity

    def update(self, instance, validated_data):
        """Update activity including M2M category relationships."""
        category_ids = validated_data.pop('categories', None)

        # Update scalar fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Update M2M relationships if provided
        if category_ids is not None:
            from apps.assessments.models import Category
            categories = Category.objects.filter(id__in=category_ids)
            instance.categories.set(categories)

        return instance
