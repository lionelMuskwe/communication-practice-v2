from django.contrib import admin
from .models import Activity


@admin.register(Activity)
class ActivityAdmin(admin.ModelAdmin):
    """Admin interface for Activity model."""
    list_display = ['id', 'character', 'category_count', 'created_at']
    list_filter = ['created_at']
    search_fields = ['pre_brief', 'character__role']
    ordering = ['-created_at']

    fieldsets = (
        (None, {
            'fields': ('pre_brief', 'character')
        }),
        ('Categories', {
            'fields': ('categories',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    filter_horizontal = ['categories']
    readonly_fields = ['created_at', 'updated_at']

    def category_count(self, obj):
        """Display count of categories."""
        return obj.categories.count()
    category_count.short_description = 'Categories'
