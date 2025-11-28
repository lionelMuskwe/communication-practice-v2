import logging
import requests
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from apps.scenarios.models import AssistantScenario
from apps.activities.models import Activity
from .services import ThreadService, RunService, build_full_context, get_openai_model
from .evaluators import CategoryRubricEvaluator, SimpleRubricEvaluator
from .serializers import (
    RunCreateSerializer,
    MessageCreateSerializer,
    RubricAssessmentRequestSerializer,
    SimpleRubricRequestSerializer
)

logger = logging.getLogger(__name__)


# ============================================================================
# Thread Management
# ============================================================================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_thread(request):
    """
    Create a new OpenAI conversation thread.

    POST /api/threads/
    Response: {"thread_id": "thread_..."}
    """
    try:
        data = ThreadService.create_thread()
        return Response(
            {"thread_id": data.get("id")},
            status=status.HTTP_201_CREATED
        )
    except requests.HTTPError as e:
        try:
            details = e.response.json()
        except Exception:
            details = str(e)
        return Response(
            {"message": "OpenAI error", "details": details},
            status=e.response.status_code if hasattr(e, 'response') else 500
        )
    except Exception as e:
        logger.error(f"Create thread failed: {e}")
        return Response(
            {"message": "Internal server error"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_message(request, thread_id):
    """
    Add a message to a thread.

    POST /api/threads/<thread_id>/messages/
    Body: {"role": "user", "content": "Hello"}
    """
    serializer = MessageCreateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    try:
        data = ThreadService.create_message(
            thread_id=thread_id,
            role=serializer.validated_data['role'],
            content=serializer.validated_data['content']
        )
        return Response(data, status=status.HTTP_201_CREATED)
    except requests.HTTPError as e:
        try:
            details = e.response.json()
        except Exception:
            details = str(e)
        return Response(
            {"message": "OpenAI error", "details": details},
            status=e.response.status_code if hasattr(e, 'response') else 500
        )
    except Exception as e:
        logger.error(f"Add message failed: {e}")
        return Response(
            {"message": "Internal server error"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_messages(request, thread_id):
    """
    List all messages in a thread (oldest-first, Flask compatibility).

    GET /api/threads/<thread_id>/messages/
    Response: [{"role": "user", "message": "...", "created_at": 123456789}, ...]
    """
    try:
        data = ThreadService.list_messages(thread_id)
        items = []

        # OpenAI returns newest-first; reverse to oldest-first for UI
        for msg in reversed(data.get("data", [])):
            role = msg.get("role")
            timestamp = msg.get("created_at")
            text = ""

            # Extract text from content blocks
            for block in msg.get("content", []):
                if block.get("type") == "text":
                    text += block["text"]["value"]

            # Convert timestamp to milliseconds if needed
            created_at = timestamp * 1000 if isinstance(timestamp, int) else timestamp

            items.append({
                "role": role,
                "message": text,
                "created_at": created_at
            })

        return Response(items, status=status.HTTP_200_OK)

    except requests.HTTPError as e:
        try:
            details = e.response.json()
        except Exception:
            details = str(e)
        return Response(
            {"message": "OpenAI error", "details": details},
            status=e.response.status_code if hasattr(e, 'response') else 500
        )
    except Exception as e:
        logger.error(f"List messages failed: {e}")
        return Response(
            {"message": "Internal server error"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


# ============================================================================
# Run Management (Conversation Execution)
# ============================================================================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def run_thread(request):
    """
    Execute conversation with assistant (create run).

    POST /api/threads/run/
    Body: {
        "thread_id": "thread_...",
        "scenario_id": 1,  (or assistant_id for legacy)
        "activity_id": 1,  (optional)
        "model": "gpt-4"   (optional override)
    }
    Response: {"run_id": "run_...", "status": "queued"}
    """
    serializer = RunCreateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data
    thread_id = data['thread_id']
    scenario_id = data.get('scenario_id')
    activity_id = data.get('activity_id')
    model_override = data.get('model')

    # Load activity and scenario
    activity = None
    scenario = None

    if activity_id:
        try:
            activity = Activity.objects.prefetch_related(
                'categories',
                'categories__subcategories',
                'character',
                'character__tags',
                'character__rubric_questions'
            ).get(id=activity_id)
        except Activity.DoesNotExist:
            pass

    if scenario_id:
        try:
            scenario = AssistantScenario.objects.prefetch_related(
                'tags',
                'rubric_questions'
            ).get(id=scenario_id)
        except AssistantScenario.DoesNotExist:
            pass
    elif activity and activity.character_id:
        try:
            scenario = AssistantScenario.objects.prefetch_related(
                'tags',
                'rubric_questions'
            ).get(id=activity.character_id)
        except AssistantScenario.DoesNotExist:
            pass

    if not scenario:
        return Response(
            {"message": "Scenario not found (provide scenario_id or activity_id with character)"},
            status=status.HTTP_404_NOT_FOUND
        )

    assistant_id = scenario.openid
    if not assistant_id:
        return Response(
            {"message": "Scenario has no assistant 'openid' configured"},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Build context for additional_instructions
    context = build_full_context(activity, scenario)

    try:
        run_data = RunService.create_run(
            thread_id=thread_id,
            assistant_id=assistant_id,
            additional_instructions=context,
            model_override=model_override or get_openai_model()
        )

        return Response(
            {
                "run_id": run_data.get("id"),
                "status": run_data.get("status")
            },
            status=status.HTTP_201_CREATED
        )

    except requests.HTTPError as e:
        try:
            details = e.response.json()
        except Exception:
            details = str(e)
        return Response(
            {"message": "OpenAI error", "details": details},
            status=e.response.status_code if hasattr(e, 'response') else 500
        )
    except Exception as e:
        logger.error(f"Run thread failed: {e}")
        return Response(
            {"message": "Internal server error"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def run_status(request, run_id):
    """
    Check the status of a run.

    GET /api/runs/<run_id>/status/?thread_id=thread_...
    Response: {"status": "completed"}
    """
    thread_id = request.query_params.get('thread_id')
    if not thread_id:
        return Response(
            {"message": "thread_id is required"},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        data = RunService.get_run_status(thread_id, run_id)
        return Response(
            {"status": data.get("status")},
            status=status.HTTP_200_OK
        )
    except requests.HTTPError as e:
        try:
            details = e.response.json()
        except Exception:
            details = str(e)
        return Response(
            {"message": "OpenAI error", "details": details},
            status=e.response.status_code if hasattr(e, 'response') else 500
        )
    except Exception as e:
        logger.error(f"Check run status failed: {e}")
        return Response(
            {"message": "Internal server error"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


# ============================================================================
# Rubric Assessment (AI-powered evaluation)
# ============================================================================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def rubric_assessment(request, activity_id):
    """
    Advanced rubric assessment with evidence citations.

    POST /api/activities/<activity_id>/rubric_assessment/
    Body: {
        "messages": [{"role": "user", "message": "..."}, ...],
        "scenario_id": 1  (optional)
    }
    Response: {
        "categories": [...],
        "overall": {"total_score": 10, "passed": true}
    }
    """
    serializer = RubricAssessmentRequestSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data
    messages = data['messages']
    scenario_id = data.get('scenario_id')

    # Load scenario for context (optional)
    scenario = None
    if scenario_id:
        try:
            scenario = AssistantScenario.objects.get(id=scenario_id)
        except AssistantScenario.DoesNotExist:
            pass

    try:
        result = CategoryRubricEvaluator.evaluate(
            activity_id=activity_id,
            messages=messages,
            scenario=scenario
        )
        return Response(result, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Rubric assessment failed: {e}")
        return Response(
            {"message": "Internal server error"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def rubric_responses(request, scenario_id):
    """
    Legacy simple rubric evaluation (scenario-level questions).

    POST /api/scenarios/<scenario_id>/rubric_responses/
    Body: {
        "messages": [{"role": "user", "message": "..."}, ...]
    }
    Response: {
        "evaluations": [{"question": "...", "score": 0-2, "feedback": "..."}, ...]
    }
    """
    serializer = SimpleRubricRequestSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    messages = serializer.validated_data['messages']

    try:
        result = SimpleRubricEvaluator.evaluate(
            scenario_id=scenario_id,
            messages=messages
        )
        return Response(result, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Simple rubric evaluation failed: {e}")
        return Response(
            {"message": "Internal server error"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
