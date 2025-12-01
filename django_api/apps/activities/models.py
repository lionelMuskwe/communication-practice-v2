from django.db import models
from apps.scenarios.models import AssistantScenario
from apps.assessments.models import Category


class Activity(models.Model):
    """
    Learning activity that combines a patient scenario with assessment categories.
    Students complete activities to practice communication skills.
    """
    pre_brief = models.TextField(
        help_text="Pre-briefing information for the student"
    )
    character = models.ForeignKey(
        AssistantScenario,
        on_delete=models.CASCADE,
        related_name='activities',
        help_text="The patient scenario for this activity"
    )
    categories = models.ManyToManyField(
        Category,
        related_name='activities',
        help_text="Assessment categories for this activity"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'activities'
        verbose_name = 'Activity'
        verbose_name_plural = 'Activities'
        ordering = ['-created_at']

    def __str__(self):
        return f"Activity {self.id} - Character {self.character_id}"

    def __repr__(self):
        return f"<Activity {self.id} - Character {self.character_id}>"
