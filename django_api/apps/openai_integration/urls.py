"""
OpenAI Integration URL Configuration.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    ConversationViewSet,
    ConversationMessageStreamView,
    rubric_assessment,
    rubric_responses,
)

# Router for ConversationViewSet
router = DefaultRouter()
router.register(r'conversations', ConversationViewSet, basename='conversation')

urlpatterns = [
    # Conversation management (RESTful routes)
    path('', include(router.urls)),

    # Message streaming endpoint
    path(
        'conversations/<uuid:pk>/stream/',
        ConversationMessageStreamView.as_view(),
        name='conversation-stream'
    ),

    # Rubric assessment
    path(
        'activities/<int:activity_id>/rubric_assessment/',
        rubric_assessment,
        name='rubric-assessment'
    ),
    path(
        'scenarios/<int:scenario_id>/rubric_responses/',
        rubric_responses,
        name='rubric-responses'
    ),
]
