from django.urls import path
from .views import (
    create_thread,
    add_message,
    list_messages,
    run_thread,
    run_status,
    rubric_assessment,
    rubric_responses
)

urlpatterns = [
    # Thread management
    path('threads/', create_thread, name='create-thread'),
    path('threads/<str:thread_id>/messages/', add_message, name='add-message'),
    path('threads/<str:thread_id>/messages/', list_messages, name='list-messages'),

    # Run management
    path('threads/run/', run_thread, name='run-thread'),
    path('runs/<str:run_id>/status/', run_status, name='run-status'),

    # Rubric assessment
    path('activities/<int:activity_id>/rubric_assessment/', rubric_assessment, name='rubric-assessment'),
    path('scenarios/<int:scenario_id>/rubric_responses/', rubric_responses, name='rubric-responses'),
]
