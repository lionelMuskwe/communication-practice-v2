import logging
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import Feedback
from .serializers import (
    FeedbackListSerializer,
    FeedbackDetailSerializer,
    FeedbackCreateSerializer,
    FeedbackUpdateSerializer,
    FeedbackAdminUpdateSerializer,
)
from apps.openai_integration.models import Conversation

logger = logging.getLogger(__name__)


class FeedbackViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing user feedback on conversations.

    Endpoints:
    - GET /api/feedback/ - List user's feedback (admin: all feedback)
    - POST /api/feedback/ - Create new feedback
    - GET /api/feedback/<uuid>/ - Get feedback detail
    - PATCH /api/feedback/<uuid>/ - Update feedback (user: content only, admin: status/notes)
    - DELETE /api/feedback/<uuid>/ - Delete feedback
    - PATCH /api/feedback/<uuid>/admin_update/ - Admin-only status/notes update
    """
    permission_classes = [IsAuthenticated]
    lookup_field = 'pk'

    def get_queryset(self):
        """Filter feedback based on user role."""
        user = self.request.user

        # Admins can see all feedback
        if user.role == 'admin':
            queryset = Feedback.objects.select_related(
                'user', 'conversation', 'reviewed_by'
            ).all()

            # Optional filters
            status_filter = self.request.query_params.get('status')
            conversation_id = self.request.query_params.get('conversation_id')

            if status_filter:
                queryset = queryset.filter(status=status_filter)
            if conversation_id:
                queryset = queryset.filter(conversation_id=conversation_id)

            return queryset

        # Regular users see only their own feedback
        return Feedback.objects.filter(user=user).select_related(
            'user', 'conversation', 'reviewed_by'
        )

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'list':
            return FeedbackListSerializer
        elif self.action == 'create':
            return FeedbackCreateSerializer
        elif self.action in ['update', 'partial_update']:
            # Admin can update status, users can update content
            if self.request.user.role == 'admin':
                return FeedbackAdminUpdateSerializer
            return FeedbackUpdateSerializer
        elif self.action == 'admin_update':
            return FeedbackAdminUpdateSerializer
        return FeedbackDetailSerializer

    def list(self, request, *args, **kwargs):
        """List feedback entries."""
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    def create(self, request, *args, **kwargs):
        """
        Create new feedback.

        POST /api/feedback/
        Body: {
            "conversation_id": "uuid",
            "title": "Feedback title",
            "content": "Feedback content"
        }
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        conversation_id = serializer.validated_data['conversation_id']

        # Verify conversation exists and belongs to user
        try:
            conversation = Conversation.objects.get(
                id=conversation_id,
                user=request.user
            )
        except Conversation.DoesNotExist:
            return Response(
                {"message": "Conversation not found or access denied"},
                status=status.HTTP_404_NOT_FOUND
            )

        # Create feedback
        feedback = Feedback.objects.create(
            user=request.user,
            conversation=conversation,
            title=serializer.validated_data['title'],
            content=serializer.validated_data['content'],
            status='submitted'
        )

        output_serializer = FeedbackDetailSerializer(feedback)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)

    def retrieve(self, request, *args, **kwargs):
        """Get feedback detail."""
        feedback = self.get_object()

        # Users can only view their own feedback, admins can view all
        if request.user.role != 'admin' and feedback.user != request.user:
            return Response(
                {"message": "Access denied"},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = self.get_serializer(feedback)
        return Response(serializer.data)

    def partial_update(self, request, *args, **kwargs):
        """
        Update feedback.

        PATCH /api/feedback/<uuid>/
        - Users: can update title/content
        - Admins: can update status/admin_notes
        """
        feedback = self.get_object()

        # Users can only update their own feedback
        if request.user.role != 'admin' and feedback.user != request.user:
            return Response(
                {"message": "Access denied"},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = self.get_serializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        # Update based on user role
        if request.user.role == 'admin':
            # Admin updates
            if 'status' in serializer.validated_data:
                feedback.status = serializer.validated_data['status']
                feedback.reviewed_by = request.user
                feedback.reviewed_at = timezone.now()

            if 'admin_notes' in serializer.validated_data:
                feedback.admin_notes = serializer.validated_data['admin_notes']
        else:
            # User updates
            if 'title' in serializer.validated_data:
                feedback.title = serializer.validated_data['title']

            if 'content' in serializer.validated_data:
                feedback.content = serializer.validated_data['content']

        feedback.save()

        output_serializer = FeedbackDetailSerializer(feedback)
        return Response(output_serializer.data)

    def destroy(self, request, *args, **kwargs):
        """
        Delete feedback.
        - Users can delete their own feedback
        - Admins can delete any feedback
        """
        feedback = self.get_object()

        if request.user.role != 'admin' and feedback.user != request.user:
            return Response(
                {"message": "Access denied"},
                status=status.HTTP_403_FORBIDDEN
            )

        feedback.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['patch'])
    def admin_update(self, request, pk=None):
        """
        Admin-only endpoint for updating feedback status and notes.

        PATCH /api/feedback/<uuid>/admin_update/
        Body: {
            "status": "fit-to-merge",
            "admin_notes": "Reviewed and approved"
        }
        """
        if request.user.role != 'admin':
            return Response(
                {"message": "Admin access required"},
                status=status.HTTP_403_FORBIDDEN
            )

        feedback = self.get_object()
        serializer = self.get_serializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        if 'status' in serializer.validated_data:
            feedback.status = serializer.validated_data['status']
            feedback.reviewed_by = request.user
            feedback.reviewed_at = timezone.now()

        if 'admin_notes' in serializer.validated_data:
            feedback.admin_notes = serializer.validated_data['admin_notes']

        feedback.save()

        output_serializer = FeedbackDetailSerializer(feedback)
        return Response(output_serializer.data)
