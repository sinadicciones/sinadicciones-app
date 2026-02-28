FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install dependencies
COPY backend/requirements-railway.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ .

# Railway uses PORT environment variable
ENV PORT=8001

# Expose port
EXPOSE $PORT

# Run the application - Railway sets PORT dynamically
CMD uvicorn server:app --host 0.0.0.0 --port ${PORT:-8001}
