from flask import Blueprint, request, jsonify
from app import db
from models.user import Category, SubCategory
from utils import token_required

categories_bp = Blueprint('categories_bp', __name__)

# ===================== Category Routes ===================== #

@categories_bp.route('/categories', methods=['GET'])
@token_required
def get_categories(current_user):
    categories = Category.query.all()
    result = [c.serialize() for c in categories]
    return jsonify(result), 200


@categories_bp.route('/categories', methods=['POST'])
@token_required
def create_or_update_category(current_user):
    data = request.get_json()
    category_id = data.get('id')
    name = data.get('name')
    total_required_to_pass = data.get('total_required_to_pass')

    if not name or total_required_to_pass is None:
        return jsonify({'message': 'Missing name or total_required_to_pass'}), 400

    if category_id:
        category = Category.query.get(category_id)
        if not category:
            return jsonify({'message': 'Category not found'}), 404
        category.name = name
        category.total_required_to_pass = total_required_to_pass
    else:
        category = Category(name=name, total_required_to_pass=total_required_to_pass)
        db.session.add(category)

    db.session.commit()
    return jsonify({'message': 'Category saved', 'id': category.id}), 200


@categories_bp.route('/categories/<int:category_id>', methods=['DELETE'])
@token_required
def delete_category(current_user, category_id):
    category = Category.query.get(category_id)
    if not category:
        return jsonify({'message': 'Category not found'}), 404
    db.session.delete(category)
    db.session.commit()
    return jsonify({'message': 'Category deleted'}), 200

# ===================== Rubric (SubCategory) Routes ===================== #

@categories_bp.route('/categories/<int:category_id>/rubrics', methods=['GET'])
@token_required
def get_rubrics(current_user, category_id):
    category = Category.query.get(category_id)
    if not category:
        return jsonify({'message': 'Category not found'}), 404

    rubrics = [r.serialize() for r in category.subcategories]
    return jsonify(rubrics), 200


@categories_bp.route('/rubrics', methods=['POST'])
@token_required
def create_or_update_rubric(current_user):
    data = request.get_json()
    rubric_id = data.get('id')
    name = data.get('name')
    instructions = data.get('marking_instructions')
    category_id = data.get('category_id')

    if not name or not instructions or not category_id:
        return jsonify({'message': 'Missing fields'}), 400

    category = Category.query.get(category_id)
    if not category:
        return jsonify({'message': 'Category not found'}), 404

    if rubric_id:
        rubric = SubCategory.query.get(rubric_id)
        if not rubric:
            return jsonify({'message': 'Rubric not found'}), 404
        rubric.name = name
        rubric.marking_instructions = instructions
    else:
        rubric = SubCategory(
            name=name,
            marking_instructions=instructions,
            category_id=category.id
        )
        db.session.add(rubric)

    db.session.commit()
    return jsonify({'message': 'Rubric saved', 'id': rubric.id}), 200


@categories_bp.route('/rubrics/<int:rubric_id>', methods=['DELETE'])
@token_required
def delete_rubric(current_user, rubric_id):
    rubric = SubCategory.query.get(rubric_id)
    if not rubric:
        return jsonify({'message': 'Rubric not found'}), 404
    db.session.delete(rubric)
    db.session.commit()
    return jsonify({'message': 'Rubric deleted'}), 200

