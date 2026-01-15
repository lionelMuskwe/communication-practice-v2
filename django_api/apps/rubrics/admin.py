"""
Django admin configuration for rubrics app.
"""
from django.contrib import admin
from django.utils.html import format_html

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
# Reference Tables Admin
# =============================================================================

@admin.register(GMCCommunicationOutcome)
class GMCCommunicationOutcomeAdmin(admin.ModelAdmin):
    list_display = ['code', 'title', 'domain', 'created_at']
    list_filter = ['domain']
    search_fields = ['code', 'title', 'description']
    ordering = ['code']


@admin.register(MLACapability)
class MLACapabilityAdmin(admin.ModelAdmin):
    list_display = ['code', 'title', 'category', 'created_at']
    list_filter = ['category']
    search_fields = ['code', 'title', 'description']
    ordering = ['code']


@admin.register(MLACondition)
class MLAConditionAdmin(admin.ModelAdmin):
    list_display = ['code', 'name', 'category', 'created_at']
    list_filter = ['category']
    search_fields = ['code', 'name']
    ordering = ['code']


# =============================================================================
# Core Rubric Admin
# =============================================================================

class RubricSectionInline(admin.TabularInline):
    model = RubricSection
    extra = 1
    fields = ['code', 'name', 'ordering', 'description']
    ordering = ['ordering']


@admin.register(RubricFramework)
class RubricFrameworkAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'section_count', 'is_active', 'created_at']
    list_filter = ['is_active']
    search_fields = ['name', 'code', 'description']
    inlines = [RubricSectionInline]
    ordering = ['name']

    def section_count(self, obj):
        return obj.sections.count()
    section_count.short_description = 'Sections'


class RubricCriterionInline(admin.TabularInline):
    model = RubricCriterion
    extra = 1
    fields = ['criterion_text', 'is_required', 'weight', 'ordering']
    ordering = ['ordering']


@admin.register(RubricSection)
class RubricSectionAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'framework', 'criteria_count', 'ordering']
    list_filter = ['framework']
    search_fields = ['name', 'code', 'description']
    inlines = [RubricCriterionInline]
    ordering = ['framework', 'ordering']

    def criteria_count(self, obj):
        return obj.criteria.count()
    criteria_count.short_description = 'Criteria'


class RubricCriterionGMCMappingInline(admin.TabularInline):
    model = RubricCriterionGMCMapping
    extra = 1
    autocomplete_fields = ['gmc_outcome']


class RubricCriterionMLAMappingInline(admin.TabularInline):
    model = RubricCriterionMLAMapping
    extra = 1
    autocomplete_fields = ['mla_capability']


@admin.register(RubricCriterion)
class RubricCriterionAdmin(admin.ModelAdmin):
    list_display = [
        'criterion_text_preview',
        'section',
        'is_required',
        'weight',
        'ordering'
    ]
    list_filter = ['section__framework', 'section', 'is_required']
    search_fields = ['criterion_text', 'marking_instructions']
    inlines = [RubricCriterionGMCMappingInline, RubricCriterionMLAMappingInline]
    ordering = ['section', 'ordering']

    def criterion_text_preview(self, obj):
        return obj.criterion_text[:60] + '...' if len(obj.criterion_text) > 60 else obj.criterion_text
    criterion_text_preview.short_description = 'Criterion'


# =============================================================================
# Template Admin
# =============================================================================

class RubricTemplateCriterionInline(admin.TabularInline):
    model = RubricTemplateCriterion
    extra = 1
    autocomplete_fields = ['criterion']
    fields = ['criterion', 'ordering', 'weight_override']
    ordering = ['ordering']


@admin.register(RubricTemplate)
class RubricTemplateAdmin(admin.ModelAdmin):
    list_display = [
        'display_label',
        'internal_code',
        'framework',
        'status_badge',
        'track_type',
        'criteria_count',
        'version'
    ]
    list_filter = ['status', 'track_type', 'framework']
    search_fields = ['display_label', 'internal_code', 'description']
    inlines = [RubricTemplateCriterionInline]
    readonly_fields = ['published_at']
    ordering = ['framework', 'display_label']
    actions = ['publish_templates']

    def status_badge(self, obj):
        colors = {
            'draft': '#FFA500',
            'published': '#28A745',
            'archived': '#6C757D',
        }
        color = colors.get(obj.status, '#6C757D')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; '
            'border-radius: 3px; font-size: 11px;">{}</span>',
            color,
            obj.status.upper()
        )
    status_badge.short_description = 'Status'

    def criteria_count(self, obj):
        return obj.template_criteria.count()
    criteria_count.short_description = 'Criteria'

    @admin.action(description='Publish selected templates')
    def publish_templates(self, request, queryset):
        count = 0
        for template in queryset:
            if template.status == 'draft':
                template.publish()
                count += 1
        self.message_user(request, f'{count} template(s) published.')


# =============================================================================
# Pack Admin
# =============================================================================

class RubricPackEntryInline(admin.TabularInline):
    model = RubricPackEntry
    extra = 1
    autocomplete_fields = ['template']
    fields = ['template', 'ordering']
    ordering = ['ordering']

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('template')


@admin.register(RubricPack)
class RubricPackAdmin(admin.ModelAdmin):
    list_display = [
        'name',
        'template_count',
        'published_template_count',
        'is_active',
        'created_at'
    ]
    list_filter = ['is_active']
    search_fields = ['name', 'description']
    inlines = [RubricPackEntryInline]
    ordering = ['name']

    def template_count(self, obj):
        return obj.template_count
    template_count.short_description = 'Templates'

    def published_template_count(self, obj):
        return obj.published_template_count
    published_template_count.short_description = 'Published'
