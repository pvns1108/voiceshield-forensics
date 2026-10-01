FROM python:3.11-slim

# System dependencies for audio forensics (ffmpeg and libsndfile are required)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libsndfile1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application source
COPY . .

# Ensure data directories exist
RUN mkdir -p /app/data/uploads

# Port 7860 is default for Hugging Face Spaces; Render/Railway provide $PORT dynamically
ENV PORT=7860
EXPOSE 7860 8000 10000

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
