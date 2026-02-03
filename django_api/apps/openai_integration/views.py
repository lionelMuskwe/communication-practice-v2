"""
OpenAI Integration Views.

Handles conversation management and SSE streaming for Chat Completions API.
"""
import logging
import threading
import time
import uuid
from typing import Dict, Tuple, Optional, List
from django.http import StreamingHttpResponse
from django.db import transaction
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from apps.scenarios.models import AssistantScenario
from apps.activities.models import Activity
from .models import Conversation, Message, Assessment
from .services import ChatCompletionService, TextToSpeechService, build_full_context, get_openai_model
from .utils import SentenceDetector
from .evaluators import (
    CategoryRubricEvaluator,
    SimpleRubricEvaluator,
    RubricPackEvaluator,
    get_evaluator_for_activity
)
from .serializers import (
    ConversationListSerializer,
    ConversationDetailSerializer,
    ConversationCreateSerializer,
    ConversationUpdateSerializer,
    MessageSerializer,
    MessageStreamSerializer,
    RubricAssessmentRequestSerializer,
    SimpleRubricRequestSerializer,
    AssessmentSerializer,
)


logger = logging.getLogger(__name__)


# ============================================================================
# TTS Audio Cache (supports chunked storage)
# ============================================================================

class TTSAudioCache:
    """
    In-memory cache for TTS audio generation.

    Stores audio bytes with expiration to reduce latency.
    Thread-safe for concurrent access.

    Supports both full message audio and sentence chunks:
    - Full message: key = message_id
    - Sentence chunk: key = message_id:chunk_index
    """
    def __init__(self, ttl_seconds: int = 60):
        self._cache: Dict[str, Tuple[bytes, float]] = {}
        self._chunk_ready: Dict[str, Dict[int, bool]] = {}
        self._lock = threading.Lock()
        self._ttl = ttl_seconds

    def set(self, key: str, audio_data: bytes):
        """Store audio data with timestamp."""
        with self._lock:
            self._cache[key] = (audio_data, time.time())
            logger.info(f"[TTS Cache] Stored audio for {key} ({len(audio_data)} bytes)")

    def set_chunk(self, message_id: str, chunk_index: int, audio_data: bytes):
        """Store a sentence audio chunk."""
        key = f"{message_id}:{chunk_index}"
        with self._lock:
            self._cache[key] = (audio_data, time.time())
            if message_id not in self._chunk_ready:
                self._chunk_ready[message_id] = {}
            self._chunk_ready[message_id][chunk_index] = True
            logger.info(f"[TTS Cache] Stored chunk {chunk_index} for message {message_id} ({len(audio_data)} bytes)")

    def get(self, key: str) -> Optional[bytes]:
        """Retrieve audio data if not expired."""
        with self._lock:
            if key not in self._cache:
                return None

            audio_data, timestamp = self._cache[key]

            if time.time() - timestamp > self._ttl:
                del self._cache[key]
                logger.info(f"[TTS Cache] Expired audio for {key}")
                return None

            logger.info(f"[TTS Cache] Cache hit for {key}")
            return audio_data

    def get_chunk(self, message_id: str, chunk_index: int) -> Optional[bytes]:
        """Retrieve a sentence audio chunk."""
        key = f"{message_id}:{chunk_index}"
        return self.get(key)

    def is_chunk_ready(self, message_id: str, chunk_index: int) -> bool:
        """Check if a chunk is ready without retrieving it."""
        with self._lock:
            return (
                message_id in self._chunk_ready and
                chunk_index in self._chunk_ready[message_id]
            )

    def get_chunk_count(self, message_id: str) -> int:
        """Get number of chunks stored for a message."""
        with self._lock:
            if message_id not in self._chunk_ready:
                return 0
            return len(self._chunk_ready[message_id])

    def cleanup_expired(self):
        """Remove expired entries."""
        with self._lock:
            current_time = time.time()
            expired = [
                key for key, (_, timestamp) in self._cache.items()
                if current_time - timestamp > self._ttl
            ]
            for key in expired:
                del self._cache[key]
                if ':' in key:
                    msg_id, chunk_idx = key.rsplit(':', 1)
                    if msg_id in self._chunk_ready:
                        self._chunk_ready[msg_id].pop(int(chunk_idx), None)
                        if not self._chunk_ready[msg_id]:
                            del self._chunk_ready[msg_id]
            if expired:
                logger.info(f"[TTS Cache] Cleaned up {len(expired)} expired entries")


# Global TTS cache instance
tts_cache = TTSAudioCache(ttl_seconds=60)


def pregenerate_tts_audio(message_id: str, text: str, voice: str):
    """
    Background thread function to pre-generate TTS audio for full message.

    Args:
        message_id: Message UUID to cache audio under
        text: Text content to convert to speech
        voice: OpenAI voice ID
    """
    try:
        logger.info(f"[TTS Pregeneration] Starting for message {message_id}")

        audio_chunks = []
        for chunk in TextToSpeechService.generate_speech(
            text=text,
            voice=voice,
            model='tts-1',
            response_format='mp3',
            speed=1.0
        ):
            audio_chunks.append(chunk)

        audio_data = b''.join(audio_chunks)
        tts_cache.set(str(message_id), audio_data)

        logger.info(f"[TTS Pregeneration] Completed for message {message_id} ({len(audio_data)} bytes)")

    except Exception as e:
        logger.error(f"[TTS Pregeneration] Failed for message {message_id}: {e}")


def pregenerate_tts_chunk(message_id: str, chunk_index: int, sentence: str, voice: str):
    """
    Background thread function to pre-generate TTS audio for a single sentence.

    Args:
        message_id: Message UUID
        chunk_index: Sentence index (0-based)
        sentence: Sentence text to convert
        voice: OpenAI voice ID
    """
    try:
        logger.info(f"[TTS Chunk] Starting chunk {chunk_index} for message {message_id}")

        audio_chunks = []
        for chunk in TextToSpeechService.generate_speech(
            text=sentence,
            voice=voice,
            model='tts-1',
            response_format='mp3',
            speed=1.0
        ):
            audio_chunks.append(chunk)

        audio_data = b''.join(audio_chunks)
        tts_cache.set_chunk(str(message_id), chunk_index, audio_data)

        logger.info(f"[TTS Chunk] Completed chunk {chunk_index} for message {message_id} ({len(audio_data)} bytes)")

    except Exception as e:
        logger.error(f"[TTS Chunk] Failed chunk {chunk_index} for message {message_id}: {e}")


# ============================================================================
# Conversation Management ViewSet
# ============================================================================

class ConversationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing conversations.

    Endpoints:
    - GET /api/conversations/ - List user's conversations
    - POST /api/conversations/ - Create new conversation
    - GET /api/conversations/<uuid>/ - Get conversation detail
    - PATCH /api/conversations/<uuid>/ - Update conversation
    - DELETE /api/conversations/<uuid>/ - Delete (soft) conversation
    """
    permission_classes = [IsAuthenticated]
    lookup_field = 'pk'

    def get_queryset(self):
        """Filter conversations by current user."""
        from django.db.models import Count

        queryset = Conversation.objects.filter(
            user=self.request.user,
        ).select_related('activity', 'scenario').annotate(
            message_count=Count('messages')
        )

        # Filter out conversations with 0 messages
        queryset = queryset.filter(message_count__gt=0)

        # Optional filters
        activity_id = self.request.query_params.get('activity_id')
        is_archived = self.request.query_params.get('is_archived')

        if activity_id:
            queryset = queryset.filter(activity_id=activity_id)

        if is_archived is not None:
            is_archived_bool = is_archived.lower() in ('true', '1', 'yes')
            queryset = queryset.filter(is_archived=is_archived_bool)

        return queryset

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'list':
            return ConversationListSerializer
        elif self.action in ['retrieve', 'messages']:
            return ConversationDetailSerializer
        elif self.action == 'create':
            return ConversationCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return ConversationUpdateSerializer
        return ConversationDetailSerializer

    def create(self, request, *args, **kwargs):
        """
        Create a new conversation.

        POST /api/conversations/
        Body: {
            "activity_id": 1 (optional),
            "scenario_id": 1 (required)
        }
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        activity_id = serializer.validated_data.get('activity_id')
        scenario_id = serializer.validated_data.get('scenario_id')

        # Load activity and scenario
        activity = None
        scenario = None

        if activity_id:
            try:
                activity = Activity.objects.prefetch_related(
                    'categories',
                    'categories__subcategories',
                ).get(id=activity_id)
            except Activity.DoesNotExist:
                return Response(
                    {"message": "Activity not found"},
                    status=status.HTTP_404_NOT_FOUND
                )

        try:
            scenario = AssistantScenario.objects.get(id=scenario_id)
        except AssistantScenario.DoesNotExist:
            return Response(
                {"message": "Scenario not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        # Create conversation
        conversation = Conversation.objects.create(
            user=request.user,
            activity=activity,
            scenario=scenario,
            title=Conversation().generate_title_from_prebrief() if activity else f"Chat with {scenario.role}"
        )

        # If activity exists, set proper title
        if activity:
            conversation.title = conversation.generate_title_from_prebrief()
            conversation.save(update_fields=['title'])

        output_serializer = ConversationDetailSerializer(conversation)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)

    def retrieve(self, request, *args, **kwargs):
        """Get conversation with all messages."""
        conversation = self.get_object()
        serializer = self.get_serializer(conversation)
        return Response(serializer.data)

    def partial_update(self, request, *args, **kwargs):
        """
        Update conversation (title, archive status).

        PATCH /api/conversations/<uuid>/
        Body: {"title": "New Title", "is_archived": true}
        """
        conversation = self.get_object()
        serializer = self.get_serializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        if 'title' in serializer.validated_data:
            conversation.title = serializer.validated_data['title']

        if 'is_archived' in serializer.validated_data:
            conversation.is_archived = serializer.validated_data['is_archived']

        conversation.save()

        output_serializer = ConversationDetailSerializer(conversation)
        return Response(output_serializer.data)

    def destroy(self, request, *args, **kwargs):
        """
        Soft delete conversation (set is_archived=True).

        DELETE /api/conversations/<uuid>/
        """
        conversation = self.get_object()
        conversation.is_archived = True
        conversation.save(update_fields=['is_archived', 'updated_at'])

        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['get'])
    def messages(self, request, pk=None):
        """
        Get all messages for a conversation.

        GET /api/conversations/<uuid>/messages/
        """
        conversation = self.get_object()
        serializer = ConversationDetailSerializer(conversation)
        return Response(serializer.data)


# ============================================================================
# Message Streaming View
# ============================================================================

class ConversationMessageStreamView(APIView):
    """
    Stream messages using Server-Sent Events (SSE).

    POST /api/conversations/<uuid>/stream/
    Body: {"content": "user message"}
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        """
        Send a message and stream the assistant's response.

        Returns StreamingHttpResponse with SSE format.
        """
        # Validate conversation exists and belongs to user
        try:
            conversation = Conversation.objects.select_related(
                'activity',
                'scenario'
            ).get(pk=pk, user=request.user)
        except Conversation.DoesNotExist:
            return Response(
                {"message": "Conversation not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        # Validate request
        serializer = MessageStreamSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        user_content = serializer.validated_data['content']

        # Save user message immediately
        user_message = Message.objects.create(
            conversation=conversation,
            role='user',
            content=user_content
        )

        # Update conversation title if still default
        conversation.update_title_if_needed()

        # Build messages for OpenAI
        messages = ChatCompletionService.build_messages_for_chat_completion(
            conversation=conversation,
            activity=conversation.activity,
            scenario=conversation.scenario
        )

        def event_stream():
            """Generator for SSE stream with sentence-level TTS."""
            import json

            full_content = ""
            sentence_detector = SentenceDetector()
            chunk_index = 0
            pending_message_id = str(uuid.uuid4())
            voice = conversation.scenario.voice if conversation.scenario else 'nova'
            tts_threads: List[threading.Thread] = []

            try:
                stream = ChatCompletionService.stream_chat_completion(
                    messages=messages,
                    model=get_openai_model()
                )

                for chunk in stream:
                    if chunk.startswith('data: '):
                        try:
                            data = json.loads(chunk[6:])

                            if data.get('done'):
                                final_sentence = sentence_detector.flush()
                                if final_sentence:
                                    thread = threading.Thread(
                                        target=pregenerate_tts_chunk,
                                        args=(pending_message_id, chunk_index, final_sentence, voice),
                                        daemon=True
                                    )
                                    thread.start()
                                    tts_threads.append(thread)
                                    logger.info(f"[TTS] Started chunk {chunk_index} (final) for pending message")
                                    chunk_index += 1

                                assistant_message = Message.objects.create(
                                    conversation=conversation,
                                    role='assistant',
                                    content=full_content,
                                    model=get_openai_model()
                                )
                                conversation.save(update_fields=['updated_at'])

                                actual_message_id = str(assistant_message.id)

                                yield f"data: {json.dumps({'message_id': actual_message_id, 'pending_id': pending_message_id, 'total_chunks': chunk_index})}\n\n"

                                logger.info(
                                    f"Conversation {conversation.id}: "
                                    f"User message {user_message.id}, "
                                    f"Assistant message {assistant_message.id}, "
                                    f"Total chunks: {chunk_index}"
                                )

                                yield chunk
                                break

                            elif 'token' in data:
                                token = data['token']
                                full_content += token

                                sentences = sentence_detector.add_token(token)
                                for sentence in sentences:
                                    thread = threading.Thread(
                                        target=pregenerate_tts_chunk,
                                        args=(pending_message_id, chunk_index, sentence, voice),
                                        daemon=True
                                    )
                                    thread.start()
                                    tts_threads.append(thread)
                                    logger.info(f"[TTS] Started chunk {chunk_index}: '{sentence[:50]}...'")

                                    yield f"data: {json.dumps({'audio_chunk_ready': chunk_index, 'pending_id': pending_message_id})}\n\n"
                                    chunk_index += 1

                                yield chunk

                        except json.JSONDecodeError:
                            yield chunk
                    else:
                        yield chunk

            except Exception as e:
                logger.error(f"Streaming error: {e}")
                yield f"data: {json.dumps({'error': str(e)})}\n\n"

        response = StreamingHttpResponse(
            event_stream(),
            content_type='text/event-stream'
        )
        response['Cache-Control'] = 'no-cache'
        response['X-Accel-Buffering'] = 'no'
        return response


# ============================================================================
# Message Audio Streaming View
# ============================================================================

class MessageAudioStreamView(APIView):
    """
    Stream TTS audio for a specific assistant message.

    GET /api/conversations/<uuid>/audio/<message_id>/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, pk, message_id):
        """
        Stream audio for an assistant message.

        Query params:
        - voice: Override voice (optional, uses scenario default)
        - speed: Playback speed 0.25-4.0 (optional, default 1.0)
        """
        # Validate conversation exists and belongs to user
        try:
            conversation = Conversation.objects.select_related(
                'scenario'
            ).get(pk=pk, user=request.user)
        except Conversation.DoesNotExist:
            return Response(
                {"message": "Conversation not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        # Validate message exists and belongs to conversation
        try:
            message = Message.objects.get(
                id=message_id,
                conversation=conversation,
                role='assistant'
            )
        except Message.DoesNotExist:
            return Response(
                {"message": "Message not found or not an assistant message"},
                status=status.HTTP_404_NOT_FOUND
            )

        # Get voice from scenario or query param override
        voice = request.query_params.get('voice')
        if not voice and conversation.scenario:
            voice = conversation.scenario.voice
        voice = voice or 'nova'  # Fallback default

        # Get speed parameter
        try:
            speed = float(request.query_params.get('speed', 1.0))
            speed = max(0.25, min(4.0, speed))  # Clamp to valid range
        except ValueError:
            speed = 1.0

        # Validate voice
        valid_voices = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']
        if voice not in valid_voices:
            return Response(
                {"message": f"Invalid voice. Must be one of: {', '.join(valid_voices)}"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check cache first (may already be generated in background)
        cached_audio = tts_cache.get(str(message_id))

        if cached_audio:
            # Cache hit - return immediately
            logger.info(f"[TTS] Serving cached audio for message {message_id}")

            def cached_audio_stream():
                # Yield in chunks for consistency with streaming
                chunk_size = 8192
                for i in range(0, len(cached_audio), chunk_size):
                    yield cached_audio[i:i + chunk_size]

            response = StreamingHttpResponse(
                cached_audio_stream(),
                content_type='audio/mpeg'
            )
            response['Cache-Control'] = 'no-cache'
            response['X-Accel-Buffering'] = 'no'
            return response

        # Cache miss - wait briefly for background generation, then generate on-demand
        logger.info(f"[TTS] Cache miss for message {message_id}, waiting for background generation...")

        # Wait up to 2 seconds for background thread to complete
        for attempt in range(20):  # 20 * 0.1s = 2s max
            time.sleep(0.1)
            cached_audio = tts_cache.get(str(message_id))
            if cached_audio:
                logger.info(f"[TTS] Background generation completed after {(attempt + 1) * 0.1:.1f}s")

                def cached_audio_stream():
                    chunk_size = 8192
                    for i in range(0, len(cached_audio), chunk_size):
                        yield cached_audio[i:i + chunk_size]

                response = StreamingHttpResponse(
                    cached_audio_stream(),
                    content_type='audio/mpeg'
                )
                response['Cache-Control'] = 'no-cache'
                response['X-Accel-Buffering'] = 'no'
                return response

        # Background generation failed or too slow - generate on-demand
        logger.warning(f"[TTS] Background generation timeout, generating on-demand for message {message_id}")

        def audio_stream():
            """Generator for on-demand audio generation."""
            try:
                stream = TextToSpeechService.generate_speech(
                    text=message.content,
                    voice=voice,
                    model='tts-1',
                    response_format='mp3',
                    speed=speed
                )

                for chunk in stream:
                    yield chunk

            except Exception as e:
                logger.error(f"[TTS] Audio streaming error: {e}")
                # Can't send error in binary stream, log only

        response = StreamingHttpResponse(
            audio_stream(),
            content_type='audio/mpeg'
        )
        response['Cache-Control'] = 'no-cache'
        response['X-Accel-Buffering'] = 'no'
        return response


# ============================================================================
# Audio Chunk Streaming View (for sentence-level TTS)
# ============================================================================

class AudioChunkStreamView(APIView):
    """
    Stream TTS audio for a specific sentence chunk.

    GET /api/conversations/<uuid>/audio-chunk/<pending_id>/<chunk_index>/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, pk, pending_id, chunk_index):
        """
        Stream audio for a sentence chunk.

        Args:
            pk: Conversation UUID
            pending_id: Pending message ID (used during streaming)
            chunk_index: Sentence chunk index (0-based)
        """
        try:
            conversation = Conversation.objects.get(pk=pk, user=request.user)
        except Conversation.DoesNotExist:
            return Response(
                {"message": "Conversation not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        try:
            chunk_idx = int(chunk_index)
        except ValueError:
            return Response(
                {"message": "Invalid chunk index"},
                status=status.HTTP_400_BAD_REQUEST
            )

        cached_audio = tts_cache.get_chunk(str(pending_id), chunk_idx)

        if cached_audio:
            logger.info(f"[TTS Chunk] Serving chunk {chunk_idx} for pending {pending_id}")

            def audio_stream():
                chunk_size = 8192
                for i in range(0, len(cached_audio), chunk_size):
                    yield cached_audio[i:i + chunk_size]

            response = StreamingHttpResponse(
                audio_stream(),
                content_type='audio/mpeg'
            )
            response['Cache-Control'] = 'no-cache'
            response['X-Accel-Buffering'] = 'no'
            return response

        for attempt in range(30):
            time.sleep(0.1)
            cached_audio = tts_cache.get_chunk(str(pending_id), chunk_idx)
            if cached_audio:
                logger.info(f"[TTS Chunk] Chunk ready after {(attempt + 1) * 0.1:.1f}s")

                def audio_stream():
                    chunk_size = 8192
                    for i in range(0, len(cached_audio), chunk_size):
                        yield cached_audio[i:i + chunk_size]

                response = StreamingHttpResponse(
                    audio_stream(),
                    content_type='audio/mpeg'
                )
                response['Cache-Control'] = 'no-cache'
                response['X-Accel-Buffering'] = 'no'
                return response

        logger.warning(f"[TTS Chunk] Chunk {chunk_idx} not ready for pending {pending_id}")
        return Response(
            {"message": "Audio chunk not ready", "retry": True},
            status=status.HTTP_202_ACCEPTED
        )


# ============================================================================
# Rubric Assessment
# ============================================================================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def rubric_assessment(request, activity_id):
    """
    Advanced rubric assessment with evidence citations.

    Now accepts conversation_id instead of messages array.

    POST /api/activities/<activity_id>/rubric_assessment/
    Body: {
        "conversation_id": "uuid",
        "scenario_id": 1 (optional)
    }
    Response: {
        "categories": [...],
        "overall": {"total_score": 10, "passed": true}
    }
    """
    conversation_id = request.data.get('conversation_id')
    scenario_id = request.data.get('scenario_id')

    if not conversation_id:
        return Response(
            {"message": "conversation_id is required"},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Fetch conversation
    try:
        conversation = Conversation.objects.prefetch_related(
            'messages'
        ).get(pk=conversation_id, user=request.user)
    except Conversation.DoesNotExist:
        return Response(
            {"message": "Conversation not found"},
            status=status.HTTP_404_NOT_FOUND
        )

    # Check minimum message requirement (5 user messages)
    user_message_count = conversation.get_user_message_count()
    if user_message_count < 5:
        return Response(
            {
                "message": f"At least 5 user messages required for assessment. Current count: {user_message_count}"
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    # Convert messages to expected format
    messages = []
    for msg in conversation.messages.all():
        messages.append({
            'role': msg.role,
            'message': msg.content,
            'created_at': int(msg.created_at.timestamp() * 1000)
        })

    # Load scenario for context (optional)
    scenario = None
    if scenario_id:
        try:
            scenario = AssistantScenario.objects.get(id=scenario_id)
        except AssistantScenario.DoesNotExist:
            pass
    elif conversation.scenario:
        scenario = conversation.scenario

    # Load activity to determine which evaluator to use
    try:
        activity = Activity.objects.select_related('rubric_pack').get(id=activity_id)
    except Activity.DoesNotExist:
        return Response(
            {"message": "Activity not found"},
            status=status.HTTP_404_NOT_FOUND
        )

    try:
        # Select evaluator based on whether activity uses rubric pack
        evaluator = get_evaluator_for_activity(activity)
        result = evaluator.evaluate(
            activity_id=activity_id,
            messages=messages,
            scenario=scenario
        )

        # Save assessment to database
        assessment = Assessment.objects.create(
            conversation=conversation,
            results=result,
            total_score=result.get('overall', {}).get('total_score'),
            passed=result.get('overall', {}).get('passed', False),
            assessed_by=request.user
        )

        logger.info(f"Saved assessment {assessment.id} for conversation {conversation_id}")

        # Return assessment with saved ID
        return Response({
            'assessment_id': str(assessment.id),
            **result
        }, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Rubric assessment failed: {e}")
        return Response(
            {"message": "Internal server error"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_conversation_assessments(request, conversation_id):
    """
    Get all assessments for a conversation.
    Returns latest assessment by default, or all with ?all=true

    GET /api/conversations/<conversation_id>/assessments/
    Query params: ?all=true (optional, to get all assessments)
    """
    try:
        conversation = Conversation.objects.get(
            id=conversation_id,
            user=request.user
        )
    except Conversation.DoesNotExist:
        return Response(
            {'error': 'Conversation not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    show_all = request.query_params.get('all', 'false').lower() == 'true'

    if show_all:
        assessments = conversation.assessments.all()
        serializer = AssessmentSerializer(assessments, many=True)
    else:
        latest = conversation.assessments.first()
        if not latest:
            return Response(
                {'message': 'No assessments found'},
                status=status.HTTP_404_NOT_FOUND
            )
        serializer = AssessmentSerializer(latest)

    return Response(serializer.data)


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
