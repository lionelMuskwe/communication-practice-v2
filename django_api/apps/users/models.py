from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """
    Custom user model extending Django's AbstractUser.
    Matches the Flask User model structure.
    """
    ROLE_CHOICES = [
        ('student', 'Student'),
        ('instructor', 'Instructor'),
        ('admin', 'Admin'),
    ]

    # Override email to make it unique and required
    email = models.EmailField(unique=True)

    # Add role field
    role = models.CharField(
        max_length=70,
        choices=ROLE_CHOICES,
        null=True,
        blank=True,
        help_text="User role in the system"
    )

    class Meta:
        db_table = 'user'  # Match Flask's table name
        verbose_name = 'User'
        verbose_name_plural = 'Users'
        ordering = ['-date_joined']

    def __str__(self):
        return f"{self.username} ({self.email})"

    def __repr__(self):
        return f"User('{self.username}', '{self.email}')"
