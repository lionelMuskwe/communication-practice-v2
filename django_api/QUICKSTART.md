# Django API - Quick Start Guide

## 🚀 Get Running in 5 Minutes

### Prerequisites
- Python 3.11+
- PostgreSQL 14+ (running)
- OpenAI API Key

---

## Step-by-Step Setup

### 1. Install Dependencies

```bash
cd django_api

# Create virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate

# Activate (Linux/Mac)
source venv/bin/activate

# Install packages
pip install -r requirements/development.txt
```

### 2. Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your values
# Required:
# - DATABASE_URL or DB_* variables
# - OPENAI_KEY
```

**Example .env**:
```ini
DJANGO_ENV=development
SECRET_KEY=your-secret-key-here
DATABASE_URL=postgresql://postgres:password@localhost:5432/medical_practice
OPENAI_KEY=sk-your-openai-key-here
```

### 3. Setup Database

```bash
# Create database (if needed)
createdb medical_practice

# Run migrations
python manage.py makemigrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser
```

### 4. Run Server

```bash
# Start Django development server
python manage.py runserver

# Server will be available at:
# http://localhost:8000/
```

---

## 🎯 Quick Test

### Test 1: Admin Interface
```
Open: http://localhost:8000/admin/
Login with your superuser credentials
```

### Test 2: API Endpoint
```bash
# Create a user
curl -X POST http://localhost:8000/api/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "test",
    "email": "test@example.com",
    "password": "testpass123",
    "password_confirm": "testpass123",
    "role": "student"
  }'

# Login
curl -X POST http://localhost:8000/api/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpass123"
  }'

# Copy the token from response
```

### Test 3: Authenticated Request
```bash
# Replace YOUR_TOKEN with the token from login
curl -X GET http://localhost:8000/api/scenarios/ \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 📋 Common Commands

```bash
# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Run development server
python manage.py runserver

# Django shell
python manage.py shell

# Make new migrations
python manage.py makemigrations

# Show SQL for migration
python manage.py sqlmigrate app_name migration_number
```

---

## 🔍 Troubleshooting

### Database Connection Error
```bash
# Check PostgreSQL is running
pg_isready

# Test connection
psql -U postgres -d medical_practice

# Verify .env DATABASE_URL is correct
```

### OpenAI API Error
```bash
# Verify OPENAI_KEY in .env
echo $OPENAI_KEY

# Test key (if on Linux/Mac)
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer YOUR_KEY"
```

### Migration Errors
```bash
# Check migration status
python manage.py showmigrations

# Reset migrations (development only!)
python manage.py migrate app_name zero
python manage.py migrate app_name
```

### Import Errors
```bash
# Verify all dependencies installed
pip list

# Reinstall requirements
pip install -r requirements/development.txt
```

---

## 📚 Key Endpoints

### Authentication
- `POST /api/login/` - Login & get JWT token
- `POST /api/register/` - Create new user

### Scenarios
- `GET /api/scenarios/` - List scenarios
- `POST /api/scenarios/` - Create scenario
- `PUT /api/scenarios/{id}/` - Update scenario
- `DELETE /api/scenarios/{id}/` - Delete scenario

### Conversations
- `POST /api/threads/` - Create thread
- `POST /api/threads/{id}/messages/` - Add message
- `POST /api/threads/run/` - Execute conversation

### Assessment
- `POST /api/activities/{id}/rubric_assessment/` - AI evaluation

---

## 🎓 Next Steps

1. **Read Full Documentation**: See `README.md`
2. **Review Migration Guide**: See `MIGRATION_GUIDE.md`
3. **Check Implementation Status**: See `IMPLEMENTATION_STATUS.md`
4. **Understand Completion**: See `COMPLETION_SUMMARY.md`

---

## ⚡ Quick Development Tips

### View API Documentation (Dev Mode)
```
Open: http://localhost:8000/api/scenarios/
(DRF Browsable API)
```

### Django Shell Quick Test
```bash
python manage.py shell

>>> from apps.users.models import User
>>> User.objects.all()
>>> from apps.scenarios.models import AssistantScenario
>>> AssistantScenario.objects.count()
```

### Check Logs
```bash
# Logs appear in console when running:
python manage.py runserver
```

---

## 🚀 Ready to Deploy?

See `MIGRATION_GUIDE.md` for production deployment instructions.

---

**You're all set! Happy coding! 🎉**
