import logging
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction

from .models import AssistantScenario, Tag
from apps.assessments.models import RubricQuestion
from .serializers import (
    AssistantScenarioListSerializer,
    AssistantScenarioDetailSerializer,
    AssistantScenarioCreateSerializer,
    AssistantScenarioUpdateSerializer
)
from apps.openai_integration.services import AssistantService

logger = logging.getLogger(__name__)


class ScenarioViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing patient scenarios with OpenAI assistant lifecycle.
    Migrated from Flask's assistant_scenario_controller.py
    """
    queryset = AssistantScenario.objects.prefetch_related('tags', 'rubric_questions').all()
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        """Select serializer based on action."""
        if self.action == 'list':
            return AssistantScenarioListSerializer
        elif self.action == 'create':
            return AssistantScenarioCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return AssistantScenarioUpdateSerializer
        return AssistantScenarioDetailSerializer

    def list(self, request):
        """
        List all scenarios with tags and rubrics.

        GET /api/scenarios/
        """
        scenarios = self.get_queryset()
        serializer = AssistantScenarioDetailSerializer(scenarios, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @transaction.atomic
    def create(self, request):
        """
        Create scenario with OpenAI assistant.

        POST /api/scenarios/
        Body: {
            "scenario_text": "...",
            "additional_instructions": "...",
            "role": "Adult",
            "communication_preferences": "...",
            "enable": true,
            "tags": ["tag1", "tag2"],
            "rubrics": ["question1", "question2"]
        }
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data
        tags_data = data.pop('tags', [])
        rubrics_data = data.pop('rubrics', [])

        # Build instruction prompt for OpenAI assistant
        instructions = AssistantService.build_instructions(
            scenario_text=data['scenario_text'],
            additional_instructions=data.get('additional_instructions', ''),
            communication_preferences=data.get('communication_preferences', '')
        )

        # Create OpenAI assistant
        assistant_id, error, code = AssistantService.create_assistant(
            name=data['scenario_text'][:100],  # Name limit
            instructions=instructions,
            model=None  # Use default
        )

        if error:
            return Response(
                {"message": "OpenAI error", "details": error},
                status=code
            )

        # Create scenario in database
        try:
            scenario = AssistantScenario.objects.create(
                **data,
                openid=assistant_id
            )

            # Create tags
            for tag_text in tags_data:
                Tag.objects.create(tag=tag_text, scenario=scenario)

            # Create rubric questions
            for question_text in rubrics_data:
                RubricQuestion.objects.create(question=question_text, scenario=scenario)

            logger.info(f"Created scenario {scenario.id} with assistant {assistant_id}")
            return Response(
                {"message": "Created", "id": scenario.id},
                status=status.HTTP_201_CREATED
            )

        except Exception as e:
            # Cleanup: delete OpenAI assistant if DB operation fails
            AssistantService.delete_assistant(assistant_id)
            logger.error(f"Scenario creation failed: {e}")
            return Response(
                {"message": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @transaction.atomic
    def update(self, request, pk=None):
        """
        Update scenario and recreate OpenAI assistant.

        PUT /api/scenarios/<id>/
        """
        try:
            scenario = self.get_object()
        except AssistantScenario.DoesNotExist:
            return Response(
                {"message": "Not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data
        tags_data = data.pop('tags', [])
        rubrics_data = data.pop('rubrics', [])

        # Delete old OpenAI assistant
        if scenario.openid:
            AssistantService.delete_assistant(scenario.openid)

        # Build new instructions
        instructions = AssistantService.build_instructions(
            scenario_text=data['scenario_text'],
            additional_instructions=data.get('additional_instructions', ''),
            communication_preferences=data.get('communication_preferences', '')
        )

        # Create new OpenAI assistant
        assistant_id, error, code = AssistantService.create_assistant(
            name=data['scenario_text'][:100],
            instructions=instructions,
            model=None
        )

        if error:
            return Response(
                {"message": "OpenAI error", "details": error},
                status=code
            )

        # Update scenario
        for attr, value in data.items():
            setattr(scenario, attr, value)
        scenario.openid = assistant_id
        scenario.save()

        # Update tags (delete all and recreate)
        Tag.objects.filter(scenario=scenario).delete()
        for tag_text in tags_data:
            Tag.objects.create(tag=tag_text, scenario=scenario)

        # Update rubrics (delete all and recreate)
        RubricQuestion.objects.filter(scenario=scenario).delete()
        for question_text in rubrics_data:
            RubricQuestion.objects.create(question=question_text, scenario=scenario)

        logger.info(f"Updated scenario {scenario.id} with new assistant {assistant_id}")
        return Response({"message": "Updated"}, status=status.HTTP_200_OK)

    def destroy(self, request, pk=None):
        """
        Delete scenario and OpenAI assistant.

        DELETE /api/scenarios/<id>/
        """
        try:
            scenario = self.get_object()
        except AssistantScenario.DoesNotExist:
            return Response(
                {"message": "Not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        # Delete OpenAI assistant
        if scenario.openid:
            AssistantService.delete_assistant(scenario.openid)

        # Delete scenario (cascade deletes tags and rubrics)
        scenario.delete()

        logger.info(f"Deleted scenario {pk}")
        return Response({"message": "Deleted"}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['put'])
    def enable(self, request, pk=None):
        """
        Enable a scenario.

        PUT /api/scenarios/<id>/enable/
        """
        try:
            scenario = self.get_object()
        except AssistantScenario.DoesNotExist:
            return Response(
                {"message": "Not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        scenario.enable_scenario()
        return Response({"message": "Enabled"}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['put'])
    def disable(self, request, pk=None):
        """
        Disable a scenario.

        PUT /api/scenarios/<id>/disable/
        """
        try:
            scenario = self.get_object()
        except AssistantScenario.DoesNotExist:
            return Response(
                {"message": "Not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        scenario.disable_scenario()
        return Response({"message": "Disabled"}, status=status.HTTP_200_OK)
