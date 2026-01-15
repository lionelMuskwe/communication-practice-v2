from django.db import models
from apps.scenarios.models import AssistantScenario
from apps.assessments.models import Category


class Activity(models.Model):
    """
    Learning activity that combines a patient scenario with assessment.
    Students complete activities to practice communication skills.

    Supports both legacy category-based assessment and new rubric pack system.
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

    # New rubric pack system
    rubric_pack = models.ForeignKey(
        'rubrics.RubricPack',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='activities',
        help_text="Rubric pack for evaluating this activity"
    )
    exclude_generic_comms = models.BooleanField(
        default=False,
        help_text="If true, exclude generic communication templates from evaluation"
    )

    # Legacy category-based assessment (deprecated, kept for backward compatibility)
    categories = models.ManyToManyField(
        Category,
        related_name='activities',
        blank=True,
        help_text="DEPRECATED: Use rubric_pack instead. Assessment categories for this activity"
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

    def get_evaluation_criteria(self):
        """
        Get all criteria for evaluating this activity.
        Returns criteria from rubric_pack if set, otherwise empty list.
        """
        if not self.rubric_pack:
            return []
        return self.rubric_pack.get_all_criteria(
            include_generic=not self.exclude_generic_comms
        )

    @property
    def uses_rubric_pack(self):
        """Check if this activity uses the new rubric pack system."""
        return self.rubric_pack is not None
