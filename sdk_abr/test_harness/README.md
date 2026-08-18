# CoWatch SDK — Test Harness

A minimal FastAPI backend + single-page UI to exercise the SDK end-to-end:

- Drag-and-drop a video file.
- Paste your **S3** (bucket / region / key / secret / optional endpoint) and **CDN URL**.
- Watch the SDK's **result signals** as live logs (`processing → uploading → ready`,
  `metadata`, `delivery_url`, `error`).
- Play the processed HLS in an embedded **hls.js** player using the delivered CDN URL.

## Run

```bash
cd sdk
pip install -e .                 # installs cowatch-sdk (+boto3, +celery)
pip install -r test_harness/requirements.txt
# ffmpeg + ffprobe must be on PATH

uvicorn test_harness.backend:app --reload --port 8000
# open http://localhost:8000
```

## Notes / caveats
- **Storage backend** select:
  - `local` — **easiest test**: the harness stores the HLS on disk and serves it
    **same-origin** at `/hls/{video_id}/master.m3u8` (ABR master playlist), so no S3 / CDN / CORS is needed.
  - `s3` — exercises the real S3 + CDN path (requires CORS + correct CloudFront origin).
- **CORS:** for the hls.js player to fetch the manifest/segments cross-origin, your S3 bucket
  (or CDN in front of it) must allow `GET` from the page origin. Configure bucket CORS or serve
  through a CDN with permissive (or matching) CORS.
- **Secrets:** this harness takes S3 creds from form fields for convenience. In production the
  SDK reads them from env / `.env` (see `sdk/.env.example`); never ship creds through a UI.
- All state is in-memory and single-user — this is a test tool, not a deployment.
