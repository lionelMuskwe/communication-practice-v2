from flask import Blueprint, request, jsonify
from app import db, logger
from models.user import Tag, AssistantScenario
from utils import token_required  # Make sure to import the token_required decorator

tag_bp = Blueprint('tag_bp', __name__)

@tag_bp.route('/scenarios/<int:scenario_id>/tags', methods=['POST'])
@token_required
def add_tag(current_user, scenario_id):
    data = request.get_json()
    tag_text = data.get('tag')

    if not tag_text:
        return jsonify({'message': 'Tag text is required'}), 400

    scenario = AssistantScenario.query.get(scenario_id)
    if not scenario:
        return jsonify({'message': 'Scenario not found'}), 404

    new_tag = Tag(tag=tag_text, scenario_id=scenario_id)
    try:
        db.session.add(new_tag)
        # Do not commit here
        return jsonify({'message': 'Tag added successfully'}), 201
    except Exception as e:
        logger.error(f"Failed to add tag: {e}")
        return jsonify({'message': f'Failed to add tag: {str(e)}'}), 500

@tag_bp.route('/scenarios/<int:scenario_id>/tags', methods=['GET'])
@token_required
def get_tags(current_user, scenario_id):
    scenario = AssistantScenario.query.get(scenario_id)
    if not scenario:
        return jsonify({'message': 'Scenario not found'}), 404

    tags = Tag.query.filter_by(scenario_id=scenario_id).all()
    return jsonify([{'id': t.id, 'tag': t.tag} for t in tags])

@tag_bp.route('/tags/<int:tag_id>', methods=['PUT'])
@token_required
def edit_tag(current_user, tag_id):
    data = request.get_json()
    tag_text = data.get('tag')

    if not tag_text:
        return jsonify({'message': 'Tag text is required'}), 400

    tag = Tag.query.get(tag_id)
    if not tag:
        return jsonify({'message': 'Tag not found'}), 404

    try:
        tag.tag = tag_text
        # Do not commit here
        return jsonify({'message': 'Tag updated successfully'}), 200
    except Exception as e:
        logger.error(f"Failed to update tag: {e}")
        return jsonify({'message': f'Failed to update tag: {str(e)}'}), 500

@tag_bp.route('/tags/<int:tag_id>', methods=['DELETE'])
@token_required
def delete_tag(current_user, tag_id):
    tag = Tag.query.get(tag_id)
    if not tag:
        return jsonify({'message': 'Tag not found'}), 404

    try:
        db.session.delete(tag)
        # Do not commit here
        return jsonify({'message': 'Tag deleted successfully'}), 200
    except Exception as e:
        logger.error(f"Failed to delete tag: {e}")
        return jsonify({'message': f'Failed to delete tag: {str(e)}'}), 500
