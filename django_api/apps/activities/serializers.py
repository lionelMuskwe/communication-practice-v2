from rest_framework import serializers
from .models import Activity
from apps.assessments.serializers import CategoryListSerializer
from apps.scenarios.models import AssistantScenario



class ActivityListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for listing activities (Flask compatibility).
    Returns category IDs as list.
    """
    categories = serializers.SerializerMethodField()
    rubric_pack_name = serializers.CharField(source='rubric_pack.name', read_only=True, allow_null=True)

    class Meta:
        model = Activity
        fields = [
            'id', 'pre_brief', 'character_id', 'categories',
            'rubric_pack_id', 'rubric_pack_name', 'exclude_generic_comms',
            'created_at', 'updated_at'
        ]
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
    rubric_pack = serializers.SerializerMethodField()

    class Meta:
        model = Activity
        fields = [
            'id', 'pre_brief', 'character_id', 'character',
            'categories', 'rubric_pack_id', 'rubric_pack', 'exclude_generic_comms',
            'created_at', 'updated_at'
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

    def get_rubric_pack(self, obj):
        """Return rubric pack info if set."""
        if obj.rubric_pack:
            return {
                'id': obj.rubric_pack.id,
                'name': obj.rubric_pack.name,
                'description': obj.rubric_pack.description,
                'template_count': obj.rubric_pack.template_count,
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

    character_id = serializers.PrimaryKeyRelatedField(
        queryset=AssistantScenario.objects.all(),
        source='character'
    )

    rubric_pack_id = serializers.IntegerField(required=False, allow_null=True)

    class Meta:
        model = Activity
        fields = [
            'id', 'pre_brief', 'character_id', 'categories',
            'rubric_pack_id', 'exclude_generic_comms'
        ]
        read_only_fields = ['id']

    def validate_pre_brief(self, value):
        print("\n******* Validate pre_brief *******\n")
        if not value or not value.strip():
            raise serializers.ValidationError("Pre-brief cannot be empty.")
        return value

    # You can drop validate_character_id now, because the PrimaryKeyRelatedField
    # already ensures the character exists and will raise a 400 if not.

    def validate_categories(self, value):
        """Ensure all category IDs exist."""
        from apps.assessments.models import Category
        if value:
            existing_ids = set(
                Category.objects.filter(id__in=value).values_list('id', flat=True)
            )
            invalid_ids = set(value) - existing_ids
            if invalid_ids:
                raise serializers.ValidationError(f"Categories not found: {invalid_ids}")
        return value

    def validate_rubric_pack_id(self, value):
        """Ensure rubric pack exists if provided."""
        if value is not None:
            from apps.rubrics.models import RubricPack
            if not RubricPack.objects.filter(id=value).exists():
                raise serializers.ValidationError(f"Rubric pack not found: {value}")
        return value

    def create(self, validated_data):
        """Create activity with M2M category relationships and rubric pack."""
        category_ids = validated_data.pop('categories', [])
        rubric_pack_id = validated_data.pop('rubric_pack_id', None)

        # Handle rubric pack
        if rubric_pack_id is not None:
            from apps.rubrics.models import RubricPack
            validated_data['rubric_pack'] = RubricPack.objects.get(id=rubric_pack_id)

        activity = Activity.objects.create(**validated_data)

        if category_ids:
            from apps.assessments.models import Category
            categories = Category.objects.filter(id__in=category_ids)
            activity.categories.set(categories)

        return activity

    def update(self, instance, validated_data):
        """Update activity including M2M category relationships and rubric pack."""
        category_ids = validated_data.pop('categories', None)
        rubric_pack_id = validated_data.pop('rubric_pack_id', None)

        # Handle rubric pack
        if 'rubric_pack_id' in self.initial_data:
            if rubric_pack_id is not None:
                from apps.rubrics.models import RubricPack
                instance.rubric_pack = RubricPack.objects.get(id=rubric_pack_id)
            else:
                instance.rubric_pack = None

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if category_ids is not None:
            from apps.assessments.models import Category
            categories = Category.objects.filter(id__in=category_ids)
            instance.categories.set(categories)

        return instance
