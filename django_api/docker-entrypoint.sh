#!/bin/sh
set -e

echo "=== Django Docker Entrypoint ==="

# ---------------------------
# Wait for PostgreSQL
# ---------------------------
echo "Waiting for PostgreSQL..."
while ! pg_isready -h ${DB_HOST:-postgres} -p ${DB_PORT:-5432} -U ${DB_USER:-postgres} > /dev/null 2>&1; do
    echo "PostgreSQL is unavailable - sleeping"
    sleep 1
done
echo "PostgreSQL is up - continuing..."


# ---------------------------
# Wait for Redis (Python method)
# ---------------------------
echo "Waiting for Redis..."
python - << 'EOF'
import time
import redis
import os

host = os.environ.get("REDIS_HOST", "redis")
port = int(os.environ.get("REDIS_PORT", 6379))

r = redis.Redis(host=host, port=port)

for _ in range(60):
    try:
        r.ping()
        print("Redis is up - continuing...")
        break
    except Exception:
        print("Redis unavailable - sleeping")
        time.sleep(1)
else:
    print("Redis failed to start after 60 attempts.")
    exit(1)
EOF
# ----------------------------

# Apply database migrations
echo "Applying database migrations..."
python manage.py migrate --noinput


# Only run collectstatic for the web process (gunicorn)
if [ "$1" = "gunicorn" ]; then
    echo "Collecting static files..."
    python manage.py collectstatic --noinput --clear
fi

# Create superuser
if [ -n "$DJANGO_SUPERUSER_USERNAME" ] && [ -n "$DJANGO_SUPERUSER_EMAIL" ] && [ -n "$DJANGO_SUPERUSER_PASSWORD" ]; then
    echo "Creating superuser..."
    python manage.py shell << END
from apps.users.models import User
if not User.objects.filter(username='$DJANGO_SUPERUSER_USERNAME').exists():
    User.objects.create_superuser(
        username='$DJANGO_SUPERUSER_USERNAME',
        email='$DJANGO_SUPERUSER_EMAIL',
        password='$DJANGO_SUPERUSER_PASSWORD',
        role='admin'
    )
    print('Superuser created successfully')
else:
    print('Superuser already exists')
END
fi

echo "=== Starting Application ==="
exec "$@"
