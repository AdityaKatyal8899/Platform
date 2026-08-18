# CoWatch Video Pipeline SDK

Self-hostable video processing pipeline, extracted from the CoWatch platform.

**receive (handed in by the customer's backend) → transcode → HLS package →
upload to the customer's object storage → emit a result signal**

## Ownership boundary (important)

| Concern | Whose? | How |
|---|---|---|
| Source video + task trigger | **Customer** | Their backend calls the SDK with `video_id` + input |
| Object storage (segments) | **Customer** | Their S3 / R2 / MinIO (configured) |
| CDN (delivery) | **Customer** | Their CDN in front of the bucket (configured) |
| **Database** | **Customer** | The SDK owns **NONE**. It only **emits a result signal**; the customer persists it into their own DB however they want |
| Secrets | **Customer** | Supplied via env / `.env` (predefined names) or explicit `SDKConfig` |

> This package is independent. The original platform code (`backend/`) is **not**
> modified by this SDK.

## What you get (the "upper hands")

- **Streaming windowed upload** — segments are pushed to storage *as FFmpeg produces
  them* and deleted locally immediately. Tiny ephemeral disk, low cost, no
  "disk-full mid-transcode" failures.
- **Early-play readiness** — video is marked `ready` after `PREPLAY_THRESHOLD` (default
  30%) of segments upload, so playback starts before transcode finishes.
- **Resilient failure model** — upload errors abort the job cleanly; FFmpeg exit codes
  are captured with logs; local cleanup is guaranteed.
- **Exponential-backoff upload retries** (default 5 attempts).
- **Single-pass metadata + thumbnail.**
- **Pluggable backends** — storage (S3 / Local / S3-compatible), queue (Celery / inline),
  result (webhook / callback / logging).

## Install

```bash
pip install -e .
```

Requires `ffmpeg` and `ffprobe` on `PATH` (the container bundles them).

## Configure (secrets via env / `.env`)

Copy `.env.example` to `.env`, fill in, and **gitignore `.env`**. The variable names
are a published contract. Secrets are never logged by the SDK.

| Group | Key | Default |
|---|---|---|
| Storage | `STORAGE_BACKEND` | `s3` |
| | `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY`, `S3_SECRET` | — |
| | `S3_ENDPOINT_URL` (R2 / MinIO) | — |
| | `LOCAL_STORAGE_DIR` (for `local`) | `storage` |
| Delivery | `CDN_URL`, `DELIVERY_URL_TEMPLATE` | `{cdn}/videos/{video_id}/master.m3u8` |
| Queue | `QUEUE_BACKEND` | `inline` |
| | `CELERY_BROKER_URL` | `redis://localhost:6379/0` |
| Result | `RESULT_BACKEND` | `webhook` |
| | `RESULT_WEBHOOK_URL` | — |
| HLS | `HLS_SEGMENT_SECONDS`, `HLS_LIST_SIZE`, `HLS_PLAYLIST_TYPE`, `KEYFRAME_INTERVAL`, `AUDIO_BITRATE` | `4`, `0`, `vod`, `2.0`, `128k` |
| Runtime | `TEMP_DIR`, `UPLOAD_WINDOW`, `PREPLAY_THRESHOLD`, `RETRY_ATTEMPTS`, `RETRY_BACKOFF`, `FFMPEG_BIN`, `FFPROBE_BIN` | `storage/videos`, `10`, `0.30`, `5`, `1.0`, `ffmpeg`, `ffprobe` |

You may also construct `SDKConfig(...)` explicitly (e.g. per-tenant different S3) and
pass it in — useful for multi-tenant backends.

## Run

**CLI (inline, Local storage — easiest smoke test):**
```bash
cp .env.example .env   # edit: STORAGE_BACKEND=local, RESULT_BACKEND=logging
cowatch-sdk /path/to/video.mp4 --video-id my-video
```

**Python API (inline):**
```python
from cowatch_sdk import load_config, process_video_to_hls
process_video_to_hls("my-video", "/path/to/original.mp4", load_config())
```

**Async via Celery (mirrors a production deployment):**
```bash
export QUEUE_BACKEND=celery
export CELERY_BROKER_URL=redis://localhost:6379/0
celery -A cowatch_sdk.backends.queue.celery_app worker --loglevel=info
# enqueue from your backend:
python -c "from cowatch_sdk import load_config; from cowatch_sdk.backends.queue.celery import CeleryQueue; \
c=CeleryQueue(load_config()); c.enqueue('my-video', '/path/to/original.mp4', load_config())"
```

**In-process callback (embed the SDK, persist to your DB directly):**
```python
from cowatch_sdk import SDKConfig, CallbackResultSink, process_video_to_hls
cfg = SDKConfig(result_backend="callback")
cfg.result_sink = CallbackResultSink(lambda e: my_db.save(e))  # your DB write
process_video_to_hls("my-video", "/path/to/original.mp4", cfg)
```

**Container:**
```bash
docker build -t cowatch-sdk .
docker run --rm -e STORAGE_BACKEND=local -v $PWD:/data cowatch-sdk /data/video.mp4
```

## The result signal

Whatever `RESULT_BACKEND` you choose, the SDK emits events your backend consumes:
`status` (`processing`→`uploading`→`ready`/`failed`), `metadata` (`duration`,
`thumbnail_url`), `delivery_url` (the CDN manifest URL), and `error`. With `webhook`,
each is a JSON POST to `RESULT_WEBHOOK_URL`; with `callback`, each calls your function.
Your backend turns these into rows in **your** database.

## Layout

```
cowatch_sdk/
  config.py            # SDKConfig + env loader + adapter factory
  pipeline/            # de-coupled core (transcode / metadata / uploader) — no DB
  backends/
    storage/           # StorageBackend: s3, local (+ S3-compatible via endpoint)
    queue/             # QueueBackend: celery, inline
    result/            # ResultSink: webhook, callback, logging  (NO database sink)
  cli.py               # `cowatch-sdk` command
  container/           # Dockerfile + entrypoint
```

## Deferred (per plan)

- **Multi-tenant helpers** — per-call `SDKConfig` already enables it.
- **Backend adoption** — `backend/` later imports this package and drops duplicated logic.
