"""
Serializers for rubrics app.
"""
from rest_framework import serializers
from .models import (
    GMCCommunicationOutcome,
    MLACapability,
    MLACondition,
    RubricFramework,
    RubricSection,
    RubricCriterion,
    RubricCriterionGMCMapping,
    RubricCriterionMLAMapping,
    RubricTemplate,
    RubricTemplateCriterion,
    RubricPack,
    RubricPackEntry,
)


# =============================================================================
# Reference Table Serializers
# =============================================================================

class GMCCommunicationOutcomeSerializer(serializers.ModelSerializer):
    class Meta:
        model = GMCCommunicationOutcome
        fields = ['id', 'code', 'title', 'description', 'domain', 'created_at']
        read_only_fields = ['created_at']


class MLACapabilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = MLACapability
        fields = ['id', 'code', 'title', 'description', 'category', 'created_at']
        read_only_fields = ['created_at']


class MLAConditionSerializer(serializers.ModelSerializer):
    class Meta:
        model = MLACondition
        fields = ['id', 'code', 'name', 'category', 'created_at']
        read_only_fields = ['created_at']


# =============================================================================
# Core Rubric Serializers
# =============================================================================

class RubricCriterionGMCMappingSerializer(serializers.ModelSerializer):
    gmc_outcome_code = serializers.CharField(source='gmc_outcome.code', read_only=True)
    gmc_outcome_title = serializers.CharField(source='gmc_outcome.title', read_only=True)

    class Meta:
        model = RubricCriterionGMCMapping
        fields = ['id', 'gmc_outcome', 'gmc_outcome_code', 'gmc_outcome_title', 'notes']


class RubricCriterionMLAMappingSerializer(serializers.ModelSerializer):
    mla_capability_code = serializers.CharField(source='mla_capability.code', read_only=True)
    mla_capability_title = serializers.CharField(source='mla_capability.title', read_only=True)

    class Meta:
        model = RubricCriterionMLAMapping
        fields = ['id', 'mla_capability', 'mla_capability_code', 'mla_capability_title', 'notes']


class RubricCriterionSerializer(serializers.ModelSerializer):
    section_name = serializers.CharField(source='section.name', read_only=True)
    section_code = serializers.CharField(source='section.code', read_only=True)
    framework_code = serializers.CharField(source='section.framework.code', read_only=True)
    gmc_mappings = RubricCriterionGMCMappingSerializer(many=True, read_only=True)
    mla_mappings = RubricCriterionMLAMappingSerializer(many=True, read_only=True)

    class Meta:
        model = RubricCriterion
        fields = [
            'id', 'section', 'section_name', 'section_code', 'framework_code',
            'criterion_text', 'marking_instructions', 'weight', 'is_required',
            'ordering', 'gmc_mappings', 'mla_mappings', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


class RubricCriterionCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = RubricCriterion
        fields = [
            'id', 'section', 'criterion_text', 'marking_instructions',
            'weight', 'is_required', 'ordering'
        ]


class RubricCriterionListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing criteria."""
    section_name = serializers.CharField(source='section.name', read_only=True)

    class Meta:
        model = RubricCriterion
        fields = [
            'id', 'section', 'section_name', 'criterion_text',
            'weight', 'is_required', 'ordering'
        ]


class RubricSectionSerializer(serializers.ModelSerializer):
    framework_name = serializers.CharField(source='framework.name', read_only=True)
    framework_code = serializers.CharField(source='framework.code', read_only=True)
    criteria = RubricCriterionSerializer(many=True, read_only=True)
    criteria_count = serializers.SerializerMethodField()

    class Meta:
        model = RubricSection
        fields = [
            'id', 'framework', 'framework_name', 'framework_code',
            'name', 'code', 'description', 'ordering',
            'criteria', 'criteria_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']

    def get_criteria_count(self, obj):
        return obj.criteria.count()


class RubricSectionCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = RubricSection
        fields = ['id', 'framework', 'name', 'code', 'description', 'ordering']


class RubricSectionListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing sections."""
    criteria_count = serializers.SerializerMethodField()

    class Meta:
        model = RubricSection
        fields = ['id', 'name', 'code', 'description', 'ordering', 'criteria_count']

    def get_criteria_count(self, obj):
        return obj.criteria.count()


class RubricFrameworkSerializer(serializers.ModelSerializer):
    sections = RubricSectionSerializer(many=True, read_only=True)
    section_count = serializers.SerializerMethodField()
    template_count = serializers.SerializerMethodField()

    class Meta:
        model = RubricFramework
        fields = [
            'id', 'name', 'code', 'description', 'is_active',
            'sections', 'section_count', 'template_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']

    def get_section_count(self, obj):
        return obj.sections.count()

    def get_template_count(self, obj):
        return obj.templates.count()


class RubricFrameworkCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = RubricFramework
        fields = ['id', 'name', 'code', 'description', 'is_active']


class RubricFrameworkListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing frameworks."""
    section_count = serializers.SerializerMethodField()
    template_count = serializers.SerializerMethodField()

    class Meta:
        model = RubricFramework
        fields = [
            'id', 'name', 'code', 'description', 'is_active',
            'section_count', 'template_count', 'created_at'
        ]

    def get_section_count(self, obj):
        return obj.sections.count()

    def get_template_count(self, obj):
        return obj.templates.count()


# =============================================================================
# Template Serializers
# =============================================================================

class RubricTemplateCriterionSerializer(serializers.ModelSerializer):
    criterion_text = serializers.CharField(source='criterion.criterion_text', read_only=True)
    marking_instructions = serializers.CharField(source='criterion.marking_instructions', read_only=True)
    section_name = serializers.CharField(source='criterion.section.name', read_only=True)
    section_code = serializers.CharField(source='criterion.section.code', read_only=True)
    is_required = serializers.BooleanField(source='criterion.is_required', read_only=True)
    effective_weight = serializers.DecimalField(max_digits=3, decimal_places=2, read_only=True)

    class Meta:
        model = RubricTemplateCriterion
        fields = [
            'id', 'criterion', 'criterion_text', 'marking_instructions',
            'section_name', 'section_code', 'is_required',
            'ordering', 'weight_override', 'effective_weight'
        ]


class RubricTemplateCriterionCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = RubricTemplateCriterion
        fields = ['criterion', 'ordering', 'weight_override']


class RubricTemplateSerializer(serializers.ModelSerializer):
    framework_name = serializers.CharField(source='framework.name', read_only=True)
    framework_code = serializers.CharField(source='framework.code', read_only=True)
    template_criteria = RubricTemplateCriterionSerializer(many=True, read_only=True)
    criteria_count = serializers.SerializerMethodField()

    class Meta:
        model = RubricTemplate
        fields = [
            'id', 'framework', 'framework_name', 'framework_code',
            'display_label', 'internal_code', 'description',
            'status', 'track_type', 'version',
            'template_criteria', 'criteria_count',
            'created_at', 'updated_at', 'published_at'
        ]
        read_only_fields = ['created_at', 'updated_at', 'published_at']

    def get_criteria_count(self, obj):
        return obj.template_criteria.count()


class RubricTemplateCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = RubricTemplate
        fields = [
            'id', 'framework', 'display_label', 'internal_code',
            'description', 'track_type'
        ]

    def validate_internal_code(self, value):
        """Ensure internal_code is unique (case-insensitive)."""
        qs = RubricTemplate.objects.filter(internal_code__iexact=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("A template with this internal code already exists.")
        return value


class RubricTemplateListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing templates."""
    framework_name = serializers.CharField(source='framework.name', read_only=True)
    framework_code = serializers.CharField(source='framework.code', read_only=True)
    criteria_count = serializers.SerializerMethodField()

    class Meta:
        model = RubricTemplate
        fields = [
            'id', 'framework', 'framework_name', 'framework_code',
            'display_label', 'internal_code', 'status', 'track_type',
            'criteria_count', 'created_at', 'published_at'
        ]

    def get_criteria_count(self, obj):
        return obj.template_criteria.count()


# =============================================================================
# Pack Serializers
# =============================================================================

class RubricPackEntrySerializer(serializers.ModelSerializer):
    template_name = serializers.CharField(source='template.display_label', read_only=True)
    template_code = serializers.CharField(source='template.internal_code', read_only=True)
    template_status = serializers.CharField(source='template.status', read_only=True)
    template_track_type = serializers.CharField(source='template.track_type', read_only=True)
    framework_name = serializers.CharField(source='template.framework.name', read_only=True)

    class Meta:
        model = RubricPackEntry
        fields = [
            'id', 'template', 'template_name', 'template_code',
            'template_status', 'template_track_type', 'framework_name',
            'ordering'
        ]


class RubricPackEntryCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = RubricPackEntry
        fields = ['template', 'ordering']

    def validate_template(self, value):
        """Ensure only published templates can be added."""
        if value.status != 'published':
            raise serializers.ValidationError(
                "Only published templates can be added to rubric packs."
            )
        return value


class RubricPackSerializer(serializers.ModelSerializer):
    entries = RubricPackEntrySerializer(many=True, read_only=True)
    template_count = serializers.IntegerField(read_only=True)
    published_template_count = serializers.IntegerField(read_only=True)
    criteria_count = serializers.SerializerMethodField()

    class Meta:
        model = RubricPack
        fields = [
            'id', 'name', 'description', 'is_active',
            'entries', 'template_count', 'published_template_count',
            'criteria_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']

    def get_criteria_count(self, obj):
        return len(obj.get_all_criteria())


class RubricPackCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = RubricPack
        fields = ['id', 'name', 'description', 'is_active']


class RubricPackListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing packs."""
    template_count = serializers.IntegerField(read_only=True)
    published_template_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = RubricPack
        fields = [
            'id', 'name', 'description', 'is_active',
            'template_count', 'published_template_count', 'created_at'
        ]


# =============================================================================
# Full Criteria Resolution Serializer (for evaluation)
# =============================================================================

class ResolvedCriterionSerializer(serializers.Serializer):
    """Serializer for fully resolved criteria from a pack."""
    criterion_id = serializers.IntegerField(source='criterion.id')
    criterion_text = serializers.CharField(source='criterion.criterion_text')
    marking_instructions = serializers.CharField(source='criterion.marking_instructions')
    section_id = serializers.IntegerField(source='criterion.section.id')
    section_name = serializers.CharField(source='criterion.section.name')
    section_code = serializers.CharField(source='criterion.section.code')
    framework_code = serializers.CharField(source='criterion.section.framework.code')
    template_id = serializers.IntegerField(source='template.id')
    template_name = serializers.CharField(source='template.display_label')
    template_code = serializers.CharField(source='template.internal_code')
    track_type = serializers.CharField(source='template.track_type')
    weight = serializers.FloatField()
    is_required = serializers.BooleanField(source='criterion.is_required')
