# Use a minimal, secure Python image
FROM python:3.10-bullseye

# Set a working directory
WORKDIR /app

# Install system dependencies for psycopg2 and gunicorn
RUN apt-get update && apt-get install -y gcc libpq-dev && \
    rm -rf /var/lib/apt/lists/*

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt gunicorn

# Copy application code
COPY . .

# Drop root privileges
RUN useradd --create-home appuser
USER appuser

# Expose the internal API port
EXPOSE 8000

# Run via Gunicorn (WSGI production server)
CMD ["gunicorn", "-b", "0.0.0.0:8000", "app:app"]
