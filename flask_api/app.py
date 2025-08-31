from flask import Flask
from flask_migrate import Migrate
from flask_sqlalchemy import SQLAlchemy
from config import config_dict as CONFIG_DICT, Config  # Make sure both are imported
from dotenv import load_dotenv
import os
import logging
from flask_cors import CORS

# Set up Logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

db = SQLAlchemy()
migrate = Migrate()

load_dotenv()

def create_app():
    app = Flask(__name__)

    # Read environment name from secret (already available via Config.NODE_ENV)
    config_class = CONFIG_DICT.get(Config.NODE_ENV.lower(), Config)
    app.config.from_object(config_class)

    db.init_app(app)
    migrate.init_app(app, db)

    # Enable CORS for the app
    CORS(app, resources={r"/api/*": {"origins": [
        "http://localhost:3000",
        "http://51.68.198.166",
        "http://51.68.198.166:80",
        "http://localhost"
    ]}})

    # Import and register Blueprints
    from controllers.user_controller import user_bp
    from controllers.assistant_scenario_controller import assistant_bp
    from controllers.rubric_question_controller import rubric_bp
    from controllers.openai_controller import openai_assistant_bp
    from controllers.categories_controller import categories_bp
    from controllers.activity import activities_bp

    app.register_blueprint(user_bp, url_prefix='/api')
    app.register_blueprint(assistant_bp, url_prefix='/api')
    app.register_blueprint(rubric_bp, url_prefix='/api')
    app.register_blueprint(openai_assistant_bp, url_prefix='/api')
    app.register_blueprint(categories_bp, url_prefix='/api')
    app.register_blueprint(activities_bp, url_prefix='/api')

    return app


if __name__ == '__main__':
    app = create_app()
    app.run(debug=(Config.NODE_ENV == 'development'), host='0.0.0.0', port=5000)
