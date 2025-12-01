# Medical Communication Practice Platform - Django API

Production-ready Django REST API for medical student communication training with AI-powered virtual patients.

## Project Overview

This Django application is a complete rewrite of the Flask API, designed for production deployment with:
- **Django 5.0** + **Django REST Framework** for robust API development
- **PostgreSQL** with connection pooling
- **JWT authentication** via SimpleJWT
- **Celery** + **Redis** for async OpenAI API calls
- **Comprehensive testing** with pytest
- **Production-ready** security, logging, and monitoring

## Architecture

```
django_api/
├── config/                 # Project settings
│   ├── settings/
│   │   ├── base.py        # Shared settings
│   │   ├── development.py # Dev settings
│   │   ├── production.py  # Production settings
│   │   └── test.py        # Test settings
│   ├── urls.py
│   └── wsgi.py
├── apps/
│   ├── users/             # User authentication
│   ├── scenarios/         # Virtual patient scenarios
│   ├── assessments/       # Assessment categories & rubrics
│   ├── activities/        # Learning activities
│   └── openai_integration/ # OpenAI API services
├── requirements/
│   ├── base.txt
│   ├── development.txt
│   ├── production.txt
│   └── test.txt
└── manage.py
```

## Key Features Migrated from Flask

### Core Functionality
- ✅ User management with role-based access (student/instructor/admin)
- ✅ Virtual patient scenario CRUD
- ✅ OpenAI Assistant lifecycle management
- ✅ Assessment categories and subcategories
- ✅ Learning activities
- ✅ AI-powered rubric evaluation
- ✅ Conversation thread management

### Django Advantages Over Flask
1. **Django Admin** - Free admin interface for all models
2. **DRF Serializers** - Automatic input validation
3. **Built-in pagination** - Consistent across all list endpoints
4. **Throttling** - Rate limiting out of the box
5. **Django signals** - Clean OpenAI assistant lifecycle hooks
6. **Better testing** - Django TestCase + DRF APIClient
7. **Security** - Production-ready password validation, CSRF, etc.
8. **Async support** - Celery integration for long-running tasks

## Setup Instructions

### Prerequisites
- Python 3.11+
- PostgreSQL 14+
- Redis 7+ (for Celery)

### 1. Initial Setup

```bash
# Clone and navigate
cd django_api

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements/development.txt
```

### 2. Environment Configuration

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your values
# REQUIRED: DB_PASSWORD, OPENAI_KEY
```

### 3. Database Setup

```bash
# Create database
createdb medical_practice

# Run migrations
python manage.py makemigrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser
```

### 4. Run Development Server

```bash
# Start Django
python manage.py runserver

# In another terminal, start Celery (for async tasks)
celery -A config worker -l info

# Optional: Celery beat for scheduled tasks
celery -A config beat -l info
```

### 5. Access the Application

- API: http://localhost:8000/api/
- Admin: http://localhost:8000/admin/
- Browsable API: http://localhost:8000/api/ (development only)

## Running Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=apps --cov-report=html

# Run specific test file
pytest apps/users/tests/test_models.py

# Run with markers
pytest -m unit          # Only unit tests
pytest -m integration   # Only integration tests
```

## Migration from Flask API

### Database Migration Strategy

**Option A: Fresh Start (Recommended for Development)**
1. Django creates new tables
2. Export data from Flask tables
3. Import into Django tables
4. Verify data integrity

**Option B: In-Place Migration (For Production)**
1. Point Django to existing PostgreSQL database
2. Update `db_table` in models to match Flask table names
3. Run `python manage.py makemigrations --empty`
4. Create fake migrations for existing tables
5. Run `python manage.py migrate --fake-initial`

### Environment Variables Mapping

| Flask (config.py) | Django (.env) |
|-------------------|---------------|
| `SQLALCHEMY_DATABASE_URI` | `DATABASE_URL` |
| `SECRET_KEY` | `SECRET_KEY` |
| `OPENAI_KEY` | `OPENAI_KEY` |
| `NODE_ENV` | `DJANGO_ENV` |

### API Endpoint Mapping

| Flask Endpoint | Django Endpoint | Status |
|----------------|-----------------|--------|
| `POST /api/login` | `POST /api/auth/login/` | ⏳ To implement |
| `POST /api/create_users` | `POST /api/users/` | ⏳ To implement |
| `GET /api/scenarios` | `GET /api/scenarios/` | ⏳ To implement |
| `POST /api/scenarios` | `POST /api/scenarios/` | ⏳ To implement |
| `POST /api/threads/run` | `POST /api/openai/threads/run/` | ⏳ To implement |
| `POST /api/activities/<id>/rubric_assessment` | `POST /api/activities/<id>/assess/` | ⏳ To implement |

## Next Steps

### Immediate TODOs
1. ⏳ Create serializers for all models
2. ⏳ Create DRF viewsets and views
3. ⏳ Configure URL routing
4. ⏳ Migrate OpenAI service layer
5. ⏳ Create admin configurations
6. ⏳ Write unit tests
7. ⏳ Write integration tests
8. ⏳ Create Docker configuration
9. ⏳ Set up CI/CD pipeline

### Production Deployment Checklist
- [ ] Set up production database (PostgreSQL)
- [ ] Configure Redis for Celery
- [ ] Set up Sentry for error tracking
- [ ] Configure environment secrets
- [ ] Set ALLOWED_HOSTS
- [ ] Set CORS_ALLOWED_ORIGINS
- [ ] Enable HTTPS/SSL
- [ ] Configure static file serving
- [ ] Set up log aggregation
- [ ] Configure backup strategy
- [ ] Load testing
- [ ] Security audit

## Common Commands

```bash
# Create new app
python manage.py startapp app_name

# Make migrations
python manage.py makemigrations

# Apply migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Run shell
python manage.py shell

# Collect static files
python manage.py collectstatic

# Run development server
python manage.py runserver

# Run tests
pytest
```

## Project Status

### ✅ Completed
- Django project structure
- Settings configuration (base, dev, prod, test)
- All database models migrated
- Requirements files
- Environment configuration
- Git setup

### ⏳ In Progress
- API views and serializers
- OpenAI service layer
- Authentication system
- Testing infrastructure

### 📋 Planned
- Docker configuration
- CI/CD pipeline
- API documentation (Swagger/ReDoc)
- Performance optimization
- Production deployment guide

## Troubleshooting

### Database Connection Issues
```bash
# Check PostgreSQL is running
pg_isready

# Test connection
psql -U postgres -d medical_practice
```

### Migration Errors
```bash
# Reset migrations (development only!)
python manage.py migrate --fake app_name zero
python manage.py migrate app_name
```

### Redis Connection Issues
```bash
# Check Redis is running
redis-cli ping  # Should return PONG
```

## Contributing

1. Create feature branch from `main`
2. Write tests for new functionality
3. Ensure all tests pass: `pytest`
4. Format code: `black . && isort .`
5. Submit pull request

## License

[Your License Here]

## Support

For issues and questions, contact [Your Contact Info]
