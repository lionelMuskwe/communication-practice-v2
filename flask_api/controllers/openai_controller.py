from flask import Blueprint, request, jsonify
from app import db, logger
from models.user import (
    RubricQuestion,
    AssistantScenario,
    Tags,
    Activity,
    Category,
    SubCategory,
)
from utils import token_required
import openai, os, requests
from pathlib import Path

# ──────────────────────────────────────────────────────────────
#  Load OpenAI credentials (env-var first, then Docker secret)
# ──────────────────────────────────────────────────────────────
def _read_secret_file(name: str) -> str | None:
    p = Path(f"/run/secrets/{name.lower()}")
    try:
        return p.read_text(encoding="utf-8").strip()
    except FileNotFoundError:
        return None


if not openai.api_key:
    openai.api_key = os.getenv("OPENAI_KEY") or _read_secret_file("openai_key")

if not getattr(openai, "model", None):
    openai.model = os.getenv("OPENAI_MODEL") or _read_secret_file("openai_model")

model_tuned = os.getenv("OPENAI_MODEL_TUNED") or _read_secret_file(
    "openai_model_tuned"
)
# ──────────────────────────────────────────────────────────────

openai_assistant_bp = Blueprint("openai_assistant_bp", __name__)  #  ← blueprint first


# ╭───────────────────────────────  ROUTES  ─────────────────────────────────╮
@openai_assistant_bp.route(
    "/scenarios/<int:scenario_id>/create_assistant", methods=["POST"]
)
@token_required
def create_assistant(current_user, scenario_id):
    scenario = AssistantScenario.query.get(scenario_id)
    if not scenario:
        return jsonify({"message": "Scenario not found"}), 404
    try:
        headers = {
            "Authorization": f"Bearer {openai.api_key}",
            "Content-Type": "application/json",
            "OpenAI-Beta": "assistants=v2",
        }
        payload = {
            "name": scenario.scenario_text,
            "instructions": scenario.additional_instructions,
            "model": openai.model,
        }
        r = requests.post(
            "https://api.openai.com/v1/assistants", headers=headers, json=payload
        )
        if r.status_code != 201:
            return (
                jsonify({"message": "Failed to create assistant", "details": r.json()}),
                r.status_code,
            )
        return jsonify({"assistant_id": r.json()["id"]}), 200
    except Exception as e:
        logger.error(f"Assistant creation failed: {e}")
        return jsonify({"message": str(e)}), 500


@openai_assistant_bp.route("/create_thread", methods=["POST"])
@token_required
def create_thread(current_user):
    try:
        headers = {
            "Authorization": f"Bearer {openai.api_key}",
            "Content-Type": "application/json",
            "OpenAI-Beta": "assistants=v2",
        }
        r = requests.post("https://api.openai.com/v1/threads", headers=headers, json={})
        if r.status_code not in (200, 201):
            return (
                jsonify({"message": "Failed to create thread", "details": r.json()}),
                500,
            )
        return jsonify({"thread_id": r.json()["id"]}), 200
    except Exception as e:
        logger.error(f"Thread creation failed: {e}")
        return jsonify({"message": str(e)}), 500


@openai_assistant_bp.route("/threads/send_message", methods=["POST"])
@token_required
def send_message(current_user):
    data = request.get_json()
    thread_id, role, content = (
        data.get("thread_id"),
        data.get("role"),
        data.get("content"),
    )
    if not thread_id or not role or not content:
        return jsonify({"message": "Missing parameters"}), 400
    try:
        headers = {
            "Authorization": f"Bearer {openai.api_key}",
            "Content-Type": "application/json",
            "OpenAI-Beta": "assistants=v2",
        }
        r = requests.post(
            f"https://api.openai.com/v1/threads/{thread_id}/messages",
            headers=headers,
            json={"role": role, "content": content},
        )
        if r.status_code not in (200, 201):
            return (
                jsonify({"message": "Failed to send message", "details": r.json()}),
                r.status_code,
            )
        return jsonify(r.json()), 200
    except Exception as e:
        logger.error(f"Message send failed: {e}")
        return jsonify({"message": str(e)}), 500


@openai_assistant_bp.route("/threads/run", methods=["POST"])
@token_required
def run_thread(current_user):
    data = request.get_json()
    thread_id, scenario_id = data.get("thread_id"), data.get("assistant_id")
    scenario = AssistantScenario.query.get(scenario_id)
    if not scenario or not scenario.openid:
        return jsonify({"message": "Assistant not found"}), 404
    try:
        headers = {
            "Authorization": f"Bearer {openai.api_key}",
            "Content-Type": "application/json",
            "OpenAI-Beta": "assistants=v2",
        }
        payload = {"assistant_id": scenario.openid, "model": model_tuned}
        r = requests.post(
            f"https://api.openai.com/v1/threads/{thread_id}/runs",
            headers=headers,
            json=payload,
        )
        if r.status_code not in (200, 201):
            return (
                jsonify({"message": "Run failed", "details": r.json()}),
                r.status_code,
            )
        return jsonify(r.json()), 200
    except Exception as e:
        logger.error(f"Run failed: {e}")
        return jsonify({"message": str(e)}), 500


@openai_assistant_bp.route("/threads/get_all_messages", methods=["POST"])
@token_required
def get_all_messages(current_user):
    data = request.get_json()
    thread_id = data.get("thread_id")
    if not thread_id:
        return jsonify({"message": "Thread ID required"}), 400
    try:
        headers = {
            "Authorization": f"Bearer {openai.api_key}",
            "Content-Type": "application/json",
            "OpenAI-Beta": "assistants=v2",
        }
        r = requests.get(
            f"https://api.openai.com/v1/threads/{thread_id}/messages", headers=headers
        )
        if r.status_code not in (200, 201):
            return (
                jsonify({"message": "Failed to fetch messages", "details": r.json()}),
                r.status_code,
            )
        parsed = []
        for m in r.json().get("data", []):
            for c in m.get("content", []):
                if c.get("type") == "text":
                    parsed.append(
                        {
                            "role": m.get("role"),
                            "message": c["text"]["value"],
                            "created_at": m.get("created_at"),
                        }
                    )
        return jsonify(parsed), 200
    except Exception as e:
        logger.error(f"Get messages failed: {e}")
        return jsonify({"message": str(e)}), 500


@openai_assistant_bp.route(
    "/scenarios/<int:activity_id>/rubric_responses", methods=["POST"]
)
@token_required
def evaluate_activity(current_user, activity_id):
    data = request.get_json()
    messages = data.get("messages")
    if not messages:
        return jsonify({"message": "Messages required"}), 400
    activity = Activity.query.get(activity_id)
    if not activity:
        return jsonify({"message": "Activity not found"}), 404

    reversed_msgs = [
        {"role": "system" if m["role"] == "assistant" else "user", "content": m["message"]}
        for m in reversed(messages)
    ]
    reversed_msgs.append(
        {"role": "system", "content": "You are evaluating a doctor."}
    )

    openai.model = "gpt-4o-mini-2024-07-18"
    results = []
    for cat in activity.categories:
        pass_cnt, subs = 0, []
        for sub in cat.subcategories:
            prompt = f"{sub.name}\nMarking: {sub.marking_instructions}"
            try:
                r = requests.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {openai.api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": openai.model,
                        "messages": reversed_msgs + [{"role": "user", "content": prompt}],
                    },
                )
                answer = r.json()["choices"][0]["message"]["content"]
                ok = "yes" in answer.lower() or "fulfilled" in answer.lower()
                pass_cnt += ok
                subs.append(
                    {
                        "question": sub.name,
                        "instruction": sub.marking_instructions,
                        "response": answer,
                        "passed": ok,
                    }
                )
            except Exception as e:
                subs.append(
                    {
                        "question": sub.name,
                        "instruction": sub.marking_instructions,
                        "response": f"Error: {e}",
                        "passed": False,
                    }
                )
        results.append(
            {
                "category": cat.name,
                "required_to_pass": cat.total_required_to_pass,
                "passed_count": pass_cnt,
                "passed": pass_cnt >= cat.total_required_to_pass,
                "subcategories": subs,
            }
        )
    return jsonify({"evaluations": results}), 200


@openai_assistant_bp.route("/threads/check_run_status", methods=["POST"])
@token_required
def check_run_status(current_user):
    data = request.get_json()
    thread_id, run_id = data.get("thread_id"), data.get("run_id")
    if not thread_id or not run_id:
        return jsonify({"message": "Missing thread_id or run_id"}), 400
    try:
        headers = {
            "Authorization": f"Bearer {openai.api_key}",
            "Content-Type": "application/json",
            "OpenAI-Beta": "assistants=v2",
        }
        r = requests.get(
            f"https://api.openai.com/v1/threads/{thread_id}/runs/{run_id}",
            headers=headers,
        )
        if r.status_code not in (200, 201):
            return (
                jsonify({"message": "Failed to check run status", "details": r.json()}),
                r.status_code,
            )
        return jsonify({"status": r.json().get("status")}), 200
    except Exception as e:
        logger.error(f"Check run status failed: {e}")
        return jsonify({"message": f"Error: {e}"}), 500


@openai_assistant_bp.route("/scenarios/<int:scenario_id>/tag_evaluation", methods=["POST"])
@token_required
def tag_evaluation(current_user, scenario_id):
    return jsonify({"message": "Tag evaluation not implemented"}), 501
