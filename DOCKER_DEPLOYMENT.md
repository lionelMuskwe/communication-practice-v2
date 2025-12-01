# Docker Deployment Guide

## 🐳 Complete Docker Setup for Medical Practice Communication Tool

This guide covers deploying the Django backend using Docker Compose with all required services.

---

## 📦 Services Included

The `docker-compose.yml` configuration includes:

1. **PostgreSQL 16** - Primary database
2. **Redis 7** - Caching and message broker
3. **Django Web** - Main application server (Gunicorn)
4. **Celery Worker** - Background task processing
5. **Celery Beat** - Scheduled task execution
6. **Nginx** - (Optional) Reverse proxy and static file serving

---

## 🚀 Quick Start

### 1. Prerequisites

```bash
# Install Docker and Docker Compose
# Windows: Docker Desktop (https://www.docker.com/products/docker-desktop)
# Linux:
sudo apt-get update
sudo apt-get install docker.io docker-compose

# Verify installation
docker --version
docker-compose --version
```

### 2. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your configuration
# REQUIRED: Update these values
# - SECRET_KEY (generate with: python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())')
# - OPENAI_KEY
# - Database credentials (if changing defaults)
```

**Example `.env` for Docker:**
```ini
# Django
DJANGO_ENV=production
SECRET_KEY=your-super-secret-key-here
ALLOWED_HOSTS=localhost,127.0.0.1,yourdomain.com
CORS_ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com

# Database (Docker defaults)
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/medical_practice
DB_NAME=medical_practice
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=postgres
DB_PORT=5432

# Redis (Docker defaults)
REDIS_URL=redis://redis:6379/0
CELERY_BROKER_URL=redis://redis:6379/1

# OpenAI
OPENAI_KEY=sk-your-openai-api-key-here

# Superuser (optional - auto-created on first run)
DJANGO_SUPERUSER_USERNAME=admin
DJANGO_SUPERUSER_EMAIL=admin@example.com
DJANGO_SUPERUSER_PASSWORD=changeme123
```

### 3. Build and Start Services

```bash
# Build all containers
docker-compose build

# Start all services in detached mode
docker-compose up -d

# View logs
docker-compose logs -f

# View logs for specific service
docker-compose logs -f web
docker-compose logs -f celery_worker
```

### 4. Verify Deployment

```bash
# Check all services are running
docker-compose ps

# Expected output:
# NAME                          STATUS
# medical_practice_db           Up (healthy)
# medical_practice_redis        Up (healthy)
# medical_practice_web          Up
# medical_practice_celery_worker Up
# medical_practice_celery_beat  Up

# Test API endpoint
curl http://localhost:8000/api/scenarios/

# Access Django Admin
# Open: http://localhost:8000/admin/
```

---

## 🔧 Common Commands

### Container Management

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# Stop and remove volumes (CAUTION: deletes database data)
docker-compose down -v

# Restart a specific service
docker-compose restart web

# View service status
docker-compose ps

# View logs
docker-compose logs -f [service_name]
```

### Database Operations

```bash
# Run migrations
docker-compose exec web python manage.py migrate

# Create migrations
docker-compose exec web python manage.py makemigrations

# Create superuser
docker-compose exec web python manage.py createsuperuser

# Django shell
docker-compose exec web python manage.py shell

# Database backup
docker-compose exec postgres pg_dump -U postgres medical_practice > backup.sql

# Database restore
docker-compose exec -T postgres psql -U postgres medical_practice < backup.sql
```

### Application Management

```bash
# Collect static files
docker-compose exec web python manage.py collectstatic --noinput

# Run Django management command
docker-compose exec web python manage.py [command]

# Access container shell
docker-compose exec web bash

# View Django logs
docker-compose logs -f web

# Restart web service after code changes
docker-compose restart web
```

### Celery Operations

```bash
# View worker logs
docker-compose logs -f celery_worker

# View beat logs
docker-compose logs -f celery_beat

# Restart workers
docker-compose restart celery_worker celery_beat

# Monitor tasks (requires celery flower - add to docker-compose if needed)
# docker-compose exec celery_worker celery -A config flower
```

---

## 📁 Docker Configuration Files

### File Structure
```
project_root/
├── docker-compose.yml           # Service orchestration
├── .env                         # Environment variables (create from .env.example)
├── .env.example                 # Environment template
└── django_api/
    ├── Dockerfile               # Django container definition
    ├── docker-entrypoint.sh     # Startup script
    └── .dockerignore           # Files to exclude from image
```

### Dockerfile Highlights

**Multi-stage build:**
- Stage 1: Build dependencies in virtual environment
- Stage 2: Copy only necessary files to slim runtime image

**Security features:**
- Runs as non-root user (`django`)
- Minimal base image (python:3.11-slim)
- No unnecessary packages

**Production-ready:**
- Gunicorn WSGI server
- Health checks configured
- Proper signal handling

### docker-compose.yml Highlights

**Network isolation:**
- All services on dedicated `app_network`
- Services communicate via service names

**Data persistence:**
- PostgreSQL data: `postgres_data` volume
- Redis data: `redis_data` volume
- Static files: `static_volume`
- Media files: `media_volume`

**Health checks:**
- PostgreSQL: `pg_isready`
- Redis: `redis-cli ping`
- Services wait for dependencies

---

## 🔒 Security Best Practices

### 1. Environment Variables

```bash
# NEVER commit .env to version control
echo ".env" >> .gitignore

# Generate strong SECRET_KEY
python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'

# Use different credentials for production
DB_PASSWORD=strong-password-here
```

### 2. Database Security

```bash
# Change default PostgreSQL password
# In .env:
DB_PASSWORD=your-secure-password

# Restrict database access (in production)
# Only allow connections from app containers
```

### 3. SSL/HTTPS (Production)

```bash
# Enable HTTPS in .env
SECURE_SSL_REDIRECT=True
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True
SECURE_HSTS_SECONDS=31536000

# Use Nginx with SSL certificates
# See nginx configuration below
```

---

## 🌐 Production Deployment

### Option 1: Deploy on VPS (DigitalOcean, AWS, etc.)

```bash
# 1. Install Docker on server
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# 2. Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 3. Clone repository
git clone https://github.com/yourusername/communication_practice_tool.git
cd communication_practice_tool

# 4. Configure production environment
cp .env.example .env
nano .env  # Edit with production values

# 5. Start services
docker-compose up -d

# 6. Setup firewall
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### Option 2: Deploy with Nginx Reverse Proxy

**1. Uncomment nginx service in `docker-compose.yml`**

**2. Create `nginx/nginx.conf`:**

```nginx
upstream django {
    server web:8000;
}

server {
    listen 80;
    server_name yourdomain.com;
    client_max_body_size 10M;

    # Static files
    location /static/ {
        alias /app/staticfiles/;
    }

    # Media files
    location /media/ {
        alias /app/mediafiles/;
    }

    # Proxy to Django
    location / {
        proxy_pass http://django;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Host $host;
        proxy_redirect off;
    }
}
```

**3. SSL with Let's Encrypt (recommended):**

```bash
# Install Certbot
docker-compose run --rm certbot certonly --webroot --webroot-path=/var/www/certbot -d yourdomain.com

# Auto-renewal
# Add to crontab:
0 12 * * * docker-compose run --rm certbot renew
```

---

## 🐛 Troubleshooting

### Container won't start

```bash
# Check logs
docker-compose logs [service_name]

# Check if ports are already in use
netstat -tulpn | grep :8000
netstat -tulpn | grep :5432

# Remove old containers and rebuild
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Database connection errors

```bash
# Verify PostgreSQL is running
docker-compose ps postgres

# Check database logs
docker-compose logs postgres

# Test database connection
docker-compose exec web python manage.py dbshell

# Verify DATABASE_URL in .env
docker-compose exec web env | grep DATABASE
```

### Redis connection errors

```bash
# Check Redis status
docker-compose ps redis

# Test Redis connection
docker-compose exec redis redis-cli ping

# Check Redis logs
docker-compose logs redis
```

### Permission errors

```bash
# Fix file permissions
sudo chown -R 1000:1000 django_api/

# Fix volume permissions
docker-compose exec web chown -R django:django /app/staticfiles
docker-compose exec web chown -R django:django /app/mediafiles
```

### Migration errors

```bash
# Reset migrations (DEVELOPMENT ONLY!)
docker-compose exec web python manage.py migrate [app_name] zero
docker-compose exec web python manage.py migrate

# Clear migration files and restart
docker-compose down
# Delete migration files (except __init__.py)
docker-compose up -d
docker-compose exec web python manage.py makemigrations
docker-compose exec web python manage.py migrate
```

### Out of memory

```bash
# Check container resource usage
docker stats

# Increase Docker memory limit (Docker Desktop)
# Settings > Resources > Memory > Increase limit

# Or limit service memory in docker-compose.yml:
services:
  web:
    deploy:
      resources:
        limits:
          memory: 512M
```

---

## 📊 Monitoring

### View Container Stats

```bash
# Real-time stats
docker stats

# Service-specific stats
docker stats medical_practice_web
```

### Application Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f web

# Last 100 lines
docker-compose logs --tail=100 web

# Since specific time
docker-compose logs --since 2024-01-01T00:00:00 web
```

### Database Monitoring

```bash
# PostgreSQL stats
docker-compose exec postgres psql -U postgres -c "SELECT * FROM pg_stat_activity;"

# Database size
docker-compose exec postgres psql -U postgres -c "SELECT pg_size_pretty(pg_database_size('medical_practice'));"

# Active connections
docker-compose exec postgres psql -U postgres -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';"
```

---

## 🔄 Updates and Maintenance

### Updating Application Code

```bash
# Pull latest code
git pull origin main

# Rebuild containers
docker-compose build web

# Restart services
docker-compose up -d

# Run migrations
docker-compose exec web python manage.py migrate

# Collect static files
docker-compose exec web python manage.py collectstatic --noinput
```

### Updating Docker Images

```bash
# Pull latest base images
docker-compose pull

# Rebuild with latest images
docker-compose build --pull

# Restart services
docker-compose up -d
```

### Database Backups

```bash
# Automated backup script
#!/bin/bash
BACKUP_DIR=/backups
DATE=$(date +%Y%m%d_%H%M%S)
docker-compose exec postgres pg_dump -U postgres medical_practice > $BACKUP_DIR/backup_$DATE.sql

# Add to crontab for daily backups:
0 2 * * * /path/to/backup-script.sh
```

---

## 🎯 Next Steps

1. **Configure production .env** - Update all security settings
2. **Setup SSL certificates** - Use Let's Encrypt for HTTPS
3. **Configure monitoring** - Add Sentry, Prometheus, or similar
4. **Setup backups** - Automate database and media backups
5. **Load testing** - Test with expected traffic
6. **CI/CD pipeline** - Automate deployments

---

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Django Deployment Checklist](https://docs.djangoproject.com/en/5.0/howto/deployment/checklist/)
- [PostgreSQL Docker Image](https://hub.docker.com/_/postgres)
- [Redis Docker Image](https://hub.docker.com/_/redis)

---

**Docker deployment is now ready! 🎉**

For quick testing, run:
```bash
docker-compose up -d
docker-compose logs -f
```

For production deployment, follow the Production Deployment section above.
