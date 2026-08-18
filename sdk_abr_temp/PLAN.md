# CoWatch Video Pipeline — SDK Extraction Plan

**Purpose:** Extract the working VOD video-processing pipeline from the CoWatch platform
into a self-contained, customer-configurable SDK that startups can run on their own cloud.
This document is the **plan only** — no production code in the backend is modified; all SDK
work happens under this `sdk/` directory.

**Scope of this phase:** Write the plan + build the `sdk/` package (Steps 1–6). The backend
is not modified; it later *adopts* the SDK (Step 8, deferred).

---

## 1. Goal & Scope

### In scope (v1 SDK)
- **VOD pipeline:** a task is *received* (handed in by the customer's backend) → transcode →
  HLS packaging → upload to the **customer's** object storage → **emit a result signal**.
- Generalization of **all infrastructure parameters** (storage, CDN, queue, result sink) so a
  customer configures them via env/config — no CoWatch-specific hardcoded values.
- A runnable, containerized package a customer can deploy on their own cloud.

### Explicitly out of scope (for now)
- **WebSocket sync engine** — excluded per earlier decision; not part of the processing SDK.
- **ABR / multi-rendition** — deferred. The architecture below is ABR-ready; adding it later is a
  localized FFmpeg + manifest change (no rework of upload/result machinery).
- **Live RTSP path** (`backend/app/streaming/ffmpeg_runner.py`) — mature VOD path is v1. Live is a
  documented Phase-later sibling.
- **Database ownership by the SDK** — per the customer-model decision (see Amendment below), the SDK
  owns NO database. It only emits a result signal; the customer persists to their own DB.
- Modifying the running backend to use the SDK — deferred to a later phase (Step 8).

---

## 2. What we are extracting (confirmed inventory)

| Stage | Current implementation | Source |
|---|---|---|
| Ingest (receive) | Stream upload → `storage/videos/{id}/original.mp4` → job trigger | `backend/app/videos/routes.py:25,119` |
| Transcode | FFmpeg HLS encode (`libx264` + `aac`), keyframe-aligned | `backend/app/streaming/hls_worker.py:289` |
| HLS packaging | `stream.m3u8` + `seg_%03d.ts` (VOD playlist) | `hls_worker.py:289-303` |
| Metadata + thumbnail | ffprobe duration; ffmpeg poster at t=2s | `hls_worker.py:259-278` |
| Storage upload | Windowed real-time segment upload (size 10) + retry + manifest + thumbnail; local delete | `s3_service.py`, `hls_worker.py:117,134` |
| Delivery URL | `CDN_URL/videos/{id}/stream.m3u8` | `hls_worker.py:219,356` |
| State / lifecycle | `processing→uploading→ready/failed`; 30% pre-play threshold | `hls_worker.py:217,256,337` |
| Async orchestration | Celery task + Redis broker, `.delay()` | `celery_app.py`, `videos/routes.py:120` |
| Failure handling | S3 error → kill FFmpeg + raise; exit-code + log capture; `finally` cleanup; `failed` status | `hls_worker.py:318-386` |
| Deletion / cleanup | Recursive S3 prefix delete + local rmtree; 24h orphan sweep on boot | `s3_service.py:102`, `hls_worker.py:389` |

---

## 3. Upper hands — advantages we already have

1. **Streaming windowed upload (minimal local disk).** Segments are uploaded *in flight* and deleted
   locally on success — designed for a 1 GB-RAM host, which means tiny ephemeral disk and low cost
   for customers. The hard part of HLS-on-object-storage is already solved.
2. **Early-play readiness (30% threshold).** Video marked `ready` after 30% uploaded → faster start.
3. **Production-grade failure model.** Error propagation, exit-code+log capture, `finally` cleanup.
4. **Exponential-backoff upload retries** (5 attempts).
5. **Clean module boundaries** — storage / queue / result / pipeline are separate; abstraction is mechanical.
6. **Single-pass metadata + thumbnail.**
7. **Proven Celery orchestration** (+ inline option for simple self-hosts).
8. **HLS params already parameterized.**
9. **ABR-ready by architecture.**
10. **Minimal vendor-lock-in seam** — storage isolated to one module; fast to multi-cloud.

---

## 4. Generalization strategy

Replace every hardcoded infrastructure dependency with a **config-driven adapter**. Customers pick
implementations via config; CoWatch's current stack becomes the *default* adapters.

- **`StorageBackend`** (customer's object store): `S3Storage` (incl. S3-compatible via `s3_endpoint_url`),
  `LocalStorage`.
- **`QueueBackend`** (optional glue): `CeleryQueue`, `InlineQueue`.
- **`ResultSink`** (the SDK EMITS; customer PERSISTS): `WebhookResultSink` (default), `CallbackResultSink`
  (in-process), `LoggingResultSink` (dev). **No database sink** — the SDK never writes to a DB.
- **`SDKConfig`** (typed, 12-factor env-loaded) + adapter factory.

### Secrets
Supplied via env / `.env` with **predefined, published variable names** (see `.env.example`), or via
explicit `SDKConfig` params for embedded/multi-tenant use. The SDK never logs secrets.

---

## 5. Proposed `sdk/` layout

```
sdk/
  PLAN.md, README.md, pyproject.toml, .env.example
  cowatch_sdk/
    __init__.py                # public API
    config.py                  # SDKConfig + env loader + adapter factory
    pipeline/                  # de-coupled core (no boto3/celery/DB imports)
      transcode.py             # run_pipeline / process_video_to_hls
      metadata.py
      uploader.py
    backends/
      storage/{base,s3,local}.py
      queue/{base,celery_app,celery,inline}.py
      result/{base,webhook,callback,logging}.py
    cli.py
    container/{Dockerfile,docker-entrypoint.sh}
```

---

## 6. Extraction steps (ordered) — STATUS

- [x] **Step 1 — Scaffold** `sdk/` + `config.py` (SDKConfig + env + adapter factory).
- [x] **Step 2 — Storage adapter** `StorageBackend` ABC + `S3Storage` (with `s3_endpoint_url`) + `LocalStorage`.
- [x] **Step 3 — Result adapter** `ResultSink` ABC + `Webhook` / `Callback` / `Logging` (replaces the
      earlier `StateSink`/Postgres design — see Amendment).
- [x] **Step 4 — Queue adapter** `QueueBackend` ABC + `CeleryQueue` + `InlineQueue`.
- [x] **Step 5 — Pipeline core** `process_video_to_hls` into `pipeline/transcode.py` depending ONLY on
      interfaces + `SDKConfig` (no direct boto3/celery/DB imports).
- [x] **Step 6 — CLI + container** `cli.py` + `Dockerfile`.
- [ ] **Step 7 (later) — ABR + multi-cloud** rendition ladder; GCS/Azure backends.
- [ ] **Step 8 (later) — Backend adopts SDK** (import `cowatch_sdk`; remove duplicated logic). Deferred.

---

## 7. Risks & notes

- **No backend disruption:** SDK is a separate package; backend keeps working until Step 8.
- **Behavior parity:** FFmpeg args identical to the platform; exposed as config only after parity proven.
- **Dead code opportunity:** `is_hls_compatible()` (`hls_worker.py:83`) is unused — the SDK could add a
  passthrough optimization (skip re-transcode when source is already HLS-compatible).
- **Dependencies:** `ffmpeg`/`ffprobe` are system binaries (bundled in the container); `boto3` and `celery`
  are optional (only loaded for the selected backends); `sqlalchemy` was removed — the SDK has no DB.

---

## 8. Amendment — customer-model decision (supersedes original StateSink design)

The original plan proposed a `StateSink` with a `PostgresStateSink` default that wrote to a CoWatch
`videos` table. Per the customer-model decision, **the SDK must own no database**: storage and CDN are
the customer's; the customer's backend receives the task and triggers the SDK; the SDK only **emits a
result signal**, and the customer persists it into their own DB. Therefore:

- `StateSink` + `PostgresStateSink` were **removed**; the concept is now `ResultSink` with `webhook`
  (default), `callback`, and `logging` implementations.
- `sqlalchemy` dependency removed.
- `RESULT_BACKEND` / `RESULT_WEBHOOK_URL` replace `STATE_BACKEND` / `DATABASE_URL`.
- Default `QUEUE_BACKEND` is `inline` (queue is optional glue; the customer triggers the SDK).

---

## 9. Open decision (needs your confirmation)

- **Live RTSP path scope:** v1 SDK = VOD only. Include the live `ffmpeg_runner.py` path in v1, or keep it
  Phase-later? (Recommendation: VOD-only v1; live as a follow-on.)
