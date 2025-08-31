from flask import Blueprint, request, jsonify
from app import db, logger
from models.user import AssistantScenario, RubricQuestion, Tags
from utils import token_required
import os, openai, requests
from pathlib import Path

# ──────────────────────────────────────────────────────────────
#  Load OpenAI credentials (env var first, then Docker secret)
# ──────────────────────────────────────────────────────────────
def _read_secret_file(name: str) -> str | None:
    p = Path(f"/run/secrets/{name.lower()}")
    try:
        return p.read_text(encoding="utf-8").strip()
    except FileNotFoundError:
        return None

# Set only if still empty (prevents clobbering the value loaded by other modules)
if not openai.api_key:
    openai.api_key = os.getenv("OPENAI_KEY")

if not getattr(openai, "model", None):
    openai.model = os.getenv("OPENAI_MODEL")

# model_tuned is specific to this controller; keep as-is, but use consistent env-name
model_tuned = os.getenv("OPENAI_MODEL_TUNED")

assistant_bp = Blueprint("assistant_bp", __name__)   #  <<< declared before any @assistant_bp.route

# ╭────────────────────────────────────────────────────────╮
# │  Helper functions – original logic, only minor tweaks │
# ╰────────────────────────────────────────────────────────╯
def create_openai_assistant(name, instructions, model):
    try:
        if not openai.api_key:
            return None, "OpenAI API key not set", 500
        headers = {
            "Authorization": f"Bearer {openai.api_key}",
            "Content-Type": "application/json",
            "OpenAI-Beta": "assistants=v2"
        }
        payload = {"name": name, "instructions": instructions, "model": model}
        r = requests.post("https://api.openai.com/v1/assistants",
                          headers=headers, json=payload)
        if r.status_code != 200:
            logger.error(f"OpenAI error: {r.json()} + {r.status_code}")
            return None, r.json(), r.status_code
        return r.json()["id"], None, 200
    except Exception as e:
        logger.error(f"Assistant create failed: {e}")
        return None, str(e), 500


def delete_openai_assistant(openid):
    try:
        headers = {
            "Authorization": f"Bearer {openai.api_key}",
            "Content-Type": "application/json",
            "OpenAI-Beta": "assistants=v2"
        }
        r = requests.delete(f"https://api.openai.com/v1/assistants/{openid}",
                            headers=headers)
        return r.status_code == 204
    except Exception as e:
        logger.error(f"Assistant delete failed: {e}")
        return False


def handle_tags_and_rubrics(data, scenario_id):
    try:
        Tags.query.filter_by(scenario_id=scenario_id).delete()
        RubricQuestion.query.filter_by(scenario_id=scenario_id).delete()
        for tag in data.get("tags", []):
            db.session.add(Tags(tag_text=tag, scenario_id=scenario_id))
        for q in data.get("rubrics", []):
            db.session.add(RubricQuestion(question=q, scenario_id=scenario_id))
        db.session.commit()
        return True, None
    except Exception as e:
        db.session.rollback()
        logger.error(f"Tag/Rubric error: {e}")
        return False, str(e)


def create_scenario_in_db(data, openid):
    try:
        s = AssistantScenario(
            scenario_text=data["scenario_text"],
            additional_instructions=data.get("additional_instructions", ""),
            enable=data.get("enable", True),
            role=data.get("role"),
            communication_preferences=data.get("communication_preferences"),
            openid=openid
        )
        db.session.add(s)
        db.session.commit()
        return s, None
    except Exception as e:
        db.session.rollback()
        return None, str(e)

# ╭──────────────────────────────────────────╮
# │  Routes – unchanged behaviour            │
# ╰──────────────────────────────────────────╯
@assistant_bp.route("/scenarios", methods=["GET"])
@token_required
def get_all_scenarios(current_user):
    try:
        return jsonify([s.serialize() for s in AssistantScenario.query.all()]), 200
    except Exception as e:
        return jsonify({"message": "Failed", "error": str(e)}), 500


@assistant_bp.route("/scenarios", methods=["POST"])
@token_required
def create_scenario(current_user):
    data = request.get_json()
    prompt = f"You have to act as a {data['scenario_text']} with a possible configuration as follow {data['additional_instructions']}. You must always act as a patient persona throughout the entire conversation and be a chatty with doctor add your input in moving the conversation forward like by asking questions. The target is for the medical student to act as a doctor, and you as a patient with the mentioned instructions/profile with communication preferences as follow: {data['communication_preferences']}, so the skills of a doctor can be evaluated. Do not act as anything else, and keep your answers chatty multi turn and occasionally add questions. Donot throw all of the information provided further in details at once as we expect doctor to ask specific questions"
    openid, err, code = create_openai_assistant(
        data["scenario_text"],
        prompt + " " + data.get("additional_instructions", ""),
        openai.model
    )
    if err:
        return jsonify({"message": "OpenAI error", "details": err}), code

    scenario, err = create_scenario_in_db(data, openid)
    if err:
        delete_openai_assistant(openid)
        return jsonify({"message": err}), 500

    return jsonify({"message": "Created", "id": scenario.id}), 201


@assistant_bp.route("/scenarios/<int:scenario_id>", methods=["PUT"])
@token_required
def update_scenario(current_user, scenario_id):
    data = request.get_json()
    s = AssistantScenario.query.get(scenario_id)
    if not s:
        return jsonify({"message": "Not found"}), 404
    if s.openid:
        delete_openai_assistant(s.openid)

    prompt = f"You have to act as a {data['scenario_text']} with a possible configuration as follow {data['additional_instructions']}. You must always act as a patient persona throughout the entire conversation and be a chatty with doctor add your input in moving the conversation forward like by asking questions. The target is for the medical student to act as a doctor, and you as a patient with the mentioned instructions/profile with communication preferences as follow: {data['communication_preferences']}, so the skills of a doctor can be evaluated. Do not act as anything else, and keep your answers chatty multi turn and occasionally add questions. Donot throw all of the information provided further in details at once as we expect doctor to ask specific questions"
    openid, err, code = create_openai_assistant(
        data["scenario_text"], prompt, openai.model)
    if err:
        return jsonify({"message": err}), code

    s.scenario_text = data["scenario_text"]
    s.additional_instructions = data.get("additional_instructions", "")
    s.communication_preferences = data.get("communication_preferences")
    s.enable = data.get("enable", True)
    s.role = data.get("role")
    s.openid = openid
    db.session.commit()

    ok, err = handle_tags_and_rubrics(data, scenario_id)
    if not ok:
        return jsonify({"message": err}), 500
    return jsonify({"message": "Updated"}), 200


@assistant_bp.route("/scenarios/<int:id>", methods=["DELETE"])
@token_required
def delete_scenario(current_user, id):
    s = AssistantScenario.query.get(id)
    if not s:
        return jsonify({"message": "Not found"}), 404
    Tags.query.filter_by(scenario_id=id).delete()
    RubricQuestion.query.filter_by(scenario_id=id).delete()
    if s.openid:
        delete_openai_assistant(s.openid)
    db.session.delete(s)
    db.session.commit()
    return jsonify({"message": "Deleted"}), 200


@assistant_bp.route("/scenarios/<int:id>/enable", methods=["PUT"])
@token_required
def enable_scenario(current_user, id):
    s = AssistantScenario.query.get(id)
    if not s:
        return jsonify({"message": "Not found"}), 404
    s.enable_scenario()
    return jsonify({"message": "Enabled"}), 200


@assistant_bp.route("/scenarios/<int:id>/disable", methods=["PUT"])
@token_required
def disable_scenario(current_user, id):
    s = AssistantScenario.query.get(id)
    if not s:
        return jsonify({"message": "Not found"}), 404
    s.disable_scenario()
    return jsonify({"message": "Disabled"}), 200


@assistant_bp.route("/delete_all", methods=["DELETE"])
def delete_all_data():
    try:
        Tags.query.delete()
        RubricQuestion.query.delete()
        AssistantScenario.query.delete()
        db.session.commit()
        return jsonify({"message": "All data deleted"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": str(e)}), 500
