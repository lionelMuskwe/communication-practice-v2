from django.db import models
from django.core.validators import MinValueValidator
from apps.scenarios.models import AssistantScenario


class Category(models.Model):
    """
    Assessment category for evaluating communication skills.
    Examples: Information Gathering, Empathy, Clinical Reasoning
    """
    name = models.CharField(
        max_length=255,
        help_text="Category name"
    )
    total_required_to_pass = models.IntegerField(
        validators=[MinValueValidator(0)],
        help_text="Number of subcategories required to pass this category"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'categories'
        verbose_name = 'Category'
        verbose_name_plural = 'Categories'
        ordering = ['name']

    def __str__(self):
        return self.name

    def __repr__(self):
        return f"<Category {self.name}>"


class SubCategory(models.Model):
    """
    Subcategory within an assessment category.
    Represents specific criteria to be evaluated.
    """
    name = models.CharField(
        max_length=255,
        help_text="Subcategory name"
    )
    marking_instructions = models.TextField(
        help_text="Instructions for marking this criterion"
    )
    category = models.ForeignKey(
        Category,
        on_delete=models.CASCADE,
        related_name='subcategories'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'subcategories'
        verbose_name = 'SubCategory'
        verbose_name_plural = 'SubCategories'
        ordering = ['category', 'name']

    def __str__(self):
        return f"{self.category.name} - {self.name}"

    def __repr__(self):
        return f"<SubCategory {self.name} ({self.category.name})>"


class RubricQuestion(models.Model):
    """
    Legacy rubric questions attached to scenarios.
    Simple assessment questions with 0-2 scoring.
    """
    question = models.TextField(
        help_text="Rubric question"
    )
    scenario = models.ForeignKey(
        AssistantScenario,
        on_delete=models.CASCADE,
        related_name='rubric_questions'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'rubric_questions'
        verbose_name = 'Rubric Question'
        verbose_name_plural = 'Rubric Questions'
        ordering = ['scenario', 'id']

    def __str__(self):
        return f"Question {self.id}: {self.question[:50]}"

    def __repr__(self):
        return f"<RubricQuestion {self.id}: {self.question[:30]}>"
