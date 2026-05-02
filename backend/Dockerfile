# ── Backend Dockerfile ──────────────────────────────────────────────
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies (git needed for repo cloning)
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy app source
COPY . .

EXPOSE 5000

ENV FLASK_APP=app.py
ENV FLASK_ENV=production

# Use gunicorn for production (4 workers, 120s timeout for AI calls)
CMD ["gunicorn", "--bind", "0.0.0.0:10000", "--workers", "2", "--timeout", "120", "app:app"]
