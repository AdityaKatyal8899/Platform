# CoWatch Video Pipeline SDK — API Reference

> **What this is**: a function-by-function map of every public and internal symbol in the
> SDK, organized by the file that owns it. Use this to wire the SDK into your platform
> backend (the SDK is a **worker**, not a service — your backend calls it, the SDK
> processes the video and **emits a result signal** that *you* persist to your DB).

**Design boundary (read first):**
- The SDK owns **no database**.
- `STORAGE` (S3/object store) and `CDN` are **yours** — configured, never owned by the SDK.
- The SDK only **emits** outcome signals (status / delivery URL / metadata / error)
  through a `ResultSink` that **you** provide or point at your webhook.
- ffmpeg / ffprobe must be on `PATH` (or set `FFMPEG_BIN` / `FFPROBE_BIN`).

---

## 0. Package entry points — `cowatch_sdk/__init__.py`

These are the names imported when you `from cowatch_sdk import ...`.

| Symbol | Kind | Task |
|--------|------|------|
| `SDKConfig` | class | All pipeline configuration (dataclass). Construct it directly or via `load_config()`. |
| `load_config()` | fn | Build an `SDKConfig` from environment variables (12-factor). |
| `config_from_dict(d)` | fn | Rebuild an `SDKConfig` from a dict (used to pass config through a queue). |
| `build_adapters(config)` | fn | Wire the selected Storage / Queue / Result implementations from a config. |
| `run_pipeline(video_id, input_path, config, storage, result)` | fn | Low-level: run the full pipeline with pre-built adapters. |
| `process_video_to_hls(video_id, input_path, config)` | fn | Convenience entry: build adapters from config, then `run_pipeline`. |
| `StorageBackend` | ABC | Interface every storage backend implements. |
| `QueueBackend` | ABC | Interface every queue backend implements. |
| `ResultSink` | ABC | Interface every result sink implements (the signal emitter). |
| `WebhookResultSink` | class | Default sink: POSTs result JSON to your URL. |
| `CallbackResultSink` | class | In-process sink: calls your Python function with each event. |
| `LoggingResultSink` | class | Dev sink: prints each event to stderr. |

---

## 1. Configuration — `cowatch_sdk/config.py`

### `SDKConfig` (dataclass)
**File:** `cowatch_sdk/config.py` (line 106)
**Task:** The single configuration object for the whole pipeline. Construct directly or via `load_config()`.

**Fields (grouped):**
- *Storage (your object store):* `storage_backend` (`"s3"`|`"local"`), `s3_bucket`, `s3_region`, `s3_access_key`, `s3_secret`, `s3_endpoint_url` (R2/MinIO), `local_storage_dir` (default `"storage"`).
- *Delivery/CDN (yours):* `cdn_url`, `delivery_url_template` (default `"{cdn}/videos/{video_id}/master.m3u8"`).
- *Queue (glue):* `queue_backend` (`"inline"`|`"celery"`), `celery_broker_url`.
- *Result signal:* `result_backend` (`"webhook"`|`"logging"`|`"callback"`), `result_webhook_url`, `result_sink` (a `ResultSink` set programmatically; can't come from env).
- *HLS/transcode:* `hls_segment_seconds=4`, `hls_list_size=0`, `hls_playlist_type="vod"`, `keyframe_interval=2.0`, `audio_bitrate="128k"`, `ffmpeg_bin="ffmpeg"`, `ffprobe_bin="ffprobe"`.
- *Runtime:* `temp_dir="storage/videos"`, `upload_window=10`, `preplay_threshold=0.30`, `retry_attempts=5`, `retry_backoff=1.0`.

**Method `to_dict() -> dict`**: serialize the config for passing through a queue. `result_sink` is intentionally omitted (callables don't serialize).

### `config_from_dict(data: dict) -> SDKConfig`
**File:** `cowatch_sdk/config.py` (line 194)
**Task:** Inverse of `to_dict()` — rebuild an `SDKConfig` from a dict. Used on the worker side of a queue.

### `_env(name: str, default=None)`
**File:** `cowatch_sdk/config.py` (line 202)
**Task:** Read an env var, returning `default` when unset. Internal helper for `load_config`.

### `load_config() -> SDKConfig`
**File:** `cowatch_sdk/config.py` (line 207)
**Task:** Build an `SDKConfig` from environment variables (predefined names, see `.env.example`).
The variable names are a **published contract** — your deploy/container must set them.

### `build_adapters(config: SDKConfig)`
**File:** `cowatch_sdk/config.py` (line 240)
**Task:** Wire the configured backend implementations, using **lazy imports** so optional deps
(`boto3`, `celery`) are only required when that backend is selected.
**Returns:** `(storage, queue, result)` tuple.
- `storage`: `S3Storage` (`STORAGE_BACKEND=s3`) or `LocalStorage` (`=local`).
- `queue`: `CeleryQueue` (`QUEUE_BACKEND=celery`) or `InlineQueue` (`=inline`).
- `result`: `config.result_sink` if set; else `WebhookResultSink` / `LoggingResultSink`; `callback` must be set programmatically (raises otherwise).

---

## 2. Pipeline — `cowatch_sdk/pipeline/`

### 2a. `pipeline/transcode.py`

#### `_build_ffmpeg_args(config, input_path, output_dir, has_audio) -> list`
**File:** `cowatch_sdk/pipeline/transcode.py` (line 21)
**Task:** Build the ffmpeg argument list for a single-rendition (non-ABR) HLS stream. Emits a
`master.m3u8` + `v0.m3u8` + per-segment `v0_seg_%03d.ts`, with keyframes aligned for clean
segment boundaries. Audio is mapped once via the per-type index `a:0` in `-var_stream_map`
(`"v:0,a:0"` when audio is present).
**Returns:** the argv list (first element is `config.ffmpeg_bin`).

#### `run_pipeline(video_id, input_path, config, storage, result)`
**File:** `cowatch_sdk/pipeline/transcode.py` (line 101)
**Task:** **The core orchestrator.** Runs the whole pipeline with pre-built adapters:
1. Emits `status=processing`.
2. Probes source (`probe_source`) → duration.
3. Generates + uploads a thumbnail; emits `metadata` (duration, thumbnail URL).
4. Cleans old artifacts, builds the single-rendition ffmpeg args.
5. Starts the parallel `run_uploader` thread, runs ffmpeg (watching for uploader errors).
6. On completion uploads all `.m3u8` (master + variant), emits `delivery_url`
   (`master.m3u8` URL), sets `status=ready`.
7. On failure emits `error` and re-raises. Temp files are cleaned up in `finally`.

#### `process_video_to_hls(video_id, input_path, config)`
**File:** `cowatch_sdk/pipeline/transcode.py` (line 223)
**Task:** Convenience entry for callers who don't want to build adapters themselves.
Calls `build_adapters(config)` then `run_pipeline(...)`. This is the function your backend
typically calls (sync) or passes to a queue.

### 2b. `pipeline/metadata.py`

#### `capture_duration(input_path, config) -> float`
**File:** `cowatch_sdk/pipeline/metadata.py` (line 10)
**Task:** ffprobe the source and return its duration in seconds (float). Returns `0.0` on failure.

#### `probe_source(input_path, config) -> dict`
**File:** `cowatch_sdk/pipeline/metadata.py` (line 23)
**Task:** Single ffprobe call returning `{width, height, duration, has_audio}`. Drives
transcode parameter selection. On any failure returns safe defaults
(`{width:0, height:0, duration:0.0, has_audio:True}`).

#### `generate_thumbnail(input_path, thumbnail_path, config) -> bool`
**File:** `cowatch_sdk/pipeline/metadata.py` (line 58)
**Task:** Extract a 1-frame thumbnail at `00:00:02` via ffmpeg. Returns `True` on success.

#### `upload_thumbnail(storage, thumbnail_path, video_id, config)`
**File:** `cowatch_sdk/pipeline/metadata.py` (line 67)
**Task:** Upload the generated thumbnail to `videos/{video_id}/thumbnail.jpg` through the
configured `StorageBackend`.

### 2c. `pipeline/uploader.py`

#### `_upload_with_retry(storage, local_path, key, content_type, config)`
**File:** `cowatch_sdk/pipeline/uploader.py` (line 20)
**Task:** Upload one file via `storage.upload_file`, retrying up to `config.retry_attempts`
times with exponential backoff (`config.retry_backoff`). Internal helper.

#### `run_uploader(output_dir, video_id, storage, result, stop_event, error_container, config, duration)`
**File:** `cowatch_sdk/pipeline/uploader.py` (line 33)
**Task:** **Windowed, real-time segment uploader** (runs in its own thread alongside ffmpeg):
- Watches `output_dir` for `v{N}_seg_{NNN}.ts` segments as ffmpeg produces them.
- Uploads segments in windows of `config.upload_window`, deletes each locally right after
  upload (minimizes disk). Re-uploads all `.m3u8` (master + variants) each window so the
  manifest stays current.
- Once `preplay_threshold` fraction of expected segments are uploaded, emits
  `delivery_url` + `status=ready` so playback can begin **before** transcode finishes.
- Pushes any exception into `error_container` so the ffmpeg watchdog in `run_pipeline` can abort.

---

## 3. Storage backends — `cowatch_sdk/backends/storage/`

### `StorageBackend` (ABC)
**File:** `cowatch_sdk/backends/storage/base.py` (line 7)
**Task:** Interface every storage backend implements.
- `upload_file(local_path, key, content_type=None)` — upload a local file to `key`.
- `upload_fileobj(file_obj, key, content_type=None)` — upload a file-like object.
- `delete_prefix(prefix)` — delete all objects under a key prefix (e.g. `videos/{id}/`).
- `get_delivery_url(video_id) -> str` — public URL of the HLS manifest for `video_id`.

### `LocalStorage(StorageBackend)`
**File:** `cowatch_sdk/backends/storage/local.py` (line 10)
**Task:** On-disk backend for dev/tests/self-hosting. Stores under `config.local_storage_dir`
with atomic temp-file writes. `get_delivery_url` formats `delivery_url_template` with
`cdn_url` (if set) and `video_id`. Same-origin serving (e.g. the test harness `/hls/...`)
is provided by the host app, not this class.

### `S3Storage(StorageBackend)`
**File:** `cowatch_sdk/backends/storage/s3.py` (line 13)
**Task:** Customer object-store backend (AWS S3, R2, MinIO — anything S3-compatible via
`s3_endpoint_url`). Uses `boto3` (lazy-imported in `build_adapters`). `get_delivery_url`
behaves like `LocalStorage`. Requires `S3_BUCKET` configured or raises.

---

## 4. Queue backends — `cowatch_sdk/backends/queue/`

### `QueueBackend` (ABC)
**File:** `cowatch_sdk/backends/queue/base.py` (line 6)
**Task:** Interface for job enqueueing.
- `enqueue(video_id, input_path, config)` — schedule a processing job.

### `InlineQueue(QueueBackend)`
**File:** `cowatch_sdk/backends/queue/inline.py` (line 8)
**Task:** Runs the pipeline **synchronously** in the calling process
(`build_adapters` + `run_pipeline`). Simplest self-host option — no broker needed.

### `CeleryQueue(QueueBackend)`
**File:** `cowatch_sdk/backends/queue/celery.py` (line 10)
**Task:** Enqueues the job to a Celery broker via `process_video_task.delay(...)`. Config is
passed as a **dict** (`asdict(config)`) so no live client objects cross the broker.

### `celery_app.py`
**File:** `cowatch_sdk/backends/queue/celery_app.py`
**Task:** Defines the Celery app + the registered task.
- `app = Celery("cowatch-sdk", broker=..., backend=...)` — configured from `CELERY_BROKER_URL`.
- **`process_video_task(video_id, input_path, config_dict)`** (decorated `@app.task`, name
  `"cowatch_sdk.process_video"`) — worker entry: rebuilds config via `config_from_dict`,
  builds adapters, runs `run_pipeline`. Only serializable args cross the broker.

---

## 5. Result sinks — `cowatch_sdk/backends/result/`

> The SDK **emits** these events; **you** persist them. Event schema (every sink uses it):
> - `{event:"status", status}` — `processing|uploading|ready|failed`
> - `{event:"metadata", duration, thumbnail_url}`
> - `{event:"delivery_url", url}` — the `master.m3u8` URL
> - `{event:"error", error}`

### `ResultSink` (ABC)
**File:** `cowatch_sdk/backends/result/base.py` (line 10)
**Task:** Interface every sink implements.
- `on_status(video_id, status)` — abstract.
- `on_metadata(video_id, duration, thumbnail_url)` — abstract.
- `on_delivery_url(video_id, url)` — abstract.
- `on_error(video_id, error)` — abstract.

### `CallbackResultSink(ResultSink)`
**File:** `cowatch_sdk/backends/result/callback.py` (line 11)
**Task:** In-process sink — calls your Python `fn(event_dict)` for every event. Set via
`cfg.result_sink = CallbackResultSink(my_handler)`. **Cannot** come from env (callables
don't serialize). Ideal for embedding the SDK in your own process / tests.

### `LoggingResultSink(ResultSink)`
**File:** `cowatch_sdk/backends/result/logging.py` (line 9)
**Task:** Dev sink — prints each event to stderr. Best for local runs and `smoke_test.py`.

### `WebhookResultSink(ResultSink)`
**File:** `cowatch_sdk/backends/result/webhook.py` (line 10)
**Task:** **Default for platform integration.** POSTs each event JSON to
`config.result_webhook_url`. Delivery is best-effort (a failed POST is swallowed so it never
breaks the pipeline). Your backend's webhook endpoint receives the signals and writes them to
your DB.

---

## 6. CLI — `cowatch_sdk/cli.py`

### `main(argv=None) -> int`
**File:** `cowatch_sdk/cli.py` (line 12)
**Task:** Command-line entry `cowatch-sdk <input> [--video-id ID]` (registered in
`pyproject.toml` as the `cowatch-sdk` script). Loads config from env, stages the input file,
builds adapters, runs `run_pipeline`, prints the delivery URL. Exit codes: `0` success,
`1` processing failure, `2` input not found.

**Example:**
```bash
cowatch-sdk path/to/video.mp4 --video-id my-video-123
```

---

## 7. Container — `cowatch_sdk/container/`

The "toolbox container" that ships the SDK as a ready-to-run image (ffmpeg + the SDK installed).

| File | Task |
|------|------|
| `cowatch_sdk/container/Dockerfile` | Builds the image: base + ffmpeg/ffprobe + `pip install -e .`, exposes the `cowatch-sdk` CLI. |
| `cowatch_sdk/container/docker-entrypoint.sh` | Container entrypoint; typically invokes the CLI (or a worker) with env-provided config. |

Your platform backend calls into the container by:
- mounting the source file (or handing S3 keys) and running `cowatch-sdk ...`, **or**
- sending a Celery job to the broker that this container's worker consumes.

---

## 8. Typical call paths (how the pieces connect)

**Sync / embedded (InlineQueue + CallbackResultSink):**
```python
from cowatch_sdk import SDKConfig, CallbackResultSink, process_video_to_hls

events = []
cfg = SDKConfig(storage_backend="local", local_storage_dir="/data/storage",
                result_backend="callback")
cfg.result_sink = CallbackResultSink(lambda e: events.append(e))

process_video_to_hls("video-123", "/tmp/input.mp4", cfg)
# events now holds status / metadata / delivery_url
```

**Async / platform (CeleryQueue + WebhookResultSink):**
```python
from cowatch_sdk import SDKConfig, build_adapters

# your backend creates the job:
cfg = SDKConfig(storage_backend="s3", s3_bucket="...", cdn_url="https://cdn...",
                queue_backend="celery", result_backend="webhook",
                result_webhook_url="https://your-backend/api/cowatch/result")
storage, queue, result = build_adapters(cfg)
queue.enqueue("video-123", "/path/to/input.mp4", cfg)
# Celery worker runs process_video_task -> emits events to your webhook -> you persist.
```

**CLI / container:**
```bash
cowatch-sdk input.mp4 --video-id video-123   # uses env config
```

---

## 9. Quick reference — function → file index

| Function / Class | File | One-line task |
|------------------|------|---------------|
| `SDKConfig` | `config.py` | Whole-pipeline config dataclass |
| `to_dict` / `config_from_dict` | `config.py` | Serialize / rebuild config for queues |
| `load_config` | `config.py` | Build config from env |
| `build_adapters` | `config.py` | Wire storage/queue/result backends |
| `run_pipeline` | `pipeline/transcode.py` | Core orchestrator |
| `process_video_to_hls` | `pipeline/transcode.py` | Convenience entry (builds adapters) |
| `_build_ffmpeg_args` | `pipeline/transcode.py` | Build ffmpeg single-rendition command |
| `probe_source` | `pipeline/metadata.py` | Probe W/H/duration/audio |
| `capture_duration` | `pipeline/metadata.py` | ffprobe duration |
| `generate_thumbnail` | `pipeline/metadata.py` | Extract thumbnail |
| `upload_thumbnail` | `pipeline/metadata.py` | Upload thumbnail |
| `run_uploader` | `pipeline/uploader.py` | Windowed real-time segment uploader |
| `_upload_with_retry` | `pipeline/uploader.py` | Retrying single-file upload |
| `StorageBackend` | `backends/storage/base.py` | Storage interface |
| `LocalStorage` | `backends/storage/local.py` | On-disk storage |
| `S3Storage` | `backends/storage/s3.py` | S3/R2/MinIO storage |
| `QueueBackend` | `backends/queue/base.py` | Queue interface |
| `InlineQueue` | `backends/queue/inline.py` | Sync queue |
| `CeleryQueue` | `backends/queue/celery.py` | Celery enqueue |
| `process_video_task` | `backends/queue/celery_app.py` | Celery worker task |
| `ResultSink` | `backends/result/base.py` | Result-signal interface |
| `WebhookResultSink` | `backends/result/webhook.py` | POST signals to your URL |
| `CallbackResultSink` | `backends/result/callback.py` | Call your Python fn |
| `LoggingResultSink` | `backends/result/logging.py` | Print signals (dev) |
| `main` | `cli.py` | `cowatch-sdk` CLI entry |
