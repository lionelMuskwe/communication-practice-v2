from django.contrib import admin
from .models import AssistantScenario, Tag


class TagInline(admin.TabularInline):
    """Inline admin for tags."""
    model = Tag
    extra = 1


@admin.register(AssistantScenario)
class AssistantScenarioAdmin(admin.ModelAdmin):
    """Admin interface for AssistantScenario model."""
    list_display = ['id', 'role', 'voice', 'enable', 'openid', 'created_at', 'updated_at']
    list_filter = ['enable', 'role', 'voice', 'created_at']
    search_fields = ['scenario_text', 'role', 'openid']
    readonly_fields = ['openid', 'created_at', 'updated_at']
    ordering = ['-created_at']

    fieldsets = (
        ('Basic Information', {
            'fields': ('scenario_text', 'role', 'voice', 'enable')
        }),
        ('Instructions', {
            'fields': ('additional_instructions', 'communication_preferences')
        }),
        ('OpenAI Integration', {
            'fields': ('openid',),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    inlines = [TagInline]


@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    """Admin interface for Tag model."""
    list_display = ['id', 'tag', 'scenario', 'created_at']
    list_filter = ['created_at']
    search_fields = ['tag', 'scenario__role']
    ordering = ['-created_at']
