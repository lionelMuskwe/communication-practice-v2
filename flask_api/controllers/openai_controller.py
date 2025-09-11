from flask import Blueprint, request, jsonify, current_app
from app import db, logger
from models.user import (
    RubricQuestion,
    AssistantScenario,
    Tags,
    Activity,
    Category,
    SubCategory,
    User,
)
from utils import token_required
from pathlib import Path
import os
import requests
import json


openai_assistant_bp = Blueprint("openai_assistant_bp", __name__)

# ──────────────────────────────────────────────────────────────
# Secrets & config helpers
# ──────────────────────────────────────────────────────────────
def _read_secret_file(name: str) -> str | None:
    p = Path(f"/run/secrets/{name.lower()}")
    try:
        return p.read_text(encoding="utf-8").strip()
    except FileNotFoundError:
        return None

def _get_openai_key() -> str:
    return (
        os.getenv("OPENAI_KEY")
        or _read_secret_file("openai_key")
        or ""
    )

def _get_openai_model_default() -> str:
    # Accept both mixed-case and all-caps envs for robustness
    return (
        _read_secret_file("openai_model")
        or os.getenv("OPENAI_MODEL")
        or os.getenv("OPENAI_Model")
        or "gpt-4o-mini-2024-07-18"
    )

def _headers_json():
    """
    Headers for Assistants v2 (the OpenAI-Beta header is REQUIRED).
    """
    key = _get_openai_key()
    if not key:
        raise RuntimeError("OPENAI_KEY is not configured")
    return {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Accept": "application/json",
        "OpenAI-Beta": "assistants=v2",
    }

OPENAI_API = "https://api.openai.com/v1"

# ──────────────────────────────────────────────────────────────
# Context builder (this is the critical bit)
# ──────────────────────────────────────────────────────────────
def _text(v) -> str:
    return (v or "").strip()

def build_full_context(activity: Activity | None, scenario: AssistantScenario | None) -> str:
    """Compose a deterministic, complete context string for the run."""
    parts: list[str] = []

    # Activity block
    parts.append("=== ACTIVITY ===")
    if activity:
        a_title = _text(getattr(activity, "title", "") or getattr(activity, "name", ""))
        a_prebrief = _text(getattr(activity, "pre_brief", "") or getattr(activity, "prebrief", ""))
        if a_title:
            parts.append(f"Title: {a_title}")
        if a_prebrief:
            parts.append(f"Pre-brief: {a_prebrief}")

        # Categories (+ subcategories if present)
        cats = []
        for c in getattr(activity, "categories", []) or []:
            cname = _text(getattr(c, "name", ""))
            subs = []
            for s in getattr(c, "subcategories", []) or []:
                sname = _text(getattr(s, "name", ""))
                if sname:
                    subs.append(sname)
            cats.append(cname + (f" — {', '.join(subs)}" if subs else ""))
        if cats:
            parts.append("Categories: " + "; ".join([c for c in cats if c]))

    # Scenario block
    parts.append("\n=== CHARACTER / SCENARIO ===")
    if scenario:
        s_name = _text(getattr(scenario, "name", ""))
        s_role = _text(getattr(scenario, "role", ""))
        s_text = _text(getattr(scenario, "scenario_text", ""))
        s_additional = _text(getattr(scenario, "additional_instructions", ""))
        s_comm = _text(getattr(scenario, "communication_preferences", ""))
        if s_name:
            parts.append(f"Name: {s_name}")
        if s_role:
            parts.append(f"Role: {s_role}")
        if s_text:
            parts.append("Configuration:\n" + s_text)
        if s_comm:
            parts.append("Communication Preferences:\n" + s_comm)
        if s_additional:
            parts.append("Additional Instructions:\n" + s_additional)

        # Tags
        tag_values = []
        for t in getattr(scenario, "tags", []) or []:
            tag_values.append(_text(getattr(t, "tag", "")))
        if tag_values:
            parts.append("Tags: " + ", ".join([t for t in tag_values if t]))

        # Rubrics
        rubric_items = []
        for rq in getattr(scenario, "rubrics", []) or []:
            rubric_items.append(_text(getattr(rq, "question", "")))
        if rubric_items:
            parts.append("\n=== RUBRIC ===")
            for i, q in enumerate(rubric_items, 1):
                if q:
                    parts.append(f"{i}. {q}")

    # Behavioural nudge to reduce hallucinations
    parts.append("\n=== INSTRUCTIONS TO MODEL ===")
    parts.append(
        "Use all details above. If any information is missing or ambiguous, ask a brief clarifying question before continuing. "
        "Prefer factual, concise replies. If you do not know, say so and suggest what data is needed."
    )

    return "\n".join(parts)

# ──────────────────────────────────────────────────────────────
# Thread/message/run helpers (Assistants API)
# ──────────────────────────────────────────────────────────────
def _create_thread() -> dict:
    r = requests.post(f"{OPENAI_API}/threads", headers=_headers_json(), json={})
    r.raise_for_status()
    return r.json()

def _create_message(thread_id: str, role: str, content: str) -> dict:
    body = {"role": role, "content": content}
    r = requests.post(f"{OPENAI_API}/threads/{thread_id}/messages", headers=_headers_json(), json=body)
    r.raise_for_status()
    return r.json()

def _list_messages(thread_id: str) -> dict:
    r = requests.get(f"{OPENAI_API}/threads/{thread_id}/messages", headers=_headers_json())
    r.raise_for_status()
    return r.json()

def _create_run(thread_id: str, assistant_id: str, additional_instructions: str, model_override: str | None = None) -> dict:
    body = {
        "assistant_id": assistant_id,
        "additional_instructions": additional_instructions,
    }
    if model_override:
        body["model"] = model_override
    r = requests.post(f"{OPENAI_API}/threads/{thread_id}/runs", headers=_headers_json(), json=body)
    r.raise_for_status()
    return r.json()

def _get_run(thread_id: str, run_id: str) -> dict:
    r = requests.get(f"{OPENAI_API}/threads/{thread_id}/runs/{run_id}", headers=_headers_json())
    r.raise_for_status()
    return r.json()

def _http_error_response(http_err: requests.HTTPError):
    status = getattr(http_err.response, "status_code", 502)
    try:
        details = http_err.response.json()
    except Exception:
        details = {"text": getattr(http_err.response, "text", str(http_err))}
    return jsonify({"message": "OpenAI error", "details": details}), status

# ──────────────────────────────────────────────────────────────
# Threads & runs (Assistants API) – REST endpoints
# ──────────────────────────────────────────────────────────────
@openai_assistant_bp.route("/threads", methods=["POST"])
@token_required
def create_thread(current_user):
    try:
        data = _create_thread()
        return jsonify({"thread_id": data.get("id")}), 201
    except requests.HTTPError as http_err:
        return _http_error_response(http_err)
    except RuntimeError as e:
        current_app.logger.error(f"Create thread failed: {e}")
        return jsonify({"message": str(e)}), 500
    except Exception as e:
        logger.exception(f"Create thread failed: {e}")
        return jsonify({"message": "Internal server error"}), 500

@openai_assistant_bp.route("/threads/<thread_id>/messages", methods=["POST"])
@token_required
def add_message(current_user, thread_id: str):
    try:
        payload = request.get_json(force=True) or {}
        role = payload.get("role", "user")
        content = payload.get("content", "")
        data = _create_message(thread_id, role, content)
        return jsonify(data), 201
    except requests.HTTPError as http_err:
        return _http_error_response(http_err)
    except Exception as e:
        logger.error(f"Add message failed: {e}")
        return jsonify({"message": "Internal server error"}), 500

@openai_assistant_bp.route("/threads/<thread_id>/messages", methods=["GET"])
@token_required
def list_messages(current_user, thread_id: str):
    """Return [{ role, message, created_at }] for UI (oldest-first)."""
    try:
        data = _list_messages(thread_id)
        items = []
        # OpenAI returns newest-first; normalise to oldest-first for the UI
        for m in reversed(data.get("data", [])):
            role = m.get("role")
            ts = m.get("created_at")
            text = ""
            for block in m.get("content", []):
                if block.get("type") == "text":
                    text += block["text"]["value"]
            created_at = ts * 1000 if isinstance(ts, int) else ts
            items.append({"role": role, "message": text, "created_at": created_at})
        return jsonify(items), 200
    except requests.HTTPError as http_err:
        return _http_error_response(http_err)
    except Exception as e:
        logger.exception(f"List messages failed: {e}")
        return jsonify({"message": "Internal server error"}), 500

@openai_assistant_bp.route("/threads/run", methods=["POST"])
@token_required
def run_thread(current_user):
    """
    Body:
      - thread_id (required)
      - scenario_id (preferred) OR assistant_id (legacy name for scenario id)
      - activity_id (optional)
      - model (optional override)
    """
    try:
        body = request.get_json(force=True) or {}
        thread_id = body.get("thread_id")
        if not thread_id:
            return jsonify({"message": "thread_id is required"}), 400

        scenario_id = body.get("scenario_id") or body.get("assistant_id")
        activity_id = body.get("activity_id")
        model_override = body.get("model")

        scenario: AssistantScenario | None = None
        activity: Activity | None = None

        if activity_id:
            activity = Activity.query.get(activity_id)
        if scenario_id:
            scenario = AssistantScenario.query.get(scenario_id)
        elif activity and getattr(activity, "character_id", None):
            scenario = AssistantScenario.query.get(activity.character_id)

        if not scenario:
            return jsonify({"message": "Scenario not found (provide scenario_id or activity_id with character)"}), 404

        assistant_id = getattr(scenario, "openid", None)
        if not assistant_id:
            return jsonify({"message": "Scenario has no assistant 'openid' configured"}), 400

        context = build_full_context(activity, scenario)

        data = _create_run(
            thread_id=thread_id,
            assistant_id=assistant_id,
            additional_instructions=context,
            model_override=model_override or _get_openai_model_default(),
        )
        return jsonify({"run_id": data.get("id"), "status": data.get("status")}), 201

    except requests.HTTPError as http_err:
        return _http_error_response(http_err)
    except Exception as e:
        logger.error(f"Run thread failed: {e}")
        return jsonify({"message": "Internal server error"}), 500

@openai_assistant_bp.route("/runs/<run_id>/status", methods=["GET"])
@token_required
def run_status(current_user, run_id: str):
    thread_id = request.args.get("thread_id")
    if not thread_id:
        return jsonify({"message": "thread_id is required"}), 400
    try:
        data = _get_run(thread_id, run_id)
        return jsonify({"status": data.get("status")}), 200
    except requests.HTTPError as http_err:
        return _http_error_response(http_err)
    except Exception as e:
        logger.error(f"Check run status failed: {e}")
        return jsonify({"message": "Internal server error"}), 500

# ──────────────────────────────────────────────────────────────
# Rubric helpers & endpoints
# ──────────────────────────────────────────────────────────────

# --- helper to load activity→categories→subcategories -----------------
def _load_activity_rubric(activity_id: int):
    """
    Load rubric as:
    [
      {
        "category_id": <int>,
        "name": <str>,
        "required_to_pass": <int|None>,
        "criteria": [
           {"subcategory_id": <int>, "name": <str>, "marking_instructions": <str>}
        ]
      }, ...
    ]
    Works whether you have an Activity.categories relationship OR only an
    association table named 'activity_categories'.
    """
    # 1) Try to use the relationship first (most robust)
    act = Activity.query.get(activity_id)
    assigned = []
    if act is not None and hasattr(act, "categories") and act.categories is not None:
        assigned = list(act.categories)

    # 2) Fallback: resolve via association table if relationship is missing/empty
    if not assigned:
        assoc = db.metadata.tables.get("activity_categories")
        if not assoc:
            return []  # neither relationship nor assoc table available
        assigned = (
            db.session.query(Category)
            .join(assoc, assoc.c.category_id == Category.id)
            .filter(assoc.c.activity_id == activity_id)
            .order_by(Category.id)
            .all()
        )

    if not assigned:
        return []

    cat_ids = [c.id for c in assigned]

    # Pull subcriteria per category
    subs = (
        SubCategory.query
        .filter(SubCategory.category_id.in_(cat_ids))
        .order_by(SubCategory.category_id, SubCategory.id)
        .all()
    )

    subs_by_cat: dict[int, list[dict]] = {}
    for s in subs:
        subs_by_cat.setdefault(s.category_id, []).append({
            "subcategory_id": s.id,
            "name": (s.name or "").strip(),
            "marking_instructions": (s.marking_instructions or "").strip(),
        })

    rubric = []
    for c in assigned:
        rubric.append({
            "category_id": c.id,
            "name": (c.name or "").strip(),
            "required_to_pass": getattr(c, "total_required_to_pass", None),
            "criteria": subs_by_cat.get(c.id, []),
        })
    return rubric

# --- NEW: evaluate per activity by categories/subcategories -----------
@openai_assistant_bp.route(
    "/activities/<int:activity_id>/rubric_assessment",
    methods=["POST"],
    endpoint="rubric_assessment_api",
)
@token_required
def rubric_assessment_api(current_user, activity_id: int):
    try:
        body = request.get_json(force=True) or {}
        convo = body.get("messages", [])
        scenario_id = body.get("scenario_id")

        # (optional) find scenario from activity if you want to include name/role in context
        activity = Activity.query.get(activity_id)
        scenario = None
        if scenario_id:
            scenario = AssistantScenario.query.get(scenario_id)
        elif activity and getattr(activity, "character_id", None):
            scenario = AssistantScenario.query.get(activity.character_id)

        # 1) Load rubric from DB (categories + their subcriteria)
        rubric = _load_activity_rubric(activity_id)
        if not rubric:
            return jsonify({"categories": [], "overall": {"total_score": 0, "passed": True}}), 200

        # 2) Build compact transcript with stable indices so the model can cite evidence
        lines = []
        trimmed = (convo or [])[-40:]  # last ~40 turns
        for idx, m in enumerate(trimmed):
            role = (m.get("role") or "").strip()
            who = "DOCTOR" if role == "user" else "PATIENT"
            text = (m.get("message") or m.get("content") or "").strip()
            if text:
                lines.append(f"[{idx}] {who}: {text}")
        transcript = "\n".join(lines)
        if len(transcript) > 12000:
            transcript = transcript[-12000:]

        # 3) Ask OpenAI for JSON back per category/subcriterion with evidence and rewrites
        key = _get_openai_key()
        model_name = _get_openai_model_default()

        system = (
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

        resp = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
            json={
                "model": model_name,
                "temperature": 0.1,
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": user_msg},
                ],
                "response_format": {"type": "json_object"},
            },
            timeout=90,
        )
        resp.raise_for_status()
        content = resp.json()["choices"][0]["message"]["content"]

        try:
            data = json.loads(content)
        except Exception:
            # If the model ever slips, return an empty but well-formed payload
            data = {"categories": [], "overall": {"total_score": 0, "passed": False}}

        # Safety-normalise the shape (ensure all categories returned)
        out_categories = []
        by_cat = {c["category_id"]: c for c in data.get("categories", []) if isinstance(c, dict) and "category_id" in c}
        total = 0
        for c in rubric:
            picked = by_cat.get(c["category_id"], {})
            crit_in = picked.get("criteria", []) if isinstance(picked.get("criteria", []), list) else []
            # map subcriteria by id
            by_sub = {x.get("subcategory_id"): x for x in crit_in if isinstance(x, dict)}
            crit_out = []
            cat_score = 0
            for sub in c["criteria"]:
                item = by_sub.get(sub["subcategory_id"], {})
                s = item.get("score", 0)
                s = int(s) if isinstance(s, int) else 0
                cat_score += s
                crit_out.append({
                    "subcategory_id": sub["subcategory_id"],
                    "name": sub["name"],
                    "score": s,
                    "evidence": {
                        "message_indices": item.get("evidence", {}).get("message_indices", []),
                        "quotes": item.get("evidence", {}).get("quotes", []),
                    },
                    "rewrite_if_missing": item.get("rewrite_if_missing", ""),
                })
            required = c.get("required_to_pass") or 0
            passed = bool(cat_score >= required) if required else True
            total += cat_score
            out_categories.append({
                "category_id": c["category_id"],
                "name": c["name"],
                "score": cat_score,
                "required_to_pass": required,
                "passed": passed,
                "criteria": crit_out,
            })

        overall = data.get("overall") or {}
        overall_out = {
            "total_score": int(overall.get("total_score", total)),
            "passed": bool(overall.get("passed", all(cat["passed"] for cat in out_categories))),
        }

        return jsonify({"categories": out_categories, "overall": overall_out}), 200

    except requests.HTTPError as http_err:
        try:
            return jsonify({"message": "OpenAI error", "details": http_err.response.json()}), http_err.response.status_code
        except Exception:
            return jsonify({"message": f"OpenAI error: {http_err}"}), 500
    except Exception as e:
        logger.exception(f"rubric_assessment_api failed: {e}")
        return jsonify({"message": "Internal server error"}), 500

# ──────────────────────────────────────────────────────────────
# Legacy simple rubric (scenario-level questions)
# ──────────────────────────────────────────────────────────────
@openai_assistant_bp.route(
    "/scenarios/<int:activity_id>/rubric_responses",
    methods=["POST"],
    endpoint="rubric_responses_api"   # unique endpoint name
)
@token_required
def rubric_responses_api(current_user, activity_id: int):
    """
    Body: {
      "messages": [ {role, message, created_at?}, ... ],
      "scenario_id": <optional AssistantScenario.id>
    }
    Uses the activity's linked character (AssistantScenario) to pull rubric questions,
    or the scenario_id from the body, and asks OpenAI to evaluate the transcript.
    Returns { evaluations: [...] }.
    """
    try:
        body = request.get_json(force=True) or {}
        convo = body.get("messages", [])
        scenario_id = body.get("scenario_id")

        # Resolve scenario either from the body or from activity.character_id
        activity: Activity | None = Activity.query.get(activity_id)
        scenario: AssistantScenario | None = None

        if scenario_id:
            scenario = AssistantScenario.query.get(scenario_id)

        if not scenario and activity and getattr(activity, "character_id", None):
            scenario = AssistantScenario.query.get(activity.character_id)

        if not scenario:
            return jsonify({"message": "Scenario not found (provide scenario_id in body or link activity.character_id)"}), 404

        # Pull rubric questions
        rubric_items = []
        for rq in getattr(scenario, "rubrics", []) or []:
            q = (getattr(rq, "question", "") or "").strip()
            if q:
                rubric_items.append(q)

        # If no rubric configured, return empty evaluation gracefully
        if not rubric_items:
            return jsonify({"evaluations": []}), 200

        # Build a compact transcript (oldest -> newest, last ~30 turns, max ~8k chars)
        lines = []
        for m in (convo or [])[-30:]:
            role = (m.get("role") or "").strip()
            text = (m.get("message") or m.get("content") or "").strip()
            if text:
                lines.append(f"{role}: {text}")
        transcript = "\n".join(lines)
        if len(transcript) > 8000:
            transcript = transcript[-8000:]

        # Compose the evaluation instruction
        model_name = _get_openai_model_default()
        key = _get_openai_key()

        system = (
            "You are an examiner. Score the DOCTOR's performance against the rubric.\n"
            "Scoring:\n"
            "- 0 = Not addressed\n"
            "- 1 = Partly addressed / superficial\n"
            "- 2 = Fully addressed / appropriate\n\n"
            "Output ONLY JSON with the key 'evaluations'."
        )
        rubrics_block = "\n".join(f"{i+1}. {q}" for i, q in enumerate(rubric_items))
        user_msg = (
            f"RUBRIC QUESTIONS:\n{rubrics_block}\n\n"
            f"TRANSCRIPT (patient↔doctor):\n{transcript}\n\n"
            "Return JSON like:\n"
            '{"evaluations":[{"question":"...","score":0,"feedback":"..."}]}'
        )

        # Call Chat Completions
        resp = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {key}",
                "Content-Type": "application/json",
            },
            json={
                "model": model_name,
                "temperature": 0.2,
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": user_msg},
                ],
                "response_format": {"type": "json_object"},
            },
            timeout=60,
        )
        resp.raise_for_status()
        content = resp.json()["choices"][0]["message"]["content"]

        try:
            data = json.loads(content)
        except Exception:
            data = {"evaluations": []}

        # Normalise the shape
        evals = data.get("evaluations") or []
        norm = []
        for i, q in enumerate(rubric_items):
            item = evals[i] if i < len(evals) else {}
            norm.append({
                "question": q,
                "score": item.get("score", 0),
                "feedback": item.get("feedback", ""),
            })

        return jsonify({"evaluations": norm}), 200

    except requests.HTTPError as http_err:
        try:
            return jsonify({"message": "OpenAI error", "details": http_err.response.json()}), http_err.response.status_code
        except Exception:
            return jsonify({"message": f"OpenAI error: {http_err}"}), 500
    except Exception as e:
        logger.exception(f"rubric_responses failed: {e}")
        return jsonify({"message": "Internal server error"}), 500

# ──────────────────────────────────────────────────────────────
# Misc utility route
# ──────────────────────────────────────────────────────────────
@openai_assistant_bp.route("/context/preview", methods=["GET"])
@token_required
def preview_context(current_user):
    """Debug: see exactly what we pass to the model."""
    activity_id = request.args.get("activity_id", type=int)
    scenario_id = request.args.get("scenario_id", type=int)

    activity = Activity.query.get(activity_id) if activity_id else None
    scenario = AssistantScenario.query.get(scenario_id) if scenario_id else None
    if activity and not scenario and getattr(activity, "character_id", None):
        scenario = AssistantScenario.query.get(activity.character_id)

    ctx = build_full_context(activity, scenario)
    return jsonify({
        "activity_id": activity_id,
        "scenario_id": scenario_id,
        "context": ctx,
        "length": len(ctx)
    }), 200
