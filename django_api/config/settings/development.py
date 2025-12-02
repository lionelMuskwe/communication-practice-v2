"""
Development settings
"""
from .base import *

DEBUG = True

ALLOWED_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0']

# Add debug toolbar
INSTALLED_APPS += [
    'debug_toolbar',
]

MIDDLEWARE += [
    'debug_toolbar.middleware.DebugToolbarMiddleware',
]

# Internal IPs for debug toolbar
INTERNAL_IPS = [
    '127.0.0.1',
    'localhost',
]

# Development CORS - Allow all origins for easier testing
CORS_ALLOW_ALL_ORIGINS = True

# Simplified database URL for development
DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/medical_practice')
if DATABASE_URL.startswith('postgresql://'):
    import dj_database_url
    DATABASES['default'] = dj_database_url.parse(DATABASE_URL)

# Development logging - more verbose
LOGGING['root']['level'] = 'INFO'
LOGGING['loggers']['django']['level'] = 'INFO'
LOGGING['loggers']['apps']['level'] = 'DEBUG'
LOGGING['loggers']['django.utils.autoreload'] = {
    'handlers': ['console'],
    'level': 'INFO', 
    'propagate': False,
}

# Email backend for development
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# Browsable API in development
REST_FRAMEWORK['DEFAULT_RENDERER_CLASSES'] = [
    'rest_framework.renderers.JSONRenderer',
    'rest_framework.renderers.BrowsableAPIRenderer',
]
