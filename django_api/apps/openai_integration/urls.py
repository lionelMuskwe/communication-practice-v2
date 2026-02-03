"""
OpenAI Integration URL Configuration.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    ConversationViewSet,
    ConversationMessageStreamView,
    MessageAudioStreamView,
    AudioChunkStreamView,
    rubric_assessment,
    rubric_responses,
    get_conversation_assessments,
)
from .stats_views import dashboard_stats

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

    # Message audio endpoint (full message)
    path(
        'conversations/<uuid:pk>/audio/<uuid:message_id>/',
        MessageAudioStreamView.as_view(),
        name='message-audio'
    ),

    # Audio chunk endpoint (sentence-level)
    path(
        'conversations/<uuid:pk>/audio-chunk/<uuid:pending_id>/<int:chunk_index>/',
        AudioChunkStreamView.as_view(),
        name='audio-chunk'
    ),

    # Assessment retrieval
    path(
        'conversations/<uuid:conversation_id>/assessments/',
        get_conversation_assessments,
        name='conversation-assessments'
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

    # Dashboard statistics
    path(
        'stats/dashboard/',
        dashboard_stats,
        name='dashboard-stats'
    ),
]
