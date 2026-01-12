from django.contrib import admin
from django.utils import timezone
from .models import Feedback


@admin.register(Feedback)
class FeedbackAdmin(admin.ModelAdmin):
    """Admin interface for Feedback model."""

    list_display = [
        'id',
        'title',
        'user',
        'conversation_title',
        'status',
        'reviewed_by',
        'created_at'
    ]

    list_filter = [
        'status',
        'created_at',
        'reviewed_at',
        'user__role'
    ]

    search_fields = [
        'title',
        'content',
        'user__username',
        'user__email',
        'admin_notes'
    ]

    readonly_fields = [
        'id',
        'user',
        'conversation',
        'created_at',
        'updated_at'
    ]

    ordering = ['-created_at']

    fieldsets = (
        ('Feedback Information', {
            'fields': ('id', 'user', 'conversation', 'title', 'content')
        }),
        ('Review Status', {
            'fields': ('status', 'admin_notes', 'reviewed_by', 'reviewed_at')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def conversation_title(self, obj):
        """Display conversation title."""
        return obj.conversation.title if obj.conversation else 'N/A'
    conversation_title.short_description = 'Conversation'

    def save_model(self, request, obj, form, change):
        """Auto-set reviewed_by and reviewed_at when status changes."""
        if change and 'status' in form.changed_data:
            obj.reviewed_by = request.user
            obj.reviewed_at = timezone.now()
        super().save_model(request, obj, form, change)
