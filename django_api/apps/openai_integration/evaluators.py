"""
Rubric evaluation services using OpenAI.
Migrated from Flask's openai_controller.py rubric assessment logic.
"""
import json
import logging
import requests
from typing import Dict, List, Any, Optional
from django.db import models
from .services import get_openai_key, get_openai_model

logger = logging.getLogger(__name__)


# ============================================================================
# Rubric Loading Helper
# ============================================================================

def load_activity_rubric(activity_id: int) -> List[Dict[str, Any]]:
    """
    Load rubric structure for an activity.

    Returns:
        List of categories with their subcategories:
        [
            {
                "category_id": int,
                "name": str,
                "required_to_pass": int,
                "criteria": [
                    {
                        "subcategory_id": int,
                        "name": str,
                        "marking_instructions": str
                    },
                    ...
                ]
            },
            ...
        ]
    """
    from apps.activities.models import Activity
    from apps.assessments.models import Category, SubCategory

    # Load activity with categories
    try:
        activity = Activity.objects.prefetch_related(
            'categories',
            'categories__subcategories'
        ).get(id=activity_id)
    except Activity.DoesNotExist:
        return []

    categories = activity.categories.all()
    if not categories:
        return []

    # Build rubric structure
    rubric = []
    for category in categories:
        subcategories = category.subcategories.all()
        criteria = [
            {
                "subcategory_id": sub.id,
                "name": (sub.name or "").strip(),
                "marking_instructions": (sub.marking_instructions or "").strip(),
            }
            for sub in subcategories
        ]

        rubric.append({
            "category_id": category.id,
            "name": (category.name or "").strip(),
            "required_to_pass": getattr(category, "total_required_to_pass", 0),
            "criteria": criteria,
        })

    return rubric


# ============================================================================
# Category-Based Rubric Evaluator (Advanced)
# ============================================================================

class CategoryRubricEvaluator:
    """
    Advanced rubric evaluator using categories and subcategories.
    Provides evidence citations and rewrite suggestions.
    """

    @staticmethod
    def build_transcript(messages: List[Dict], max_turns: int = 40, max_chars: int = 12000) -> str:
        """
        Build indexed transcript from conversation messages.

        Args:
            messages: List of {role, message/content, created_at?}
            max_turns: Maximum number of recent turns to include
            max_chars: Maximum character length

        Returns:
            Indexed transcript string:
            [0] DOCTOR: Hello
            [1] PATIENT: Hi
            ...
        """
        lines = []
        recent_messages = messages[-max_turns:]

        for idx, msg in enumerate(recent_messages):
            role = (msg.get("role") or "").strip()
            who = "DOCTOR" if role == "user" else "PATIENT"
            text = (msg.get("message") or msg.get("content") or "").strip()

            if text:
                lines.append(f"[{idx}] {who}: {text}")

        transcript = "\n".join(lines)

        # Truncate if too long (keep most recent)
        if len(transcript) > max_chars:
            transcript = transcript[-max_chars:]

        return transcript

    @staticmethod
    def evaluate(
        activity_id: int,
        messages: List[Dict],
        scenario=None
    ) -> Dict[str, Any]:
        """
        Evaluate conversation against activity rubric.

        Args:
            activity_id: Activity ID
            messages: List of conversation messages
            scenario: Optional scenario object for context

        Returns:
            {
                "categories": [
                    {
                        "category_id": int,
                        "name": str,
                        "score": int,
                        "required_to_pass": int,
                        "passed": bool,
                        "criteria": [
                            {
                                "subcategory_id": int,
                                "name": str,
                                "score": int (0-2),
                                "evidence": {
                                    "message_indices": [int],
                                    "quotes": [str]
                                },
                                "rewrite_if_missing": str
                            },
                            ...
                        ]
                    },
                    ...
                ],
                "overall": {
                    "total_score": int,
                    "passed": bool
                }
            }
        """
        # Load rubric structure
        rubric = load_activity_rubric(activity_id)
        if not rubric:
            return {
                "categories": [],
                "overall": {"total_score": 0, "passed": True}
            }

        # Build transcript
        transcript = CategoryRubricEvaluator.build_transcript(messages)

        # Prepare OpenAI request
        key = get_openai_key()
        model_name = get_openai_model()

        system_prompt = (
            "You are an examiner. Grade the DOCTOR against the rubric below.\n"
            "Score each subcriterion: 0=not addressed, 1=partly/superficial, 2=fully addressed.\n"
            "Use ONLY the DOCTOR messages as evidence. Cite message indices from the transcript.\n"
            "If a subcriterion was not addressed, suggest a short, natural rewrite the DOCTOR could say.\n"
            "Output strictly JSON following the given schema."
        )

        schema_hint = {
            "categories": [
                {
                    "category_id": "int",
                    "name": "string",
                    "score": "int",
                    "passed": "bool",
                    "criteria": [
                        {
                            "subcategory_id": "int",
                            "name": "string",
                            "score": "int",
                            "evidence": {
                                "message_indices": ["int"],
                                "quotes": ["string"]
                            },
                            "rewrite_if_missing": "string"
                        }
                    ]
                }
            ],
            "overall": {"total_score": "int", "passed": "bool"}
        }

        user_msg = (
            "RUBRIC (JSON):\n"
            + json.dumps(rubric, ensure_ascii=False, indent=2)
            + "\n\nTRANSCRIPT (indexed):\n"
            + transcript
            + "\n\nReturn JSON shaped like:\n"
            + json.dumps(schema_hint, ensure_ascii=False)
        )

        # Call OpenAI
        try:
            response = requests.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": model_name,
                    "temperature": 0.1,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_msg}
                    ],
                    "response_format": {"type": "json_object"},
                },
                timeout=90
            )
            response.raise_for_status()

            content = response.json()["choices"][0]["message"]["content"]
            data = json.loads(content)

        except Exception as e:
            logger.error(f"Rubric evaluation failed: {e}")
            return {
                "categories": [],
                "overall": {"total_score": 0, "passed": False}
            }

        # Normalize and validate response structure
        return CategoryRubricEvaluator._normalize_response(data, rubric)

    @staticmethod
    def _normalize_response(data: Dict, rubric: List[Dict]) -> Dict[str, Any]:
        """
        Normalize AI response to ensure all categories/subcategories are present.
        """
        out_categories = []
        by_cat = {
            c["category_id"]: c
            for c in data.get("categories", [])
            if isinstance(c, dict) and "category_id" in c
        }

        total_score = 0

        for cat in rubric:
            picked = by_cat.get(cat["category_id"], {})
            crit_in = picked.get("criteria", []) if isinstance(picked.get("criteria", []), list) else []

            # Map subcriteria by ID
            by_sub = {
                x.get("subcategory_id"): x
                for x in crit_in
                if isinstance(x, dict)
            }

            crit_out = []
            cat_score = 0

            for sub in cat["criteria"]:
                item = by_sub.get(sub["subcategory_id"], {})
                score = item.get("score", 0)
                score = int(score) if isinstance(score, int) else 0
                cat_score += score

                crit_out.append({
                    "subcategory_id": sub["subcategory_id"],
                    "name": sub["name"],
                    "score": score,
                    "evidence": {
                        "message_indices": item.get("evidence", {}).get("message_indices", []),
                        "quotes": item.get("evidence", {}).get("quotes", []),
                    },
                    "rewrite_if_missing": item.get("rewrite_if_missing", ""),
                })

            required = cat.get("required_to_pass", 0)
            passed = bool(cat_score >= required) if required else True
            total_score += cat_score

            out_categories.append({
                "category_id": cat["category_id"],
                "name": cat["name"],
                "score": cat_score,
                "required_to_pass": required,
                "passed": passed,
                "criteria": crit_out,
            })

        overall = data.get("overall", {})
        overall_out = {
            "total_score": int(overall.get("total_score", total_score)),
            "passed": bool(overall.get("passed", all(c["passed"] for c in out_categories))),
        }

        return {
            "categories": out_categories,
            "overall": overall_out
        }


# ============================================================================
# Simple Rubric Evaluator (Legacy)
# ============================================================================

class SimpleRubricEvaluator:
    """
    Legacy evaluator for scenario-level rubric questions.
    Simple 0-2 scoring without evidence citations.
    """

    @staticmethod
    def build_transcript(messages: List[Dict], max_turns: int = 30, max_chars: int = 8000) -> str:
        """Build simple transcript for evaluation."""
        lines = []
        recent_messages = messages[-max_turns:]

        for msg in recent_messages:
            role = (msg.get("role") or "").strip()
            text = (msg.get("message") or msg.get("content") or "").strip()
            if text:
                lines.append(f"{role}: {text}")

        transcript = "\n".join(lines)

        if len(transcript) > max_chars:
            transcript = transcript[-max_chars:]

        return transcript

    @staticmethod
    def evaluate(scenario_id: int, messages: List[Dict]) -> Dict[str, Any]:
        """
        Evaluate conversation against scenario rubric questions.

        Args:
            scenario_id: Scenario ID
            messages: List of conversation messages

        Returns:
            {
                "evaluations": [
                    {
                        "question": str,
                        "score": int (0-2),
                        "feedback": str
                    },
                    ...
                ]
            }
        """
        from apps.scenarios.models import AssistantScenario

        # Load scenario and rubric questions
        try:
            scenario = AssistantScenario.objects.prefetch_related('rubric_questions').get(id=scenario_id)
        except AssistantScenario.DoesNotExist:
            return {"evaluations": []}

        rubric_questions = [
            (rq.question or "").strip()
            for rq in scenario.rubric_questions.all()
            if (rq.question or "").strip()
        ]

        if not rubric_questions:
            return {"evaluations": []}

        # Build transcript
        transcript = SimpleRubricEvaluator.build_transcript(messages)

        # Prepare OpenAI request
        key = get_openai_key()
        model_name = get_openai_model()

        system_prompt = (
            "You are an examiner. Score the DOCTOR's performance against the rubric.\n"
            "Scoring:\n"
            "- 0 = Not addressed\n"
            "- 1 = Partly addressed / superficial\n"
            "- 2 = Fully addressed / appropriate\n\n"
            "Output ONLY JSON with the key 'evaluations'."
        )

        rubrics_block = "\n".join(f"{i+1}. {q}" for i, q in enumerate(rubric_questions))
        user_msg = (
            f"RUBRIC QUESTIONS:\n{rubrics_block}\n\n"
            f"TRANSCRIPT (patient↔doctor):\n{transcript}\n\n"
            "Return JSON like:\n"
            '{"evaluations":[{"question":"...","score":0,"feedback":"..."}]}'
        )

        # Call OpenAI
        try:
            response = requests.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": model_name,
                    "temperature": 0.2,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_msg}
                    ],
                    "response_format": {"type": "json_object"},
                },
                timeout=60
            )
            response.raise_for_status()

            content = response.json()["choices"][0]["message"]["content"]
            data = json.loads(content)

            return {"evaluations": data.get("evaluations", [])}

        except Exception as e:
            logger.error(f"Simple rubric evaluation failed: {e}")
            return {"evaluations": []}
