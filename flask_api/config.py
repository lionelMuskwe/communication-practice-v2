import os

def read_secret(secret_name: str, fallback: str = None) -> str:
    """Reads Docker secret from mounted /run/secrets file or uses fallback."""
    try:
        with open(f"/run/secrets/{secret_name}") as f:
            return f.read().strip()
    except FileNotFoundError:
        return fallback

class Config:
    SQLALCHEMY_DATABASE_URI = read_secret('db_url', os.getenv('DATABASE_URL'))
    SECRET_KEY = read_secret('secret_key', os.getenv('SECRET_KEY'))
    OPENAI_KEY = read_secret('openai_key', os.getenv('OPENAI_KEY'))
    OPENAI_MODEL = read_secret('openai_model', os.getenv('OPENAI_Model'))
    OPENAI_MODEL_TUNED = read_secret('openai_model_tuned', os.getenv('OPENAI_Model_Tuned'))
    NODE_ENV = read_secret('node_env', os.getenv('NODE_ENV', 'development'))
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    DEBUG = NODE_ENV == 'development'

class DevelopmentConfig(Config):
    DEBUG = True

class ProductionConfig(Config):
    DEBUG = False

# Dictionary to map string env to config class
config_dict = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
}
