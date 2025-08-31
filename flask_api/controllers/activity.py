from flask import Blueprint, request, jsonify
from app import db, logger
from models.user import Activity, Category, AssistantScenario
from utils import token_required

activities_bp = Blueprint('activities_bp', __name__)

@activities_bp.route('/activities', methods=['GET'])
@token_required
def get_all_activities(current_user):
    try:
        activities = Activity.query.all()
        result = [activity.serialize() for activity in activities]
        return jsonify(result), 200
    except Exception as e:
        logger.error(f"Failed to fetch activities: {str(e)}")
        return jsonify({'message': 'Failed to fetch activities', 'error': str(e)}), 500

@activities_bp.route('/activities', methods=['POST'])
@token_required
def create_or_update_activity(current_user):
    data = request.get_json()
    activity_id = data.get('id')
    pre_brief = data.get('pre_brief')
    character_id = data.get('character_id')
    category_ids = data.get('categories', [])

    if not pre_brief or not character_id:
        return jsonify({'message': 'pre_brief and character_id are required'}), 400

    try:
        character = AssistantScenario.query.get(character_id)
        if not character:
            return jsonify({'message': 'Character not found'}), 404

        categories = Category.query.filter(Category.id.in_(category_ids)).all()

        if activity_id:
            activity = Activity.query.get(activity_id)
            if not activity:
                return jsonify({'message': 'Activity not found'}), 404
            activity.pre_brief = pre_brief
            activity.character_id = character_id
            activity.categories = categories
        else:
            activity = Activity(pre_brief=pre_brief, character_id=character_id)
            activity.categories = categories
            db.session.add(activity)

        db.session.commit()
        return jsonify({'message': 'Activity saved', 'id': activity.id}), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Failed to save activity: {str(e)}")
        return jsonify({'message': 'Failed to save activity', 'error': str(e)}), 500

@activities_bp.route('/activities/<int:activity_id>', methods=['DELETE'])
@token_required
def delete_activity(current_user, activity_id):
    try:
        activity = Activity.query.get(activity_id)
        if not activity:
            return jsonify({'message': 'Activity not found'}), 404

        db.session.delete(activity)
        db.session.commit()
        return jsonify({'message': 'Activity deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Failed to delete activity: {str(e)}")
        return jsonify({'message': 'Failed to delete activity', 'error': str(e)}), 500
