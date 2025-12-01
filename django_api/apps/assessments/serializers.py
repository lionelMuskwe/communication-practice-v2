from rest_framework import serializers
from .models import Category, SubCategory, RubricQuestion


class SubCategorySerializer(serializers.ModelSerializer):
    """
    Serializer for SubCategory (rubric criteria).
    """
    class Meta:
        model = SubCategory
        fields = [
            'id', 'name', 'marking_instructions',
            'category_id', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class SubCategoryListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for listing subcategories.
    """
    class Meta:
        model = SubCategory
        fields = ['id', 'name', 'marking_instructions', 'category_id']


class CategorySerializer(serializers.ModelSerializer):
    """
    Category serializer with nested subcategories (Flask compatibility).
    """
    subcategories = SubCategorySerializer(many=True, read_only=True)

    class Meta:
        model = Category
        fields = [
            'id', 'name', 'total_required_to_pass',
            'subcategories', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class CategoryListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for listing categories without subcategories.
    """
    class Meta:
        model = Category
        fields = ['id', 'name', 'total_required_to_pass']


class CategoryCreateUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating/updating categories.
    """
    class Meta:
        model = Category
        fields = ['id', 'name', 'total_required_to_pass']
        read_only_fields = ['id']

    def validate_total_required_to_pass(self, value):
        """Ensure total_required_to_pass is non-negative."""
        if value < 0:
            raise serializers.ValidationError("Must be a non-negative integer.")
        return value


class SubCategoryCreateUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating/updating subcategories.
    """
    class Meta:
        model = SubCategory
        fields = ['id', 'name', 'marking_instructions', 'category_id']
        read_only_fields = ['id']

    def validate_category_id(self, value):
        """Ensure category exists."""
        if not Category.objects.filter(id=value).exists():
            raise serializers.ValidationError("Category not found.")
        return value


class RubricQuestionSerializer(serializers.ModelSerializer):
    """
    Serializer for legacy scenario-level rubric questions.
    """
    class Meta:
        model = RubricQuestion
        fields = ['id', 'question', 'scenario_id', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class RubricQuestionCreateUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating/updating rubric questions.
    """
    class Meta:
        model = RubricQuestion
        fields = ['id', 'question', 'scenario_id']
        read_only_fields = ['id']

    def validate_question(self, value):
        """Ensure question is not empty."""
        if not value or not value.strip():
            raise serializers.ValidationError("Question cannot be empty.")
        return value
