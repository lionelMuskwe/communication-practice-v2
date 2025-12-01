import os

# Determine which settings to use based on environment
env = os.getenv('DJANGO_ENV', 'development')

if env == 'production':
    from .production import *
elif env == 'test':
    from .test import *
else:
    from .development import *
