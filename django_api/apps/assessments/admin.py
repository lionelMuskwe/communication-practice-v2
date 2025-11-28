from django.contrib import admin
from .models import Category, SubCategory, RubricQuestion


class SubCategoryInline(admin.TabularInline):
    """Inline admin for subcategories."""
    model = SubCategory
    extra = 1
    fields = ['name', 'marking_instructions']


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    """Admin interface for Category model."""
    list_display = ['id', 'name', 'total_required_to_pass', 'subcategory_count', 'created_at']
    list_filter = ['created_at']
    search_fields = ['name']
    ordering = ['name']

    fieldsets = (
        (None, {
            'fields': ('name', 'total_required_to_pass')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    readonly_fields = ['created_at', 'updated_at']
    inlines = [SubCategoryInline]

    def subcategory_count(self, obj):
        """Display count of subcategories."""
        return obj.subcategories.count()
    subcategory_count.short_description = 'Subcategories'


@admin.register(SubCategory)
class SubCategoryAdmin(admin.ModelAdmin):
    """Admin interface for SubCategory model."""
    list_display = ['id', 'name', 'category', 'created_at']
    list_filter = ['category', 'created_at']
    search_fields = ['name', 'marking_instructions', 'category__name']
    ordering = ['category', 'name']

    fieldsets = (
        (None, {
            'fields': ('category', 'name', 'marking_instructions')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    readonly_fields = ['created_at', 'updated_at']


@admin.register(RubricQuestion)
class RubricQuestionAdmin(admin.ModelAdmin):
    """Admin interface for RubricQuestion model."""
    list_display = ['id', 'question_preview', 'scenario', 'created_at']
    list_filter = ['created_at']
    search_fields = ['question', 'scenario__role']
    ordering = ['-created_at']

    readonly_fields = ['created_at', 'updated_at']

    def question_preview(self, obj):
        """Display first 50 characters of question."""
        return obj.question[:50] + '...' if len(obj.question) > 50 else obj.question
    question_preview.short_description = 'Question'
