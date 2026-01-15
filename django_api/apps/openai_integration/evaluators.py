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


# ============================================================================
# Rubric Pack Evaluator (New System)
# ============================================================================

class RubricPackEvaluator:
    """
    Evaluator using the new RubricPack system.
    Supports Framework -> Section -> Criterion hierarchy with templates and packs.
    Provides evidence citations and GMC/MLA mapping summaries.
    """

    @staticmethod
    def load_activity_rubric(activity_id: int) -> Dict[str, Any]:
        """
        Load rubric structure from activity's rubric pack.

        Returns structure for AI prompt:
        {
            "pack_id": int,
            "pack_name": str,
            "templates": [
                {
                    "template_id": int,
                    "name": str,
                    "track_type": str,
                    "framework": {"code": str, "name": str},
                    "sections": [
                        {
                            "section_id": int,
                            "name": str,
                            "code": str,
                            "criteria": [
                                {
                                    "criterion_id": int,
                                    "text": str,
                                    "marking_instructions": str,
                                    "weight": float,
                                    "is_required": bool
                                }
                            ]
                        }
                    ]
                }
            ]
        }
        """
        from apps.activities.models import Activity

        try:
            activity = Activity.objects.select_related(
                'rubric_pack'
            ).get(id=activity_id)
        except Activity.DoesNotExist:
            return {}

        if not activity.rubric_pack:
            return {}

        pack = activity.rubric_pack
        include_generic = not activity.exclude_generic_comms

        # Build structure grouped by template and section
        templates_data = []

        entries = pack.entries.select_related(
            'template__framework'
        ).prefetch_related(
            'template__template_criteria__criterion__section'
        ).order_by('ordering')

        for entry in entries:
            template = entry.template
            if template.status != 'published':
                continue
            if not include_generic and template.track_type == 'generic_comms':
                continue

            # Group criteria by section
            sections_map = {}
            for tc in template.template_criteria.select_related(
                'criterion__section'
            ).order_by('ordering'):
                section = tc.criterion.section
                if section.id not in sections_map:
                    sections_map[section.id] = {
                        'section_id': section.id,
                        'name': section.name,
                        'code': section.code,
                        'ordering': section.ordering,
                        'criteria': []
                    }
                sections_map[section.id]['criteria'].append({
                    'criterion_id': tc.criterion.id,
                    'text': tc.criterion.criterion_text,
                    'marking_instructions': tc.criterion.marking_instructions,
                    'weight': float(tc.weight_override or tc.criterion.weight),
                    'is_required': tc.criterion.is_required
                })

            # Sort sections by ordering
            sorted_sections = sorted(sections_map.values(), key=lambda s: s['ordering'])
            for s in sorted_sections:
                del s['ordering']

            templates_data.append({
                'template_id': template.id,
                'name': template.display_label,
                'internal_code': template.internal_code,
                'track_type': template.track_type,
                'framework': {
                    'code': template.framework.code,
                    'name': template.framework.name
                },
                'sections': sorted_sections
            })

        return {
            'pack_id': pack.id,
            'pack_name': pack.name,
            'templates': templates_data
        }

    @staticmethod
    def evaluate(
        activity_id: int,
        messages: List[Dict],
        scenario=None
    ) -> Dict[str, Any]:
        """
        Evaluate conversation against activity's rubric pack.

        Returns new v2.0 structure:
        {
            "version": "2.0",
            "pack": {"id": int, "name": str},
            "templates": [
                {
                    "template_id": int,
                    "name": str,
                    "track_type": str,
                    "framework": {"code": str, "name": str},
                    "sections": [
                        {
                            "section_id": int,
                            "name": str,
                            "code": str,
                            "score": int,
                            "max_score": int,
                            "criteria": [
                                {
                                    "criterion_id": int,
                                    "text": str,
                                    "is_required": bool,
                                    "weight": float,
                                    "score": int (0-2),
                                    "evidence": {
                                        "message_indices": [int],
                                        "quotes": [str]
                                    },
                                    "rewrite_if_missing": str|null
                                }
                            ]
                        }
                    ],
                    "template_score": int,
                    "template_max_score": int
                }
            ],
            "overall": {
                "total_score": int,
                "max_score": int,
                "percentage": float,
                "passed": bool,
                "required_criteria_met": bool
            }
        }
        """
        rubric = RubricPackEvaluator.load_activity_rubric(activity_id)
        if not rubric or not rubric.get('templates'):
            return {
                "version": "2.0",
                "pack": None,
                "templates": [],
                "overall": {
                    "total_score": 0,
                    "max_score": 0,
                    "percentage": 0.0,
                    "passed": True,
                    "required_criteria_met": True
                }
            }

        # Use existing build_transcript method
        transcript = CategoryRubricEvaluator.build_transcript(messages)

        # Prepare OpenAI request
        key = get_openai_key()
        model_name = get_openai_model()

        system_prompt = """You are an examiner evaluating a medical communication conversation.
Grade the DOCTOR's communication against the provided rubric criteria.

Scoring for each criterion:
- 0 = Not addressed at all
- 1 = Partially addressed or superficial
- 2 = Fully and appropriately addressed

Instructions:
1. Use ONLY the DOCTOR's messages as evidence
2. Cite specific message indices from the transcript
3. Quote the relevant text as evidence
4. If a criterion was not met (score 0 or 1), suggest a brief, natural phrase the doctor could have said
5. Pay special attention to criteria marked as required - these must be addressed for passing

Output strictly JSON following the provided structure."""

        # Simplified schema hint for the AI
        schema_hint = {
            "templates": [
                {
                    "template_id": "int",
                    "sections": [
                        {
                            "section_id": "int",
                            "criteria": [
                                {
                                    "criterion_id": "int",
                                    "score": "int (0-2)",
                                    "evidence": {
                                        "message_indices": ["int"],
                                        "quotes": ["string"]
                                    },
                                    "rewrite_if_missing": "string or null"
                                }
                            ]
                        }
                    ]
                }
            ]
        }

        user_msg = (
            "RUBRIC STRUCTURE:\n"
            + json.dumps(rubric, ensure_ascii=False, indent=2)
            + "\n\nTRANSCRIPT (indexed, [n] SPEAKER: text):\n"
            + transcript
            + "\n\nEvaluate each criterion and return JSON with this structure:\n"
            + json.dumps(schema_hint, ensure_ascii=False)
        )

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
            logger.error(f"Rubric pack evaluation failed: {e}")
            return {
                "version": "2.0",
                "pack": {"id": rubric["pack_id"], "name": rubric["pack_name"]},
                "templates": [],
                "overall": {
                    "total_score": 0,
                    "max_score": 0,
                    "percentage": 0.0,
                    "passed": False,
                    "required_criteria_met": False
                }
            }

        return RubricPackEvaluator._normalize_response(data, rubric)

    @staticmethod
    def _normalize_response(data: Dict, rubric: Dict) -> Dict[str, Any]:
        """
        Normalize AI response and calculate aggregate scores.
        Ensures all templates/sections/criteria are present with proper structure.
        """
        # Build lookup from AI response
        ai_templates = {}
        for t in data.get("templates", []):
            if isinstance(t, dict) and "template_id" in t:
                ai_sections = {}
                for s in t.get("sections", []):
                    if isinstance(s, dict) and "section_id" in s:
                        ai_criteria = {}
                        for c in s.get("criteria", []):
                            if isinstance(c, dict) and "criterion_id" in c:
                                ai_criteria[c["criterion_id"]] = c
                        ai_sections[s["section_id"]] = ai_criteria
                ai_templates[t["template_id"]] = ai_sections

        # Build normalized output
        out_templates = []
        total_score = 0
        max_score = 0
        all_required_met = True

        for template_data in rubric.get("templates", []):
            template_id = template_data["template_id"]
            ai_template = ai_templates.get(template_id, {})

            out_sections = []
            template_score = 0
            template_max = 0

            for section_data in template_data.get("sections", []):
                section_id = section_data["section_id"]
                ai_section = ai_template.get(section_id, {})

                out_criteria = []
                section_score = 0
                section_max = 0

                for crit_data in section_data.get("criteria", []):
                    criterion_id = crit_data["criterion_id"]
                    ai_crit = ai_section.get(criterion_id, {})

                    score = ai_crit.get("score", 0)
                    score = int(score) if isinstance(score, (int, float)) else 0
                    score = max(0, min(2, score))  # Clamp to 0-2

                    weight = crit_data.get("weight", 1.0)
                    is_required = crit_data.get("is_required", False)

                    # Check required criteria
                    if is_required and score < 2:
                        all_required_met = False

                    weighted_max = 2 * weight
                    section_score += score * weight
                    section_max += weighted_max

                    evidence = ai_crit.get("evidence", {})
                    out_criteria.append({
                        "criterion_id": criterion_id,
                        "text": crit_data["text"],
                        "is_required": is_required,
                        "weight": weight,
                        "score": score,
                        "evidence": {
                            "message_indices": evidence.get("message_indices", []),
                            "quotes": evidence.get("quotes", [])
                        },
                        "rewrite_if_missing": ai_crit.get("rewrite_if_missing") if score < 2 else None
                    })

                out_sections.append({
                    "section_id": section_id,
                    "name": section_data["name"],
                    "code": section_data["code"],
                    "score": int(section_score),
                    "max_score": int(section_max),
                    "criteria": out_criteria
                })

                template_score += section_score
                template_max += section_max

            out_templates.append({
                "template_id": template_id,
                "name": template_data["name"],
                "internal_code": template_data.get("internal_code", ""),
                "track_type": template_data["track_type"],
                "framework": template_data["framework"],
                "sections": out_sections,
                "template_score": int(template_score),
                "template_max_score": int(template_max)
            })

            total_score += template_score
            max_score += template_max

        percentage = (total_score / max_score * 100) if max_score > 0 else 0.0
        passed = percentage >= 60 and all_required_met  # 60% threshold for passing

        return {
            "version": "2.0",
            "pack": {
                "id": rubric["pack_id"],
                "name": rubric["pack_name"]
            },
            "templates": out_templates,
            "overall": {
                "total_score": int(total_score),
                "max_score": int(max_score),
                "percentage": round(percentage, 1),
                "passed": passed,
                "required_criteria_met": all_required_met
            }
        }


def get_evaluator_for_activity(activity):
    """
    Determine which evaluator to use for an activity.
    Uses RubricPackEvaluator if activity has rubric_pack, otherwise CategoryRubricEvaluator.
    """
    if hasattr(activity, 'rubric_pack') and activity.rubric_pack is not None:
        return RubricPackEvaluator
    return CategoryRubricEvaluator
