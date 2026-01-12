import uuid
from django.db import models
from django.conf import settings


class Feedback(models.Model):
    """
    User feedback on conversations.
    Allows students to provide feedback and admins to review/annotate it.
    """

    STATUS_CHOICES = [
        ('submitted', 'Submitted'),
        ('not-fit-to-merge', 'Not Fit to Merge'),
        ('fit-to-merge', 'Fit to Merge'),
    ]

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )

    # Foreign Keys
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='feedbacks',
        help_text='User who submitted the feedback'
    )
    conversation = models.ForeignKey(
        'openai_integration.Conversation',
        on_delete=models.CASCADE,
        related_name='feedbacks',
        help_text='Related conversation'
    )

    # Feedback content
    title = models.CharField(
        max_length=255,
        help_text='Brief title for the feedback'
    )
    content = models.TextField(
        help_text='Detailed feedback content'
    )

    # Admin review fields
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='submitted',
        help_text='Current status of the feedback'
    )
    admin_notes = models.TextField(
        blank=True,
        null=True,
        help_text='Internal notes by admin/reviewer'
    )
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_feedbacks',
        help_text='Admin who reviewed this feedback'
    )
    reviewed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='When the feedback was reviewed'
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'feedback'
        verbose_name = 'Feedback'
        verbose_name_plural = 'Feedbacks'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['conversation']),
            models.Index(fields=['status', '-created_at']),
            models.Index(fields=['reviewed_by']),
        ]

    def __str__(self):
        return f"Feedback {self.id} - {self.title}"

    def __repr__(self):
        return f"<Feedback {self.id}: {self.title}>"
