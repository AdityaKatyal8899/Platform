"""Minimal FastAPI test harness for the CoWatch SDK.

Lets you drag-drop a video through a UI, paste your S3 + CDN config, watch the SDK's
result-signal "logs", and play the processed HLS via an in-page player.

Run:  uvicorn test_harness.backend:app --reload   (from the sdk/ directory)
Requires:  pip install -e .  &&  pip install fastapi uvicorn python-multipart
And:  ffmpeg + ffprobe on PATH.

Storage modes (chosen per-request via the `storage_backend` form field):
  * local -> processes + stores the HLS on local disk (SDKConfig.local_storage_dir) and
    serves it SAME-ORIGIN at /hls/{video_id}/master.m3u8. No S3 / CDN / CORS needed.
  * s3    -> uploads to your S3/R2/MinIO bucket and delivers via cdn_url. Requires the
    CDN + CORS to be configured for the in-page hls.js player (or play the CDN URL
    directly). The SDK's S3 backend (backends/storage/s3.py) is active.
"""

import os
import threading
import tempfile
import uuid
from pathlib import Path

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse

from cowatch_sdk import SDKConfig, CallbackResultSink, process_video_to_hls

from fastapi.middleware.cors import CORSMiddleware

# ============================================================================
# STORAGE BACKEND
# Chosen per-request via the `storage_backend` form field in /upload:
#   * "local" -> process + store on local disk, served same-origin at
#     /hls/{video_id}/master.m3u8 (no S3 / CDN / CORS needed).
#   * "s3"    -> upload to your S3/R2/MinIO bucket and deliver via cdn_url.
# The SDK's S3 backend (backends/storage/s3.py) and webhook result sink are active.
# ============================================================================

app = FastAPI(title="CoWatch SDK — Test Harness")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ROOT = Path(__file__).parent
LOCAL_ROOT = Path(__file__).parent.parent / "storage"  # matches SDKConfig.local_storage_dir default

# In-memory store keyed by video_id (single-user test harness).
store: dict = {}


def make_result_sink(video_id: str):
    def handler(event: dict):
        store[video_id]["events"].append(event)
        if event.get("event") == "delivery_url":
            store[video_id]["delivery_url"] = event.get("url")
            # For LOCAL storage backend, dynamically construct and assign the play_url upon delivery readiness
            if store[video_id].get("storage_backend") == "local":
                store[video_id]["play_url"] = f"/hls/{video_id}/master.m3u8"
        if event.get("event") == "renditions":
            store[video_id]["renditions"] = event.get("renditions")
        if event.get("event") == "error":
            store[video_id]["error"] = event.get("error")
        if event.get("status"):
            store[video_id]["status"] = event["status"]

    return CallbackResultSink(handler)


@app.post("/upload")
async def upload(
    file: UploadFile = File(...),
    storage_backend: str = Form("local"),
    s3_bucket: str = Form(""),
    s3_region: str = Form(""),
    s3_access_key: str = Form(""),
    s3_secret: str = Form(""),
    s3_endpoint_url: str = Form(""),
    cdn_url: str = Form(""),
):
    video_id = str(uuid.uuid4())
    workdir = Path(tempfile.gettempdir()) / "cowatch_test" / video_id
    workdir.mkdir(parents=True, exist_ok=True)
    input_path = workdir / "original.mp4"

    with open(input_path, "wb") as out:
        while chunk := await file.read(1024 * 1024):
            out.write(chunk)

    # LOCAL mode: harness serves HLS same-origin at /hls/{video_id}/master.m3u8.
    play_url = None

    store[video_id] = {
        "events": [],
        "status": "queued",
        "delivery_url": None,
        "play_url": play_url,
        "renditions": None,
        "error": None,
        "storage_backend": storage_backend,
    }

    cfg = SDKConfig(
        storage_backend=storage_backend,
        s3_bucket=s3_bucket or None,
        s3_region=s3_region or None,
        s3_access_key=s3_access_key or None,
        s3_secret=s3_secret or None,
        s3_endpoint_url=s3_endpoint_url or None,
        cdn_url=cdn_url,
        local_storage_dir=str(LOCAL_ROOT),
        result_backend="callback",
    )
    cfg.result_sink = make_result_sink(video_id)

    def run():
        try:
            process_video_to_hls(video_id, str(input_path), cfg)
        except Exception as e:
            store[video_id]["error"] = str(e)

    threading.Thread(target=run, daemon=True).start()
    return {"video_id": video_id, "status": "queued"}


@app.get("/status/{video_id}")
def status(video_id: str):
    s = store.get(video_id)
    if not s:
        return {"error": "not found"}
    out = dict(s)
    out.pop("input_path", None)
    return out


_CONTENT_TYPES = {
    ".m3u8": "application/x-mpegURL",
    ".m3u": "application/x-mpegURL",
    ".ts": "video/MP2T",
}


@app.get("/hls/{video_id}/{path:path}")
def hls(video_id: str, path: str):
    """Same-origin HLS serving for LOCAL storage (avoids all CORS)."""
    target = (LOCAL_ROOT / "videos" / video_id / path).resolve()
    if not str(target).lower().startswith(str(LOCAL_ROOT.resolve()).lower()):
        return {"error": "forbidden"}
    if not target.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(target, media_type=_CONTENT_TYPES.get(target.suffix, "application/octet-stream"))


    