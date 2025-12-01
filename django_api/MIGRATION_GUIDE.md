# Flask to Django Migration Guide

Complete guide for migrating from Flask API to Django API while maintaining the same database.

## Table of Contents
1. [Overview](#overview)
2. [Pre-Migration Checklist](#pre-migration-checklist)
3. [Database Migration Strategy](#database-migration-strategy)
4. [Step-by-Step Migration](#step-by-step-migration)
5. [Testing Strategy](#testing-strategy)
6. [Rollback Plan](#rollback-plan)
7. [Post-Migration](#post-migration)

## Overview

### Migration Strategy: Parallel Development (Option 1)

We're using **Option 1** from the original plan:
- Django API runs alongside Flask API
- Both connect to the same PostgreSQL database
- Incremental endpoint migration
- Zero downtime switchover

### Timeline Estimate
- **Week 1**: Complete API implementation (views, serializers, services)
- **Week 2**: Testing and bug fixes
- **Week 3**: Production deployment and monitoring
- **Week 4**: Decommission Flask API

## Pre-Migration Checklist

### Before You Start
- [ ] Backup production database
- [ ] Document all Flask API endpoints
- [ ] Test Flask API endpoint coverage
- [ ] Set up staging environment
- [ ] Install Django dependencies
- [ ] Configure environment variables
- [ ] Test database connectivity

### Environment Preparation

```bash
# 1. Backup database
pg_dump medical_practice > backup_$(date +%Y%m%d).sql

# 2. Install Django dependencies
cd django_api
python -m venv venv
source venv/bin/activate
pip install -r requirements/development.txt

# 3. Copy environment variables
cp .env.example .env
# Edit .env with production values
```

## Database Migration Strategy

### Table Compatibility

Django models are configured to use Flask's existing table names:

| Model | Django db_table | Flask Table | Status |
|-------|----------------|-------------|--------|
| User | `user` | `user` | ✅ Compatible |
| AssistantScenario | `assistant_scenarios` | `assistant_scenarios` | ✅ Compatible |
| Tag | `assistant_tags` | `assistant_tags` | ✅ Compatible |
| Category | `categories` | `categories` | ✅ Compatible |
| SubCategory | `subcategories` | `subcategories` | ✅ Compatible |
| RubricQuestion | `rubric_questions` | `rubric_questions` | ✅ Compatible |
| Activity | `activities` | `activities` | ✅ Compatible |

### Migration Approach: Fake Initial

Since Flask tables already exist, we'll use Django's fake migration feature:

```bash
# 1. Create migrations
python manage.py makemigrations

# 2. Mark migrations as applied (DON'T create tables)
python manage.py migrate --fake-initial

# 3. Verify no schema changes
python manage.py sqlmigrate users 0001
```

### Schema Differences to Handle

#### 1. User Model
**Flask:** Simple user table with password hash
**Django:** Extends AbstractUser (more fields)

**Solution:**
```python
# Django will add these fields if missing:
# - is_staff, is_active, is_superuser
# - first_name, last_name
# - date_joined, last_login

# Run migration to add new columns:
python manage.py makemigrations users
python manage.py migrate users
```

#### 2. Auto-incrementing IDs
**Flask:** Uses `autoincrement=True` explicitly
**Django:** Uses `AutoField` (same behavior)

**No action needed** - Compatible

#### 3. Timestamps
**Flask:** No created_at/updated_at
**Django:** Added created_at, updated_at

**Solution:**
```bash
# These are new columns with auto_now/auto_now_add
# Migration will add them safely with defaults
python manage.py migrate
```

## Step-by-Step Migration

### Phase 1: Database Setup (Day 1)

```bash
# 1. Point Django to existing database
# In .env:
DATABASE_URL=postgresql://user:pass@host:5432/medical_practice

# 2. Create migrations for all apps
python manage.py makemigrations users
python manage.py makemigrations scenarios
python manage.py makemigrations assessments
python manage.py makemigrations activities
python manage.py makemigrations openai_integration

# 3. Review generated migrations
# Check that table names match Flask

# 4. Apply migrations (fake for existing tables)
python manage.py migrate --fake-initial

# 5. Verify database state
python manage.py showmigrations
```

### Phase 2: Implement Missing Components (Week 1)

#### Day 1-2: Serializers
```bash
# Create serializers for each app
django_api/apps/users/serializers.py
django_api/apps/scenarios/serializers.py
django_api/apps/assessments/serializers.py
django_api/apps/activities/serializers.py
```

#### Day 3-4: Views & URLs
```bash
# Create DRF viewsets
django_api/apps/users/views.py
django_api/apps/scenarios/views.py
# ... etc

# Configure URL routing
django_api/apps/users/urls.py
django_api/config/urls.py
```

#### Day 5-7: OpenAI Integration
```bash
# Migrate OpenAI service layer
django_api/apps/openai_integration/services.py
django_api/apps/openai_integration/evaluators.py
django_api/apps/openai_integration/tasks.py  # Celery

# Configure Celery
django_api/config/celery.py
```

### Phase 3: Testing (Week 2)

```bash
# Day 1-2: Unit tests
pytest apps/users/tests/test_models.py
pytest apps/scenarios/tests/test_models.py

# Day 3-4: Integration tests
pytest apps/scenarios/tests/test_api.py
pytest apps/openai_integration/tests/test_services.py

# Day 5: End-to-end tests
pytest tests/integration/

# Day 6-7: Bug fixes and refactoring
```

### Phase 4: Parallel Deployment (Week 3)

#### Nginx Configuration for Parallel Running

```nginx
upstream flask_backend {
    server 127.0.0.1:5000;
}

upstream django_backend {
    server 127.0.0.1:8000;
}

server {
    listen 80;

    # Route to Django (new endpoints)
    location /api/v2/ {
        proxy_pass http://django_backend;
    }

    # Route to Flask (old endpoints, fallback)
    location /api/ {
        proxy_pass http://flask_backend;
    }
}
```

#### Deployment Steps

```bash
# 1. Deploy Django alongside Flask
# Both connected to same database

# 2. Start with /api/v2/ prefix for Django
# Keep Flask at /api/ temporarily

# 3. Test Django endpoints
curl http://localhost:8000/api/v2/scenarios/

# 4. Monitor logs
tail -f django_api/logs/django.log
tail -f flask_api/logs/flask.log

# 5. Gradually migrate traffic
# Update frontend to use /api/v2/ endpoints
```

### Phase 5: Complete Switchover (Week 4)

```bash
# 1. Update nginx to route /api/ to Django
location /api/ {
    proxy_pass http://django_backend;
}

# 2. Keep Flask running (read-only) for 48 hours

# 3. Monitor error rates
# Check Sentry dashboard

# 4. Decommission Flask
# Stop Flask processes
# Archive Flask code

# 5. Celebration! 🎉
```

## Testing Strategy

### 1. Database Compatibility Tests

```python
# tests/integration/test_database_compatibility.py

def test_can_read_flask_data():
    """Verify Django can read Flask-created data."""
    # Test that Django models can query Flask data
    scenario = AssistantScenario.objects.first()
    assert scenario is not None

def test_can_write_data():
    """Verify Django can write data."""
    scenario = AssistantScenario.objects.create(...)
    assert scenario.id is not None
```

### 2. API Compatibility Tests

```python
# Compare Flask and Django responses
def test_endpoint_parity():
    flask_response = requests.get('http://localhost:5000/api/scenarios')
    django_response = requests.get('http://localhost:8000/api/scenarios')

    # Compare structure
    assert set(flask_response.json()[0].keys()) == \
           set(django_response.json()['results'][0].keys())
```

### 3. Load Testing

```bash
# Using Apache Bench
ab -n 1000 -c 10 http://localhost:8000/api/scenarios/

# Using Locust
locust -f locustfile.py --host=http://localhost:8000
```

## Rollback Plan

### If Migration Fails

**Symptoms of failure:**
- API errors > 5%
- Database corruption
- Performance degradation
- Data integrity issues

**Rollback procedure:**

```bash
# 1. Switch nginx back to Flask
# Update nginx.conf
location /api/ {
    proxy_pass http://flask_backend;
}
sudo nginx -s reload

# 2. Stop Django services
sudo systemctl stop django
sudo systemctl stop celery

# 3. Restore database if needed
psql medical_practice < backup_YYYYMMDD.sql

# 4. Verify Flask is healthy
curl http://localhost:5000/api/scenarios/

# 5. Investigate Django issues
tail -f django_api/logs/django.log
```

### Database Rollback

```bash
# If Django created unwanted schema changes:

# 1. Backup current state
pg_dump medical_practice > backup_during_migration.sql

# 2. Drop Django-added columns
ALTER TABLE user DROP COLUMN IF EXISTS is_staff;
ALTER TABLE user DROP COLUMN IF EXISTS is_active;
# ... etc

# 3. Or restore from pre-migration backup
psql medical_practice < backup_pre_migration.sql
```

## Post-Migration

### Week 1 After Switchover

- [ ] Monitor error rates daily
- [ ] Check database performance
- [ ] Verify all integrations working
- [ ] Review Sentry errors
- [ ] Collect user feedback

### Week 2-4

- [ ] Optimize slow endpoints
- [ ] Add missing features
- [ ] Improve test coverage
- [ ] Update documentation
- [ ] Train team on Django

### Ongoing

- [ ] Archive Flask codebase
- [ ] Remove Flask from deployment
- [ ] Update CI/CD pipelines
- [ ] Celebrate successful migration! 🎊

## Common Issues & Solutions

### Issue: Django can't authenticate existing users

**Problem:** Flask uses PBKDF2-SHA256, Django expects Django's format

**Solution:**
```python
# Create management command to rehash passwords
# Or: Override Django's check_password()

from passlib.hash import pbkdf2_sha256

def check_password(self, raw_password):
    return pbkdf2_sha256.verify(raw_password, self.password)
```

### Issue: Foreign key constraints fail

**Problem:** Django expects different constraint names

**Solution:**
```bash
# Rename constraints to Django's format
ALTER TABLE assistant_tags
  RENAME CONSTRAINT fk_scenario
  TO assistant_tags_scenario_id_fkey;
```

### Issue: N+1 queries slowing down API

**Solution:**
```python
# Use select_related and prefetch_related
scenarios = AssistantScenario.objects.select_related('character') \
                                     .prefetch_related('tags', 'rubric_questions')
```

## Validation Checklist

Before declaring migration complete:

- [ ] All Flask endpoints have Django equivalents
- [ ] API response formats match
- [ ] Authentication works for existing users
- [ ] OpenAI integration functioning
- [ ] Assessment evaluation working
- [ ] Performance metrics acceptable
- [ ] Error rates < 1%
- [ ] All tests passing
- [ ] Documentation updated
- [ ] Team trained

## Questions & Support

For migration issues:
1. Check this guide
2. Review Django logs: `django_api/logs/`
3. Check database state: `python manage.py dbshell`
4. Review Sentry errors
5. Contact [your team lead]

---

**Remember:** This is a gradual migration. Take time to test thoroughly at each phase. It's better to delay than to rush and break production.

Good luck! 🚀
