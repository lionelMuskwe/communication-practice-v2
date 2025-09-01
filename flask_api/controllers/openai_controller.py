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
# Routes
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
    """Return [{ role, message, created_at }] for UI."""
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
    Body accepts:
      - thread_id (required)
      - scenario_id (preferred) OR assistant_id (legacy name for scenario id)
      - activity_id (optional but recommended)
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
    return jsonify({"activity_id": activity_id, "scenario_id": scenario_id, "context": ctx, "length": len(ctx)}), 200
