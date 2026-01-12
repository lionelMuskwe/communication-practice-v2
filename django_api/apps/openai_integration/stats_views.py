"""
Statistics and aggregation views for dashboard metrics.
"""
import logging
from django.db.models import Count, Q, Avg
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from .models import Conversation, Message, Assessment

logger = logging.getLogger(__name__)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    """
    Get aggregated dashboard statistics for the authenticated user.

    Returns:
        - sessions_completed: Total number of conversations (non-archived)
        - total_messages: Total number of user messages across all conversations
        - average_score: Average assessment score (currently unavailable as scores aren't stored)

    GET /api/stats/dashboard/
    """
    user = request.user

    try:
        # Count non-archived conversations
        sessions_completed = Conversation.objects.filter(
            user=user,
            is_archived=False
        ).count()

        # Count total user messages across all user's conversations
        # We need to count messages where the conversation belongs to the user AND role='user'
        total_messages = Message.objects.filter(
            conversation__user=user,
            role='user'
        ).count()

        # Calculate average score from saved assessments
        avg_score = Assessment.objects.filter(
            conversation__user=user
        ).aggregate(Avg('total_score'))['total_score__avg']

        average_score = round(avg_score, 1) if avg_score else None

        return Response({
            'sessions_completed': sessions_completed,
            'total_messages': total_messages,
            'average_score': average_score,
        }, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Error calculating dashboard stats for user {user.id}: {e}")
        return Response(
            {'error': 'Failed to calculate dashboard statistics'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
