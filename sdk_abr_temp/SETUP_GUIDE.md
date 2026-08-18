# CoWatch Video Pipeline SDK — Complete Setup Guide

> **What this is**: A self-contained, self-hostable VOD processing pipeline (receive → transcode → HLS → store → emit result signal). The SDK owns **no database**; it receives a task from *your* backend, processes the video, uploads to *your* S3/R2/MinIO bucket, and emits a result signal you persist however you want.

> **Lives entirely in**: `sdk/` — the original `backend/` platform code is **not modified** by the SDK.

---

## 1. Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| **Python** | ≥ 3.9 | 3.10+ recommended |
| **ffmpeg + ffprobe** | 6.x+ | Must be on `PATH`. Windows: [gyan.dev](https://www.gyan.dev/ffmpeg/builds/) full build. Linux: `apt install ffmpeg` / `dnf install ffmpeg`. macOS: `brew install ffmpeg`. |
| **Redis** | 7.x+ | Only needed if `QUEUE_BACKEND=celery`. |
| **S3-compatible storage** | — | AWS S3, Cloudflare R2, MinIO, etc. (optional — local mode works without it). |
| **CDN** | — | CloudFront, Cloudflare, Bunny, etc. (optional — local mode serves same-origin). |

---

## 2. Installation

```bash
# 1) Clone the repo (or copy the sdk/ folder to your project)
git clone <your-repo>
cd sdk

# 2) Install the SDK in editable mode
pip install -e .

# 3) Install test-harness deps (for the drag-drop UI + player)
pip install fastapi uvicorn python-multipart

# 4) (Optional) Celery worker deps if you want async queue mode
pip install celery redis
```

**Verify:**
```bash
python -c "from cowatch_sdk import SDKConfig, process_video_to_hls; print('SDK import OK')"
ffmpeg -version   # must print version info
ffprobe -version  # must print version info
```

---

## 3. Configuration

All configuration is via **`SDKConfig`** (12-factor, env-driven). You can:

- Load from environment (recommended for prod): `cfg = SDKConfig.load_config()`
- Construct explicitly (recommended for tests/multi-tenant): `cfg = SDKConfig(...)`
- Pass through a queue: `cfg.to_dict()` → `config_from_dict(d)`

### Environment variables (`.env` or shell)

| Variable | Default | Description |
|----------|---------|-------------|
| `STORAGE_BACKEND` | `s3` | `s3` or `local` |
| `S3_BUCKET` | — | Required if `s3` |
| `S3_REGION` | — | e.g. `ap-south-1`, `us-east-1` |
| `S3_ACCESS_KEY` | — | AWS / R2 / MinIO access key |
| `S3_SECRET` | — | Secret key |
| `S3_ENDPOINT_URL` | — | For R2/MinIO (e.g. `https://<acct>.r2.cloudflarestorage.com`) |
| `CDN_URL` | — | Your CDN root (e.g. `https://dquh342ykpkwq.cloudfront.net`) |
| `DELIVERY_URL_TEMPLATE` | `{cdn}/videos/{video_id}/master.m3u8` | How the final HLS URL is built |
| `LOCAL_STORAGE_DIR` | `storage` | Local disk root (used when `local` backend) |
| `QUEUE_BACKEND` | `inline` | `inline` (sync) or `celery` |
| `CELERY_BROKER_URL` | `redis://localhost:6379/0` | |
| `RESULT_BACKEND` | `webhook` | `webhook`, `logging`, `callback` |
| `RESULT_WEBHOOK_URL` | — | Required if `webhook` |
| `HLS_SEGMENT_SECONDS` | `4` | Segment duration |
| `HLS_LIST_SIZE` | `0` | `0` = keep all (VOD) |
| `HLS_PLAYLIST_TYPE` | `vod` | `vod` or `event` |
| `KEYFRAME_INTERVAL` | `2.0` | Seconds between forced keyframes (ABR alignment) |
| `AUDIO_BITRATE` | `128k` | Audio encode bitrate |
| `HLS_PLAYLIST_TYPE` | `true` | Force specific HLS playlist type (e.g. vod) |
| `ABR_LADDER` | *(default mobile-first)* | Custom ladder: `name:w:h:vbit[:abit],...` |
| `TEMP_DIR` | `storage/videos` | Temp work dir (cleaned up after cloud uploads) |
| `UPLOAD_WINDOW` | `10` | Segments per upload batch |
| `PREPLAY_THRESHOLD` | `0.30` | Fraction of segments before `ready` |
| `RETRY_ATTEMPTS` | `5` | Upload retries |
| `RETRY_BACKOFF` | `1.0` | Initial backoff (seconds) |

### HLS Transcoding Settings
```
240p  426x240   600k
360p  640x360  1000k
720p 1280x720  2500k
```
Override via `ABR_LADDER="240p:426:240:600k,720p:1280:720:2500k,1080p:1920:1080:5000k"`

### Source-aware ladder (auto, no upscale)
The SDK **probes the source resolution** and:
- Drops any rung taller than the source (never upscale).
- If source > top rung, appends a true **source-resolution native** rung (real quality, no re-encode to 720p).
- If source < smallest rung, falls back to a single native rung.
- Probe failure → safe fallback: full ladder unchanged.

---

## 4. Running the Test Harness (Local + Cloud)

The harness is a FastAPI app with a drag-drop UI + hls.js player + live logs.

### Local-only (zero infra, works immediately)
```bash
cd sdk
uvicorn test_harness.backend:app --reload --port 8000
# open http://localhost:8000
```
- Select a video → **Submit** → watch pipeline logs → player appears with **Auto / 240p / 360p / 720p** quality selector.
- HLS is served same-origin at `/hls/{id}/master.m3u8` — no S3, no CDN, no CORS.
- Files land in `sdk/storage/videos/{id}/`.

### Cloud (S3 + CDN) — via the same UI
1. In the UI, switch **Storage backend** → **S3 Cloud Storage Backend**.
2. Fill in:
   - S3 Bucket, Region, Access Key, Secret Key
   - (Optional) S3 Endpoint URL for R2/MinIO
   - **CDN / CloudFront Root URL** — must be a valid HTTPS origin with CORS allowing your UI origin.
3. Submit — the pipeline uploads to your bucket, CDN delivers, player loads the CDN URL.

**CORS for CDN (required for in-page player):**
```json
# S3 bucket CORS (or CloudFront Response Headers Policy)
{
  "AllowedHeaders": ["*"],
  "AllowedMethods": ["GET", "HEAD"],
  "AllowedOrigins": ["http://localhost:8000", "https://yourdomain.com"],
  "ExposeHeaders": ["ETag", "Content-Length"],
  "MaxAgeSeconds": 3000
}
```
If you hit `403` from CloudFront → your **bucket policy `AWS:SourceArn` must match the actual CloudFront distribution ID** (not an old one).

### Headless smoke test (no browser)
```bash
python test_harness/smoke_test.py path/to/video.mp4
```
Prints renditions + produced files → confirms pipeline works end-to-end.

---

## 5. Using the SDK in Your Own Backend

### Minimal inline (sync) example
```python
from cowatch_sdk import SDKConfig, CallbackResultSink, process_video_to_hls

events = []
def handler(ev):
    events.append(ev)
    if ev.get("event") == "delivery_url":
        print("READY:", ev["url"])
    if ev.get("event") == "renditions":
        for r in ev["renditions"]:
            print(f"  {r['name']} ({r['height']}p) → {r['url']}")

cfg = SDKConfig(
    storage_backend="local",          # or "s3" + s3_* fields
    local_storage_dir="/data/storage",
    result_backend="callback",
)
cfg.result_sink = CallbackResultSink(handler)

process_video_to_hls("my-video-001", "/tmp/input.mp4", cfg)
# blocks until done; events fire synchronously
```

### Async via Celery (production pattern)
```python
# tasks.py
from celery import Celery
from cowatch_sdk import SDKConfig, process_video_to_hls, config_from_dict

celery = Celery("worker", broker="redis://localhost:6379/0")

@celery.task
def transcode_task(cfg_dict, video_id, input_path):
    cfg = config_from_dict(cfg_dict)
    process_video_to_hls(video_id, input_path, cfg)

# your API endpoint
cfg = SDKConfig(storage_backend="s3", s3_bucket="...", cdn_url="https://cdn.example.com", ...)
celery.send_task("transcode_task", args=[cfg.to_dict(), video_id, input_path])
```

### Result sinks (how you get the outcome)
| Sink | Use case | How to enable |
|------|----------|---------------|
| `WebhookResultSink` | Default — POST JSON to your API | `RESULT_BACKEND=webhook`, `RESULT_WEBHOOK_URL=https://yourapi.com/cowatch/webhook` |
| `CallbackResultSink` | In-process (tests, CLI, sync workers) | `cfg.result_sink = CallbackResultSink(my_fn)` |
| `LoggingResultSink` | Dev / smoke tests | `RESULT_BACKEND=logging` |

**Event schema** (all sinks emit these):
```json
{ "video_id": "...", "event": "status",       "status": "processing|uploading|ready|failed" }
{ "video_id": "...", "event": "metadata",     "duration": 123.45, "thumbnail_url": "..." }
{ "video_id": "...", "event": "delivery_url", "url": "https://cdn/.../master.m3u8" }
{ "video_id": "...", "event": "renditions",   "renditions": [ {"name":"240p","width":426,"height":240,"video_bitrate":"600k","audio_bitrate":"128k","url":"..."}, ... ] }
{ "video_id": "...", "event": "error",        "error": "..." }
```
Persist whatever you need into **your** database — the SDK never touches a DB.

---

## 6. Architecture Overview (for integration decisions)

```
┌─────────────────────┐     ┌──────────────────────┐     ┌─────────────────────┐
│  YOUR BACKEND       │────▶│  CoWatch SDK         │────▶│  YOUR STORAGE       │
│  (API, queue, DB)   │     │  (pure Python,       │     │  (S3 / R2 / MinIO   │
│                     │     │   no DB, no net)     │     │   + CDN)            │
└─────────────────────┘     └──────────────────────┘     └─────────────────────┘
        │                            │                             │
        │  1. Receives upload        │  2. ffprobe → probe src     │
        │  2. Creates video_id       │  3. ffmpeg HLS (ABR)        │
        │  3. Calls SDK              │  4. Parallel upload         │
        │                            │  5. Emits result signal     │
        ◀────────────────────────────┘                             │
        6. Persists metadata from result signal                    │
```

**Key boundaries:**
- **SDK owns**: transcode logic, HLS packaging, segment upload, keyframe alignment, ABR ladder, result signaling.
- **Customer owns**: database, auth, API, queue, storage bucket, CDN, playback UI.
- **No `sqlalchemy`, no `boto3`, no `celery` imports unless you select those backends** (lazy imports keep deps optional).

---

## 7. CLI (self-hosted container / one-off jobs)

```bash
# Install with CLI extra
pip install -e .  # cowatch-sdk command available

# Process a video (local storage)
cowatch-sdk process \
  --storage-backend local \
  --local-storage-dir /data/storage \
  --result-backend logging \
  /path/to/video.mp4

# With S3 + webhook
cowatch-sdk process \
  --storage-backend s3 \
  --s3-bucket my-bucket \
  --s3-region ap-south-1 \
  --cdn-url https://cdn.example.com \
  --result-backend webhook \
  --result-webhook-url https://api.example.com/cowatch/webhook \
  /path/to/video.mp4
```

---

## 8. File Layout (what you can import)

```
sdk/
├── cowatch_sdk/
│   ├── __init__.py           # exports: SDKConfig, SDKConfig, process_video_to_hls, CallbackResultSink, ...
│   ├── config.py             # SDKConfig, SDKConfig, DEFAULT_ABR_LADDER, adapt_ladder, load_config, ...
│   ├── pipeline/
│   │   ├── transcode.py      # run_pipeline, _build_ffmpeg_args (ABR + source-aware)
│   │   ├── metadata.py       # probe_source, capture_duration, generate_thumbnail
│   │   └── uploader.py       # run_uploader (windowed, parallel, pre-play threshold)
│   ├── backends/
│   │   ├── storage/
│   │   │   ├── base.py       # StorageBackend (ABC)
│   │   │   ├── local.py      # LocalStorage
│   │   │   └── s3.py         # S3Storage (boto3, lazy)
│   │   ├── queue/
│   │   │   ├── base.py       # QueueBackend (ABC)
│   │   │   ├── inline.py     # InlineQueue (sync)
│   │   │   └── celery.py     # CeleryQueue
│   │   └── result/
│   │       ├── base.py       # ResultSink (ABC)
│   │       ├── webhook.py    # WebhookResultSink
│   │       ├── callback.py   # CallbackResultSink
│   │       └── logging.py    # LoggingResultSink
│   └── cli.py                # cowatch-sdk CLI
├── test_harness/
│   ├── backend.py            # FastAPI + /upload, /status, /hls/{id}/...
│   ├── static/index.html     # Drag-drop UI + hls.js player + quality selector
│   ├── smoke_test.py         # Headless pipeline test
│   └── requirements.txt      # fastapi, uvicorn, python-multipart
├── .env.example              # All env vars documented
├── pyproject.toml            # Package metadata
├── README.md                 # Quickstart
└── SETUP_GUIDE.md            # This file
```

---

## 9. Common Pitfalls & Fixes

| Symptom | Cause | Fix |
|---------|-------|-----|
| `Unable to map stream at a:2` / "Could not write header" | `-var_stream_map` audio index wrong | Fixed in SDK v0.1.0+ — uses `a:0` (per-type) for single shared audio. |
| Player loads but **black screen / no play** | CDN CORS missing | Add CORS to bucket or CloudFront Response Headers Policy (`Access-Control-Allow-Origin: *` or your origin). |
| `403 Forbidden` from CloudFront | Bucket policy `AWS:SourceArn` has wrong distribution ID | Update bucket policy `SourceArn` to match **actual** CloudFront distribution ID (`dquh342ykpkwq` not `EME872G6U49TS`). |
| `seg_%03d.ts` 404 in player | Old single-rendition URL used | SDK now emits `master.m3u8` + `v0.m3u8`/`v1.m3u8`/... — player must load `master.m3u8`. |
| Quality selector shows only **Auto** | Source < 240p or probe failed | Probe logs in harness; source < smallest rung → single native rung. |
| `ffmpeg` not found | Not on PATH | Install ffmpeg + ensure `ffmpeg -version` works in the same shell that runs uvicorn. |
| `boto3` / `celery` import errors | Not installed | `pip install boto3` for S3; `pip install celery redis` for Celery. SDK lazy-imports so they're optional. |

---

## 10. Next Steps for a New Project

1. **Copy `sdk/cowatch_sdk/`** into your project (or `pip install -e /path/to/sdk`).
2. **Add `SDKConfig` + result sink** to your transcode worker.
3. **Provision S3 bucket + CDN** (or start with local mode).
4. **Wire your API** to call `process_video_to_hls` (sync) or enqueue via Celery.
5. **Persist result events** (`delivery_url`, `renditions`, `metadata`) into your DB.
6. **Serve HLS** via your CDN (or same-origin `/hls/...` route for local).
7. **Playback** — any HLS player (hls.js, video.js, native Safari) works; ABR is automatic from `master.m3u8`.

---

## 11. Version / Support

- **Package**: `cowatch-sdk` (editable install from `sdk/`)
- **Python**: ≥ 3.9
- **License**: MIT (or your repo's license)
- **Issues**: Track in your repo — the SDK is part of the CoWatch monorepo.

---

> **TL;DR**: `pip install -e .` → configure `SDKConfig` → call `process_video_to_hls(video_id, input_path, cfg)` → handle result events → serve `master.m3u8`. The test harness (`uvicorn test_harness.backend:app`) proves it works end-to-end in 30 seconds.