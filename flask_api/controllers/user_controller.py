from flask import Blueprint, request, jsonify, current_app
from app import db, logger, create_app
from models.user import User
import jwt
from passlib.hash import pbkdf2_sha256 as sha256
from datetime import datetime, timedelta
import os

user_bp = Blueprint('user_bp', __name__)

@user_bp.route('/all_users', methods=['GET'])
def get_users():
    users = User.query.all()
    return jsonify([user.username for user in users])

@user_bp.route('/create_users', methods=['POST'])
def create_user():
    data = request.get_json()
    logger.debug(data)
    hashed_password = sha256.hash(data['password'])
    new_user = User(
        username=data['username'],
        email=data['email'],
        password=hashed_password,
        role=data['role']
    )
    try:
        db.session.add(new_user)
        db.session.commit()
        return jsonify({'message': 'User created successfully'}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Failed to create user: {str(e)}'}), 500

@user_bp.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json(force=True)
        logger.debug(f"Received login data: {data}")

        if not data or not 'email' in data or not 'password' in data:
            logger.error("Invalid input: Missing email or password")
            return jsonify({'message': 'Invalid input: Missing email or password'}), 400

        email = data['email']
        password = data['password']
        user = User.query.filter_by(email=email).first()

        if user and sha256.verify(password, user.password):
            token = jwt.encode({
                'email': user.email,
                'exp': datetime.utcnow() + timedelta(hours=1)
            }, current_app.config['SECRET_KEY'], algorithm='HS256')

            return jsonify({'token': token, 'role': user.role, 'name': user.username}), 200
        else:
            logger.warning("Invalid username or password")
            return jsonify({'message': 'Invalid username or password'}), 401
    except Exception as e:
        logger.error(f"Error during login: {e}")
        return jsonify({'message': 'An error occurred during login'}), 500
