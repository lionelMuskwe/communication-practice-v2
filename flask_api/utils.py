import jwt
from functools import wraps
from flask import request, jsonify, current_app
from models.user import User
from datetime import datetime

def token_required(func):
    @wraps(func)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            current_app.logger.warning("Missing or malformed Authorization header")
            return jsonify({'message': 'Unauthorised'}), 401

        token = auth_header.split(" ")[1]
        current_app.logger.debug(f"Token received: {token}")

        try:
            data = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=['HS256'])

            # Optional: enforce expiration manually if token lacks exp
            if 'exp' in data:
                now = datetime.utcnow().timestamp()
                if now > data['exp']:
                    current_app.logger.warning("Token manually expired")
                    return jsonify({'message': 'Token has expired'}), 401

            current_user = User.query.filter_by(email=data.get('email')).first()
            if not current_user:
                current_app.logger.warning("User not found from JWT")
                return jsonify({'message': 'Unauthorised'}), 401

        except jwt.ExpiredSignatureError:
            current_app.logger.warning("JWT expired")
            return jsonify({'message': 'Token has expired'}), 401
        except jwt.InvalidTokenError:
            current_app.logger.warning("JWT invalid")
            return jsonify({'message': 'Unauthorised'}), 401
        except Exception as e:
            current_app.logger.error(f"JWT decode error: {e}")
            return jsonify({'message': 'Unauthorised'}), 401

        return func(current_user, *args, **kwargs)

    return decorated
