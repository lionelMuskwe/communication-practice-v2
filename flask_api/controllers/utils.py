import jwt
from functools import wraps
from flask import request, jsonify, current_app
from datetime import datetime, timezone
from models.user import User

def token_required(func):
    @wraps(func)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            current_app.logger.warning("Missing or malformed Authorization header")
            return jsonify({"message": "Unauthorised"}), 401

        token = auth_header.split(" ", 1)[1].strip()
        try:
            payload = jwt.decode(
                token,
                current_app.config["SECRET_KEY"],
                algorithms=["HS256"],
                options={"require": ["exp"], "verify_exp": True},
            )
        except jwt.ExpiredSignatureError:
            current_app.logger.warning("JWT expired")
            return jsonify({"message": "Token has expired"}), 401
        except jwt.InvalidTokenError:
            current_app.logger.warning("JWT invalid")
            return jsonify({"message": "Unauthorised"}), 401
        except Exception as e:
            current_app.logger.error(f"JWT decode error: {e}")
            return jsonify({"message": "Unauthorised"}), 401

        # We issue tokens keyed on 'email'. Fall back to username if needed.
        email = payload.get("email")
        username = payload.get("username")
        user = None
        if email:
            user = User.query.filter_by(email=email).first()
        if not user and username:
            user = User.query.filter_by(username=username).first()
        if not user:
            return jsonify({"message": "Unauthorised"}), 401

        return func(user, *args, **kwargs)

    return decorated
