"""
OpenAI Integration Models.

Stores conversations and messages for Chat Completions API.
"""
import uuid
from django.db import models
from django.conf import settings


class Conversation(models.Model):
    """
    Represents a conversation between a user and an AI assistant.
    """
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='conversations'
    )
    activity = models.ForeignKey(
        'activities.Activity',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='conversations'
    )
    scenario = models.ForeignKey(
        'scenarios.AssistantScenario',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='conversations'
    )
    title = models.CharField(
        max_length=255,
        default='New Conversation'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_archived = models.BooleanField(default=False)

    class Meta:
        ordering = ['-updated_at']
        indexes = [
            models.Index(fields=['user', '-updated_at']),
            models.Index(fields=['user', 'is_archived']),
        ]

    def __str__(self):
        return f"{self.title} - {self.user.username}"

    def get_user_message_count(self):
        """
        Get count of user messages in this conversation.
        Used for validation (e.g., assessment requires 5+ messages).
        """
        return self.messages.filter(role='user').count()

    def generate_title_from_prebrief(self):
        """
        Generate conversation title from activity pre_brief.
        Falls back to scenario info if activity unavailable.
        """
        if self.activity and self.activity.pre_brief:
            # Truncate to first 50 chars for brevity
            title = self.activity.pre_brief[:50]
            if len(self.activity.pre_brief) > 50:
                title += '...'
            return title
        elif self.scenario and self.scenario.role:
            return f"Chat with {self.scenario.role}"
        return "New Conversation"

    def update_title_if_needed(self):
        """
        Update title if it's still the default.
        Should be called after first message.
        """
        if self.title == 'New Conversation':
            self.title = self.generate_title_from_prebrief()
            self.save(update_fields=['title', 'updated_at'])


class Message(models.Model):
    """
    Represents a single message in a conversation.
    """
    ROLE_CHOICES = [
        ('user', 'User'),
        ('assistant', 'Assistant'),
        ('system', 'System'),
    ]

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name='messages'
    )
    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES
    )
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    tokens_used = models.IntegerField(
        null=True,
        blank=True,
        help_text='Number of tokens used for this message'
    )
    model = models.CharField(
        max_length=100,
        blank=True,
        help_text='Model used to generate this message'
    )

    class Meta:
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['conversation', 'created_at']),
        ]

    def __str__(self):
        return f"{self.role}: {self.content[:50]}..."
