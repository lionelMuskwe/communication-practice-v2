import logging
from rest_framework import status, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import Category, SubCategory, RubricQuestion
from .serializers import (
    CategorySerializer,
    CategoryCreateUpdateSerializer,
    SubCategorySerializer,
    SubCategoryCreateUpdateSerializer,
    RubricQuestionSerializer,
    RubricQuestionCreateUpdateSerializer
)

logger = logging.getLogger(__name__)


class CategoryViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing assessment categories.
    Migrated from Flask's categories_controller.py
    """
    queryset = Category.objects.prefetch_related('subcategories').all()
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        """Select serializer based on action."""
        if self.action in ['create', 'update', 'partial_update']:
            return CategoryCreateUpdateSerializer
        return CategorySerializer

    def list(self, request):
        """
        List all categories with nested subcategories.

        GET /api/categories/
        """
        categories = self.get_queryset()
        serializer = CategorySerializer(categories, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def create(self, request):
        """
        Create or update category (Flask compatibility).

        POST /api/categories/
        Body: {"id": null, "name": "...", "total_required_to_pass": 5}
        """
        category_id = request.data.get('id')

        # Update if ID provided
        if category_id:
            try:
                category = Category.objects.get(id=category_id)
                serializer = self.get_serializer(category, data=request.data)
                serializer.is_valid(raise_exception=True)
                serializer.save()
                return Response(
                    {"message": "Category saved", "id": category.id},
                    status=status.HTTP_200_OK
                )
            except Category.DoesNotExist:
                return Response(
                    {"message": "Category not found"},
                    status=status.HTTP_404_NOT_FOUND
                )

        # Create new
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        category = serializer.save()
        return Response(
            {"message": "Category saved", "id": category.id},
            status=status.HTTP_200_OK
        )

    def destroy(self, request, pk=None):
        """
        Delete category.

        DELETE /api/categories/<id>/
        """
        try:
            category = self.get_object()
            category.delete()
            return Response(
                {"message": "Category deleted"},
                status=status.HTTP_200_OK
            )
        except Category.DoesNotExist:
            return Response(
                {"message": "Category not found"},
                status=status.HTTP_404_NOT_FOUND
            )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_category_rubrics(request, category_id):
    """
    List subcategories for a category.

    GET /api/categories/<id>/rubrics/
    """
    try:
        category = Category.objects.prefetch_related('subcategories').get(id=category_id)
    except Category.DoesNotExist:
        return Response(
            {"message": "Category not found"},
            status=status.HTTP_404_NOT_FOUND
        )

    serializer = SubCategorySerializer(category.subcategories.all(), many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_or_update_rubric(request):
    """
    Create or update subcategory (rubric).

    POST /api/rubrics/
    Body: {"id": null, "name": "...", "marking_instructions": "...", "category_id": 1}
    """
    rubric_id = request.data.get('id')

    # Update if ID provided
    if rubric_id:
        try:
            rubric = SubCategory.objects.get(id=rubric_id)
            serializer = SubCategoryCreateUpdateSerializer(rubric, data=request.data)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(
                {"message": "Rubric saved", "id": rubric.id},
                status=status.HTTP_200_OK
            )
        except SubCategory.DoesNotExist:
            return Response(
                {"message": "Rubric not found"},
                status=status.HTTP_404_NOT_FOUND
            )

    # Create new
    serializer = SubCategoryCreateUpdateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    rubric = serializer.save()
    return Response(
        {"message": "Rubric saved", "id": rubric.id},
        status=status.HTTP_200_OK
    )


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_rubric(request, rubric_id):
    """
    Delete subcategory (rubric).

    DELETE /api/rubrics/<id>/
    """
    try:
        rubric = SubCategory.objects.get(id=rubric_id)
        rubric.delete()
        return Response(
            {"message": "Rubric deleted"},
            status=status.HTTP_200_OK
        )
    except SubCategory.DoesNotExist:
        return Response(
            {"message": "Rubric not found"},
            status=status.HTTP_404_NOT_FOUND
        )
