from flask import Blueprint, request, jsonify, current_app
from app import db, logger
from models.user import RubricQuestion, AssistantScenario
from utils import token_required  # Make sure to import the token_required decorator

rubric_bp = Blueprint('rubric_bp', __name__)

@rubric_bp.route('/scenarios/<int:scenario_id>/rubric_questions', methods=['POST'])
@token_required
def add_rubric_question(current_user, scenario_id):
    data = request.get_json()
    question_text = data.get('question')

    if not question_text:
        return jsonify({'message': 'Question text is required'}), 400

    scenario = AssistantScenario.query.get(scenario_id)
    if not scenario:
        return jsonify({'message': 'Scenario not found'}), 404

    new_question = RubricQuestion(question=question_text, scenario_id=scenario_id)
    try:
        db.session.add(new_question)
        return jsonify({'message': 'Rubric question added successfully'}), 201
    except Exception as e:
        logger.error(f"Failed to add rubric question: {e}")
        return jsonify({'message': f'Failed to add rubric question: {str(e)}'}), 500

@rubric_bp.route('/scenarios/<int:scenario_id>/rubric_questions', methods=['GET'])
@token_required
def get_rubric_questions(current_user, scenario_id):
    scenario = AssistantScenario.query.get(scenario_id)
    if not scenario:
        return jsonify({'message': 'Scenario not found'}), 404

    questions = RubricQuestion.query.filter_by(scenario_id=scenario_id).all()
    return jsonify([{'id': q.id, 'question': q.question} for q in questions])

@rubric_bp.route('/rubric_questions/<int:question_id>', methods=['PUT'])
@token_required
def edit_rubric_question(current_user, question_id):
    data = request.get_json()
    question_text = data.get('question')

    if not question_text:
        return jsonify({'message': 'Question text is required'}), 400

    question = RubricQuestion.query.get(question_id)
    if not question:
        return jsonify({'message': 'Rubric question not found'}), 404

    try:
        question.question = question_text
        return jsonify({'message': 'Rubric question updated successfully'}), 200
    except Exception as e:
        logger.error(f"Failed to update rubric question: {e}")
        return jsonify({'message': f'Failed to update rubric question: {str(e)}'}), 500

@rubric_bp.route('/rubric_questions/<int:question_id>', methods=['DELETE'])
@token_required
def delete_rubric_question(current_user, question_id):
    question = RubricQuestion.query.get(question_id)
    if not question:
        return jsonify({'message': 'Rubric question not found'}), 404

    try:
        db.session.delete(question)
        return jsonify({'message': 'Rubric question deleted successfully'}), 200
    except Exception as e:
        logger.error(f"Failed to delete rubric question: {e}")
        return jsonify({'message': f'Failed to delete rubric question: {str(e)}'}), 500
