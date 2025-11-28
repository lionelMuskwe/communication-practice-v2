#!/usr/bin/env python
"""
Django Setup Verification Script
Run this to verify your Django installation is configured correctly.
"""
import os
import sys
from pathlib import Path

def check_python_version():
    """Check Python version >= 3.11"""
    version = sys.version_info
    if version.major < 3 or (version.major == 3 and version.minor < 11):
        return False, f"Python {version.major}.{version.minor} (need 3.11+)"
    return True, f"Python {version.major}.{version.minor}.{version.micro}"

def check_virtualenv():
    """Check if running in virtual environment"""
    in_venv = hasattr(sys, 'real_prefix') or (
        hasattr(sys, 'base_prefix') and sys.base_prefix != sys.prefix
    )
    return in_venv, "Virtual environment active" if in_venv else "Not in virtualenv"

def check_env_file():
    """Check if .env file exists"""
    env_exists = Path('.env').exists()
    return env_exists, ".env file found" if env_exists else ".env missing (copy from .env.example)"

def check_django_installation():
    """Check if Django is installed"""
    try:
        import django
        return True, f"Django {django.get_version()}"
    except ImportError:
        return False, "Django not installed"

def check_drf_installation():
    """Check if Django REST Framework is installed"""
    try:
        import rest_framework
        return True, f"DRF {rest_framework.VERSION}"
    except ImportError:
        return False, "Django REST Framework not installed"

def check_database_config():
    """Check if database is configured in .env"""
    if not Path('.env').exists():
        return False, ".env file missing"

    with open('.env') as f:
        content = f.read()
        has_db = 'DATABASE_URL' in content or 'DB_PASSWORD' in content
        return has_db, "Database configuration found" if has_db else "Database not configured"

def check_openai_config():
    """Check if OpenAI is configured"""
    if not Path('.env').exists():
        return False, ".env file missing"

    with open('.env') as f:
        content = f.read()
        has_openai = 'OPENAI_KEY' in content
        return has_openai, "OpenAI configuration found" if has_openai else "OpenAI key not configured"

def check_apps_directory():
    """Check if apps directory exists with all apps"""
    apps_dir = Path('apps')
    if not apps_dir.exists():
        return False, "apps/ directory not found"

    required_apps = ['users', 'scenarios', 'assessments', 'activities', 'openai_integration']
    existing_apps = [d.name for d in apps_dir.iterdir() if d.is_dir() and not d.name.startswith('__')]
    missing = set(required_apps) - set(existing_apps)

    if missing:
        return False, f"Missing apps: {', '.join(missing)}"
    return True, f"All {len(required_apps)} apps present"

def check_requirements():
    """Check if requirements can be imported"""
    checks = {
        'psycopg2': 'PostgreSQL driver',
        'celery': 'Celery task queue',
        'redis': 'Redis client',
        'corsheaders': 'CORS headers',
    }

    results = []
    all_ok = True
    for package, description in checks.items():
        try:
            __import__(package)
            results.append(f"  ✓ {description}")
        except ImportError:
            results.append(f"  ✗ {description} (pip install {package})")
            all_ok = False

    return all_ok, '\n'.join(results)

def main():
    print("=" * 60)
    print("Django Setup Verification")
    print("=" * 60)
    print()

    checks = [
        ("Python Version", check_python_version),
        ("Virtual Environment", check_virtualenv),
        (".env Configuration", check_env_file),
        ("Django Installation", check_django_installation),
        ("Django REST Framework", check_drf_installation),
        ("Database Configuration", check_database_config),
        ("OpenAI Configuration", check_openai_config),
        ("Apps Directory", check_apps_directory),
        ("Required Packages", check_requirements),
    ]

    results = []
    for name, check_func in checks:
        try:
            status, message = check_func()
            symbol = "✓" if status else "✗"
            results.append((name, status, symbol, message))
            print(f"{symbol} {name:25} {message}")
        except Exception as e:
            results.append((name, False, "✗", str(e)))
            print(f"✗ {name:25} ERROR: {e}")

    print()
    print("=" * 60)

    passed = sum(1 for _, status, _, _ in results if status)
    total = len(results)

    if passed == total:
        print(f"✓ All checks passed ({passed}/{total})")
        print()
        print("Next steps:")
        print("1. python manage.py makemigrations")
        print("2. python manage.py migrate")
        print("3. python manage.py createsuperuser")
        print("4. python manage.py runserver")
        return 0
    else:
        print(f"✗ {total - passed} checks failed ({passed}/{total} passed)")
        print()
        print("Please fix the issues above before proceeding.")
        return 1

if __name__ == '__main__':
    sys.exit(main())
