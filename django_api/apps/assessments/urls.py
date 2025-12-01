from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CategoryViewSet, get_category_rubrics, create_or_update_rubric, delete_rubric

router = DefaultRouter()
router.register(r'categories', CategoryViewSet, basename='category')

urlpatterns = [
    # Category rubrics
    path('categories/<int:category_id>/rubrics/', get_category_rubrics, name='category-rubrics'),

    # Subcategory (rubric) management
    path('rubrics/', create_or_update_rubric, name='rubric-create-update'),
    path('rubrics/<int:rubric_id>/', delete_rubric, name='rubric-delete'),

    # ViewSet routes
    path('', include(router.urls)),
]
