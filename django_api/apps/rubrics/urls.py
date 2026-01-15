"""
URL configuration for rubrics app.
"""
from django.urls import path
from . import views

urlpatterns = [
    # Frameworks
    path('rubrics/frameworks/', views.RubricFrameworkViewSet.as_view({
        'get': 'list',
        'post': 'create'
    }), name='framework-list'),
    path('rubrics/frameworks/<int:pk>/', views.RubricFrameworkViewSet.as_view({
        'get': 'retrieve',
        'put': 'update',
        'patch': 'partial_update',
        'delete': 'destroy'
    }), name='framework-detail'),
    path('rubrics/frameworks/<int:framework_id>/sections/',
         views.get_framework_sections, name='framework-sections'),

    # Sections
    path('rubrics/sections/<int:pk>/', views.RubricSectionViewSet.as_view({
        'get': 'retrieve',
        'put': 'update',
        'patch': 'partial_update',
        'delete': 'destroy'
    }), name='section-detail'),
    path('rubrics/sections/<int:section_id>/criteria/',
         views.get_section_criteria, name='section-criteria'),

    # Criteria
    path('rubrics/criteria/', views.RubricCriterionViewSet.as_view({
        'post': 'create'
    }), name='criterion-create'),
    path('rubrics/criteria/<int:pk>/', views.RubricCriterionViewSet.as_view({
        'get': 'retrieve',
        'put': 'update',
        'patch': 'partial_update',
        'delete': 'destroy'
    }), name='criterion-detail'),
    path('rubrics/criteria/<int:criterion_id>/gmc-mappings/',
         views.manage_criterion_gmc_mappings, name='criterion-gmc-mappings'),
    path('rubrics/criteria/<int:criterion_id>/mla-mappings/',
         views.manage_criterion_mla_mappings, name='criterion-mla-mappings'),

    # Templates
    path('rubrics/templates/', views.RubricTemplateViewSet.as_view({
        'get': 'list',
        'post': 'create'
    }), name='template-list'),
    path('rubrics/templates/<int:pk>/', views.RubricTemplateViewSet.as_view({
        'get': 'retrieve',
        'put': 'update',
        'patch': 'partial_update',
        'delete': 'destroy'
    }), name='template-detail'),
    path('rubrics/templates/<int:pk>/publish/',
         views.publish_template, name='template-publish'),
    path('rubrics/templates/<int:template_id>/criteria/',
         views.manage_template_criteria, name='template-criteria'),

    # Packs
    path('rubrics/packs/', views.RubricPackViewSet.as_view({
        'get': 'list',
        'post': 'create'
    }), name='pack-list'),
    path('rubrics/packs/<int:pk>/', views.RubricPackViewSet.as_view({
        'get': 'retrieve',
        'put': 'update',
        'patch': 'partial_update',
        'delete': 'destroy'
    }), name='pack-detail'),
    path('rubrics/packs/<int:pack_id>/templates/',
         views.manage_pack_templates, name='pack-templates'),
    path('rubrics/packs/<int:pack_id>/full-criteria/',
         views.get_pack_full_criteria, name='pack-full-criteria'),

    # Reference data
    path('rubrics/gmc-outcomes/', views.GMCCommunicationOutcomeViewSet.as_view({
        'get': 'list'
    }), name='gmc-outcomes-list'),
    path('rubrics/mla-capabilities/', views.MLACapabilityViewSet.as_view({
        'get': 'list'
    }), name='mla-capabilities-list'),
]
