# Development Guide

## 🚀 Quick Start (Development Mode)

### **Start Development Environment**
```bash
docker-compose -f docker-compose.dev.yml up --build
```

### **Access Services**
- **React Frontend**: http://localhost:3000
- **Django API**: http://localhost:8000
- **Django Admin**: http://localhost:8000/admin
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

---

## 🔥 Hot Reload / Live Reload Features

### **✅ What Auto-Reloads:**

| Service | Changes Detected | Reload Time |
|---------|-----------------|-------------|
| **React Frontend** | `.js`, `.jsx`, `.ts`, `.tsx`, `.css` | Instant (HMR) |
| **Django Backend** | `.py` files | 1-2 seconds |
| **Celery Worker** | `.py` files | 3-5 seconds |
| **Celery Beat** | Manual restart | - |

### **How It Works:**

#### **1. React Hot Module Replacement (HMR)**
- Edit any file in `react_frontend/src/`
- Browser updates **instantly** without full page refresh
- State is preserved during updates
- Uses Webpack/Vite dev server

#### **2. Django Development Server**
- Uses `python manage.py runserver` instead of Gunicorn
- Watches all `.py` files
- Auto-restarts on code changes
- Shows detailed error pages with stack traces

#### **3. Celery Worker Auto-Reload**
- Uses `watchmedo` (watchdog library)
- Monitors all `.py` files recursively
- Auto-restarts worker when changes detected
- Great for testing async tasks

---

## 📂 Volumes (What Gets Mounted)

### **Django:**
```yaml
volumes:
  - ./django_api:/app  # Full source code mounted
```
**Result**: Any change to Python files = instant reload

### **React:**
```yaml
volumes:
  - ./react_frontend:/app
  - /app/node_modules  # Anonymous volume (don't override)
```
**Result**: Any change to JS/CSS files = instant HMR

---

## 🛠️ Development Workflow

### **Typical Development Flow:**

```bash
# 1. Start services
docker-compose -f docker-compose.dev.yml up

# 2. Make changes to your code
# ✅ Django: Edit django_api/apps/users/views.py
# ✅ React: Edit react_frontend/src/components/Login.jsx

# 3. See changes immediately!
# No need to rebuild or restart containers
```

### **When You Need to Rebuild:**

Only rebuild if you change:
- ❌ `Dockerfile`
- ❌ `requirements.txt` / `package.json` (new dependencies)
- ❌ Environment variables in compose file

```bash
docker-compose -f docker-compose.dev.yml up --build
```

---

## 🐛 Debugging

### **Interactive Python Debugger (pdb/ipdb)**

Add breakpoint in your Django code:
```python
import ipdb; ipdb.set_trace()
```

Attach to running container:
```bash
docker attach medical_practice_web_dev
```

### **View Logs**
```bash
# All services
docker-compose -f docker-compose.dev.yml logs -f

# Specific service
docker-compose -f docker-compose.dev.yml logs -f web
docker-compose -f docker-compose.dev.yml logs -f frontend
docker-compose -f docker-compose.dev.yml logs -f celery_worker
```

### **Execute Commands in Container**
```bash
# Django shell
docker-compose -f docker-compose.dev.yml exec web python manage.py shell

# Create migrations
docker-compose -f docker-compose.dev.yml exec web python manage.py makemigrations

# Run migrations
docker-compose -f docker-compose.dev.yml exec web python manage.py migrate

# Create superuser
docker-compose -f docker-compose.dev.yml exec web python manage.py createsuperuser

# Run tests
docker-compose -f docker-compose.dev.yml exec web pytest
```

---

## 🔧 Environment Configuration

### **Development Environment Variables**

Create `.env` file in project root:
```bash
# Database
DB_NAME=medical_practice_dev
DB_USER=postgres
DB_PASSWORD=postgres

# Django
SECRET_KEY=dev-secret-key-not-for-production
DEBUG=True

# OpenAI
OPENAI_KEY=your-openai-api-key-here

# Superuser (optional, for auto-creation)
DJANGO_SUPERUSER_USERNAME=admin
DJANGO_SUPERUSER_EMAIL=admin@example.com
DJANGO_SUPERUSER_PASSWORD=admin123
```

---

## 📊 Production vs Development

| Feature | Development | Production |
|---------|-------------|------------|
| **Django Server** | `runserver` (auto-reload) | `gunicorn` (stable) |
| **React Build** | Dev server (HMR) | Static build (nginx) |
| **Debug Mode** | `DEBUG=True` | `DEBUG=False` |
| **Source Maps** | ✅ Enabled | ❌ Disabled |
| **Volumes** | Code mounted | Only data volumes |
| **Log Level** | `DEBUG` | `INFO`/`WARNING` |
| **Hot Reload** | ✅ Enabled | ❌ Disabled |
| **Celery Loglevel** | `debug` | `info` |

---

## 🚨 Troubleshooting

### **React changes not reflecting?**
```bash
# Windows/Mac: Enable polling for file watching
# Already configured in docker-compose.dev.yml:
CHOKIDAR_USEPOLLING=true
WATCHPACK_POLLING=true
```

### **Django not reloading?**
```bash
# Check if runserver is actually running
docker-compose -f docker-compose.dev.yml exec web ps aux

# Should see: python manage.py runserver 0.0.0.0:8000
```

### **Celery worker not reloading?**
```bash
# Verify watchdog is installed
docker-compose -f docker-compose.dev.yml exec celery_worker pip list | grep watchdog

# Check if watchmedo is running
docker-compose -f docker-compose.dev.yml exec celery_worker ps aux | grep watchmedo
```

### **node_modules issues in React?**
```bash
# Rebuild without cache
docker-compose -f docker-compose.dev.yml build --no-cache frontend

# Or delete node_modules volume
docker volume rm communication_practice_tool_frontend_node_modules
```

---

## 🎯 Best Practices

### **✅ DO:**
- Use `.env` for local configuration
- Commit code changes frequently
- Run tests before pushing
- Check logs when something breaks
- Use `ipdb` for debugging Django
- Use browser DevTools for React

### **❌ DON'T:**
- Change `docker-compose.yml` (production file)
- Commit sensitive keys to git
- Run production commands in dev (`collectstatic`, etc.)
- Install packages without updating requirements files

---

## 📦 Adding New Dependencies

### **Python (Django/Celery):**
```bash
# Add to django_api/requirements/development.txt or base.txt
# Then rebuild:
docker-compose -f docker-compose.dev.yml up --build web
```

### **JavaScript (React):**
```bash
# Add to react_frontend/package.json
# Then rebuild:
docker-compose -f docker-compose.dev.yml up --build frontend
```

---

## 🧪 Testing

### **Backend Tests:**
```bash
docker-compose -f docker-compose.dev.yml exec web pytest
docker-compose -f docker-compose.dev.yml exec web pytest --cov
```

### **Frontend Tests:**
```bash
docker-compose -f docker-compose.dev.yml exec frontend npm test
```

---

## 🎓 Summary

**Development mode gives you:**
- ⚡ Instant code changes (no rebuilds)
- 🔥 Hot module replacement (React)
- 🐛 Easy debugging with ipdb
- 📊 Detailed error pages
- 🔍 Live log streaming
- 🚀 Faster iteration speed

**Start coding with:**
```bash
docker-compose -f docker-compose.dev.yml up
```

**Happy coding! 🎉**
