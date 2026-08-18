# test_harness/Dockerfile — DEV/DEMO UI container (NOT production).
# Builds the SDK + FastAPI harness deps and serves the drag-drop UI + hls.js player.
FROM python:3.11-slim

# FFmpeg is a system dependency of the pipeline.
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY pyproject.toml ./
COPY cowatch_sdk ./cowatch_sdk
COPY test_harness ./test_harness

RUN pip install --no-cache-dir . \
    && pip install --no-cache-dir fastapi uvicorn python-multipart

EXPOSE 8000
CMD ["uvicorn", "test_harness.backend:app", "--host", "0.0.0.0", "--port", "8000"]
