"""
Views for rubrics app.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db import transaction

from .models import (
    GMCCommunicationOutcome,
    MLACapability,
    RubricFramework,
    RubricSection,
    RubricCriterion,
    RubricCriterionGMCMapping,
    RubricCriterionMLAMapping,
    RubricTemplate,
    RubricTemplateCriterion,
    RubricPack,
    RubricPackEntry,
)
from .serializers import (
    GMCCommunicationOutcomeSerializer,
    MLACapabilitySerializer,
    RubricFrameworkSerializer,
    RubricFrameworkCreateUpdateSerializer,
    RubricFrameworkListSerializer,
    RubricSectionSerializer,
    RubricSectionCreateUpdateSerializer,
    RubricSectionListSerializer,
    RubricCriterionSerializer,
    RubricCriterionCreateUpdateSerializer,
    RubricCriterionListSerializer,
    RubricCriterionGMCMappingSerializer,
    RubricCriterionMLAMappingSerializer,
    RubricTemplateSerializer,
    RubricTemplateCreateUpdateSerializer,
    RubricTemplateListSerializer,
    RubricTemplateCriterionSerializer,
    RubricTemplateCriterionCreateSerializer,
    RubricPackSerializer,
    RubricPackCreateUpdateSerializer,
    RubricPackListSerializer,
    RubricPackEntrySerializer,
    RubricPackEntryCreateSerializer,
    ResolvedCriterionSerializer,
)


# =============================================================================
# Reference Data ViewSets
# =============================================================================

class GMCCommunicationOutcomeViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for GMC Communication Outcomes (read-only)."""
    queryset = GMCCommunicationOutcome.objects.all()
    serializer_class = GMCCommunicationOutcomeSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None


class MLACapabilityViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for MLA Capabilities (read-only)."""
    queryset = MLACapability.objects.all()
    serializer_class = MLACapabilitySerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None


# =============================================================================
# Framework ViewSet
# =============================================================================

class RubricFrameworkViewSet(viewsets.ModelViewSet):
    """ViewSet for managing rubric frameworks."""
    queryset = RubricFramework.objects.prefetch_related(
        'sections__criteria'
    ).all()
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'list':
            return RubricFrameworkListSerializer
        if self.action in ['create', 'update', 'partial_update']:
            return RubricFrameworkCreateUpdateSerializer
        return RubricFrameworkSerializer


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def get_framework_sections(request, framework_id):
    """Get or create sections for a framework."""
    framework = get_object_or_404(RubricFramework, pk=framework_id)

    if request.method == 'GET':
        sections = framework.sections.prefetch_related('criteria').order_by('ordering')
        serializer = RubricSectionSerializer(sections, many=True)
        return Response(serializer.data)

    # POST - create new section
    data = request.data.copy()
    data['framework'] = framework_id
    serializer = RubricSectionCreateUpdateSerializer(data=data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# =============================================================================
# Section ViewSet
# =============================================================================

class RubricSectionViewSet(viewsets.ModelViewSet):
    """ViewSet for managing rubric sections."""
    queryset = RubricSection.objects.select_related(
        'framework'
    ).prefetch_related('criteria').all()
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'list':
            return RubricSectionListSerializer
        if self.action in ['create', 'update', 'partial_update']:
            return RubricSectionCreateUpdateSerializer
        return RubricSectionSerializer


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def get_section_criteria(request, section_id):
    """Get or create criteria for a section."""
    section = get_object_or_404(RubricSection, pk=section_id)

    if request.method == 'GET':
        criteria = section.criteria.order_by('ordering')
        serializer = RubricCriterionSerializer(criteria, many=True)
        return Response(serializer.data)

    # POST - create new criterion
    data = request.data.copy()
    data['section'] = section_id
    serializer = RubricCriterionCreateUpdateSerializer(data=data)
    if serializer.is_valid():
        serializer.save()
        # Return full serializer for created object
        full_serializer = RubricCriterionSerializer(serializer.instance)
        return Response(full_serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# =============================================================================
# Criterion ViewSet
# =============================================================================

class RubricCriterionViewSet(viewsets.ModelViewSet):
    """ViewSet for managing rubric criteria."""
    queryset = RubricCriterion.objects.select_related(
        'section__framework'
    ).prefetch_related('gmc_mappings', 'mla_mappings').all()
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'list':
            return RubricCriterionListSerializer
        if self.action in ['create', 'update', 'partial_update']:
            return RubricCriterionCreateUpdateSerializer
        return RubricCriterionSerializer


@api_view(['GET', 'POST', 'DELETE'])
@permission_classes([IsAuthenticated])
def manage_criterion_gmc_mappings(request, criterion_id):
    """Manage GMC outcome mappings for a criterion."""
    criterion = get_object_or_404(RubricCriterion, pk=criterion_id)

    if request.method == 'GET':
        mappings = criterion.gmc_mappings.select_related('gmc_outcome').all()
        serializer = RubricCriterionGMCMappingSerializer(mappings, many=True)
        return Response(serializer.data)

    if request.method == 'POST':
        gmc_outcome_id = request.data.get('gmc_outcome')
        notes = request.data.get('notes', '')

        if not gmc_outcome_id:
            return Response(
                {'error': 'gmc_outcome is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        gmc_outcome = get_object_or_404(GMCCommunicationOutcome, pk=gmc_outcome_id)
        mapping, created = RubricCriterionGMCMapping.objects.get_or_create(
            criterion=criterion,
            gmc_outcome=gmc_outcome,
            defaults={'notes': notes}
        )
        if not created:
            mapping.notes = notes
            mapping.save()

        serializer = RubricCriterionGMCMappingSerializer(mapping)
        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK
        )

    if request.method == 'DELETE':
        gmc_outcome_id = request.data.get('gmc_outcome')
        if not gmc_outcome_id:
            return Response(
                {'error': 'gmc_outcome is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        deleted, _ = RubricCriterionGMCMapping.objects.filter(
            criterion=criterion,
            gmc_outcome_id=gmc_outcome_id
        ).delete()
        if deleted:
            return Response(status=status.HTTP_204_NO_CONTENT)
        return Response(
            {'error': 'Mapping not found'},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['GET', 'POST', 'DELETE'])
@permission_classes([IsAuthenticated])
def manage_criterion_mla_mappings(request, criterion_id):
    """Manage MLA capability mappings for a criterion."""
    criterion = get_object_or_404(RubricCriterion, pk=criterion_id)

    if request.method == 'GET':
        mappings = criterion.mla_mappings.select_related('mla_capability').all()
        serializer = RubricCriterionMLAMappingSerializer(mappings, many=True)
        return Response(serializer.data)

    if request.method == 'POST':
        mla_capability_id = request.data.get('mla_capability')
        notes = request.data.get('notes', '')

        if not mla_capability_id:
            return Response(
                {'error': 'mla_capability is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        mla_capability = get_object_or_404(MLACapability, pk=mla_capability_id)
        mapping, created = RubricCriterionMLAMapping.objects.get_or_create(
            criterion=criterion,
            mla_capability=mla_capability,
            defaults={'notes': notes}
        )
        if not created:
            mapping.notes = notes
            mapping.save()

        serializer = RubricCriterionMLAMappingSerializer(mapping)
        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK
        )

    if request.method == 'DELETE':
        mla_capability_id = request.data.get('mla_capability')
        if not mla_capability_id:
            return Response(
                {'error': 'mla_capability is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        deleted, _ = RubricCriterionMLAMapping.objects.filter(
            criterion=criterion,
            mla_capability_id=mla_capability_id
        ).delete()
        if deleted:
            return Response(status=status.HTTP_204_NO_CONTENT)
        return Response(
            {'error': 'Mapping not found'},
            status=status.HTTP_404_NOT_FOUND
        )


# =============================================================================
# Template ViewSet
# =============================================================================

class RubricTemplateViewSet(viewsets.ModelViewSet):
    """ViewSet for managing rubric templates."""
    queryset = RubricTemplate.objects.select_related(
        'framework'
    ).prefetch_related(
        'template_criteria__criterion__section'
    ).all()
    permission_classes = [IsAuthenticated]
    filterset_fields = ['status', 'track_type', 'framework']
    search_fields = ['display_label', 'internal_code', 'description']

    def get_serializer_class(self):
        if self.action == 'list':
            return RubricTemplateListSerializer
        if self.action in ['create', 'update', 'partial_update']:
            return RubricTemplateCreateUpdateSerializer
        return RubricTemplateSerializer


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def publish_template(request, pk):
    """Publish a draft template."""
    template = get_object_or_404(RubricTemplate, pk=pk)

    if template.status == 'published':
        return Response(
            {'message': 'Template is already published'},
            status=status.HTTP_200_OK
        )

    if template.status == 'archived':
        return Response(
            {'error': 'Cannot publish an archived template'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Check that template has at least one criterion
    if not template.template_criteria.exists():
        return Response(
            {'error': 'Template must have at least one criterion before publishing'},
            status=status.HTTP_400_BAD_REQUEST
        )

    template.publish()
    serializer = RubricTemplateSerializer(template)
    return Response(serializer.data)


@api_view(['GET', 'POST', 'DELETE'])
@permission_classes([IsAuthenticated])
def manage_template_criteria(request, template_id):
    """Manage criteria in a template."""
    template = get_object_or_404(RubricTemplate, pk=template_id)

    if request.method == 'GET':
        criteria = template.template_criteria.select_related(
            'criterion__section'
        ).order_by('ordering')
        serializer = RubricTemplateCriterionSerializer(criteria, many=True)
        return Response(serializer.data)

    if request.method == 'POST':
        criterion_id = request.data.get('criterion')
        ordering = request.data.get('ordering', 0)
        weight_override = request.data.get('weight_override')

        if not criterion_id:
            return Response(
                {'error': 'criterion is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        criterion = get_object_or_404(RubricCriterion, pk=criterion_id)

        # Verify criterion belongs to same framework as template
        if criterion.section.framework_id != template.framework_id:
            return Response(
                {'error': 'Criterion must belong to the same framework as the template'},
                status=status.HTTP_400_BAD_REQUEST
            )

        template_criterion, created = RubricTemplateCriterion.objects.get_or_create(
            template=template,
            criterion=criterion,
            defaults={
                'ordering': ordering,
                'weight_override': weight_override
            }
        )
        if not created:
            template_criterion.ordering = ordering
            template_criterion.weight_override = weight_override
            template_criterion.save()

        serializer = RubricTemplateCriterionSerializer(template_criterion)
        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK
        )

    if request.method == 'DELETE':
        criterion_id = request.data.get('criterion')
        if not criterion_id:
            return Response(
                {'error': 'criterion is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        deleted, _ = RubricTemplateCriterion.objects.filter(
            template=template,
            criterion_id=criterion_id
        ).delete()
        if deleted:
            return Response(status=status.HTTP_204_NO_CONTENT)
        return Response(
            {'error': 'Criterion not in template'},
            status=status.HTTP_404_NOT_FOUND
        )


# =============================================================================
# Pack ViewSet
# =============================================================================

class RubricPackViewSet(viewsets.ModelViewSet):
    """ViewSet for managing rubric packs."""
    queryset = RubricPack.objects.prefetch_related(
        'entries__template__framework'
    ).all()
    permission_classes = [IsAuthenticated]
    filterset_fields = ['is_active']
    search_fields = ['name', 'description']

    def get_serializer_class(self):
        if self.action == 'list':
            return RubricPackListSerializer
        if self.action in ['create', 'update', 'partial_update']:
            return RubricPackCreateUpdateSerializer
        return RubricPackSerializer


@api_view(['GET', 'POST', 'DELETE'])
@permission_classes([IsAuthenticated])
def manage_pack_templates(request, pack_id):
    """Manage templates in a pack."""
    pack = get_object_or_404(RubricPack, pk=pack_id)

    if request.method == 'GET':
        entries = pack.entries.select_related(
            'template__framework'
        ).order_by('ordering')
        serializer = RubricPackEntrySerializer(entries, many=True)
        return Response(serializer.data)

    if request.method == 'POST':
        template_id = request.data.get('template')
        ordering = request.data.get('ordering', 0)

        if not template_id:
            return Response(
                {'error': 'template is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        template = get_object_or_404(RubricTemplate, pk=template_id)

        # Enforce published-only rule
        if template.status != 'published':
            return Response(
                {'error': 'Only published templates can be added to packs'},
                status=status.HTTP_400_BAD_REQUEST
            )

        entry, created = RubricPackEntry.objects.get_or_create(
            pack=pack,
            template=template,
            defaults={'ordering': ordering}
        )
        if not created:
            entry.ordering = ordering
            entry.save()

        serializer = RubricPackEntrySerializer(entry)
        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK
        )

    if request.method == 'DELETE':
        template_id = request.data.get('template')
        if not template_id:
            return Response(
                {'error': 'template is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        deleted, _ = RubricPackEntry.objects.filter(
            pack=pack,
            template_id=template_id
        ).delete()
        if deleted:
            return Response(status=status.HTTP_204_NO_CONTENT)
        return Response(
            {'error': 'Template not in pack'},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_pack_full_criteria(request, pack_id):
    """Get all resolved criteria from a pack."""
    pack = get_object_or_404(RubricPack, pk=pack_id)

    # Check for include_generic parameter
    include_generic = request.query_params.get('include_generic', 'true').lower() == 'true'

    criteria = pack.get_all_criteria(include_generic=include_generic)
    serializer = ResolvedCriterionSerializer(criteria, many=True)
    return Response(serializer.data)
