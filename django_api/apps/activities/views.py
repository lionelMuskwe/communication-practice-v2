import logging
from rest_framework import status, viewsets
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import Activity
from .serializers import (
    ActivityListSerializer,
    ActivityDetailSerializer,
    ActivityCreateUpdateSerializer
)

logger = logging.getLogger(__name__)


class ActivityViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing learning activities.
    Migrated from Flask's activity.py
    """
    queryset = Activity.objects.prefetch_related('categories', 'character').all()
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        """Select serializer based on action."""
        if self.action == 'list':
            return ActivityListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return ActivityCreateUpdateSerializer
        return ActivityDetailSerializer

    def list(self, request):
        """
        List all activities.

        GET /api/activities/
        """
        activities = self.get_queryset()
        serializer = ActivityListSerializer(activities, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def retrieve(self, request, pk=None):
        """
        Get activity details.

        GET /api/activities/<id>/
        """
        try:
            activity = self.get_object()
            serializer = ActivityDetailSerializer(activity)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Activity.DoesNotExist:
            return Response(
                {"message": "Activity not found"},
                status=status.HTTP_404_NOT_FOUND
            )

    def create(self, request):
        """
        Create or update activity (Flask compatibility).

        POST /api/activities/
        Body: {
            "id": null,
            "pre_brief": "...",
            "character_id": 1,
            "categories": [1, 2, 3]
        }
        """
        activity_id = request.data.get('id')

        # Update if ID provided
        if activity_id:
            try:
                activity = Activity.objects.get(id=activity_id)
                serializer = self.get_serializer(activity, data=request.data)
                serializer.is_valid(raise_exception=True)
                serializer.save()
                return Response(
                    {"message": "Activity saved", "id": activity.id},
                    status=status.HTTP_200_OK
                )
            except Activity.DoesNotExist:
                return Response(
                    {"message": "Activity not found"},
                    status=status.HTTP_404_NOT_FOUND
                )

        # Create new
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        activity = serializer.save()
        return Response(
            {"message": "Activity saved", "id": activity.id},
            status=status.HTTP_200_OK
        )

    def destroy(self, request, pk=None):
        """
        Delete activity.

        DELETE /api/activities/<id>/
        """
        try:
            activity = self.get_object()
            activity.delete()
            return Response(
                {"message": "Activity deleted successfully"},
                status=status.HTTP_200_OK
            )
        except Activity.DoesNotExist:
            return Response(
                {"message": "Activity not found"},
                status=status.HTTP_404_NOT_FOUND
            )
