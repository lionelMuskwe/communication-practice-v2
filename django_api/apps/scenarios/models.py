from django.db import models
from django.core.validators import MinLengthValidator


class AssistantScenario(models.Model):
    """
    Virtual patient scenario model.
    Represents a patient persona used in communication practice.
    """
    scenario_text = models.TextField(
        help_text="Patient background and scenario description",
        validators=[MinLengthValidator(10)]
    )
    additional_instructions = models.TextField(
        help_text="Medical history, symptoms, and additional context"
    )
    enable = models.BooleanField(
        default=True,
        help_text="Whether this scenario is active"
    )
    role = models.TextField(
        default='Adult',
        help_text="Patient role (Adult, Child, Elderly, etc.)"
    )
    communication_preferences = models.TextField(
        null=True,
        blank=True,
        help_text="How the patient prefers to communicate"
    )
    voice = models.CharField(
        max_length=20,
        choices=[
            ('alloy', 'Alloy'),
            ('echo', 'Echo'),
            ('fable', 'Fable'),
            ('onyx', 'Onyx'),
            ('nova', 'Nova'),
            ('shimmer', 'Shimmer'),
        ],
        default='nova',
        help_text="OpenAI TTS voice for this character"
    )
    openid = models.TextField(
        help_text="OpenAI Assistant ID for this scenario"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'assistant_scenarios'
        verbose_name = 'Assistant Scenario'
        verbose_name_plural = 'Assistant Scenarios'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['enable']),
            models.Index(fields=['openid']),
        ]

    def __str__(self):
        return f"Scenario {self.id}: {self.role}"

    def __repr__(self):
        return f"<AssistantScenario {self.id}>"

    def enable_scenario(self):
        """Enable this scenario."""
        self.enable = True
        self.save(update_fields=['enable'])

    def disable_scenario(self):
        """Disable this scenario."""
        self.enable = False
        self.save(update_fields=['enable'])


class Tag(models.Model):
    """
    Tags for categorizing scenarios.
    """
    tag = models.TextField(
        help_text="Tag name"
    )
    scenario = models.ForeignKey(
        AssistantScenario,
        on_delete=models.CASCADE,
        related_name='tags'
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'assistant_tags'
        verbose_name = 'Tag'
        verbose_name_plural = 'Tags'
        ordering = ['tag']
        unique_together = [['tag', 'scenario']]

    def __str__(self):
        return self.tag

    def __repr__(self):
        return f"<Tag {self.id}: {self.tag}>"
