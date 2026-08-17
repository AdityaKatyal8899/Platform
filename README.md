# CoWatch Video Pipeline SDK & Backend

A production-ready, self-hosted Adaptive Bitrate (ABR) video transcoding and delivery pipeline. This package contains the **CoWatch Python SDK** (transcoder, uploader, and metadata engine), a **FastAPI backend** with SQLite state management, and a premium **glassmorphic HTML5 player dashboard**.

---

## Key Features

* 🚀 **Early-Play Dynamic Streaming**: The player can start streaming the video (at 30% progress) in real-time *while the video is still actively transcoding in the background*, eliminating buffering wait times.
* 📈 **Dynamic ABR Ladder adaptation**:
  * Prevents upscaling (drops quality profiles taller than the original video).
  * Injects a `source` native profile for high-res videos (1080p, 4K) to maintain source quality.
* 📦 **Parallel Sliding-Window Uploader**: Uploads segment `.ts` chunks to the destination storage backend in batches using thread pools in real-time.
* 💾 **Pluggable Storage Backends**: Supports local storage (CDN simulation) and cloud object storage (AWS S3, Cloudflare R2, MinIO, DigitalOcean Spaces).
* 🔗 **Webhook Event System**: Fires webhook callbacks (`status`, `metadata`, `delivery_url`, `renditions`, `error`) to sync state with any database or main application portal.
* 🎨 **Glassmorphic ABR Player**: Includes an `hls.js` player that dynamically parses streaming levels directly from the manifest, supporting on-the-fly resolution switching.

---

## Project Structure

```text
├── sdk/                      # Core CoWatch Python SDK
│   └── cowatch_sdk/
│       ├── backends/         # Storage and Queue backend abstractions (Local, S3, Celery)
│       ├── pipeline/         # Transcoding, uploader, and metadata extraction
│       └── config.py         # SDK configuration schemas
├── backend/                  # Custom FastAPI wrapper application
│   ├── database.py           # SQLite state management
│   ├── main.py               # FastAPI endpoints & worker threads
│   ├── run.py                # Server entrypoint
│   └── static/               # Glassmorphic frontend assets (HTML, CSS, JS)
└── README.md                 # Developer integration guide
```

---

## Local Setup & Quick Start

### 1. Prerequisites
Ensure you have Python 3.9+ and `ffmpeg` installed on your machine and added to your system path.

### 2. Install Dependencies
```bash
pip install fastapi uvicorn boto3
```

### 3. Run the Server
From the project root directory, run:
```bash
python backend/run.py
```
The server will start on **`http://localhost:8000`** with live hot-reload active.

### 4. Test the Pipeline
1. Place a test video named `test.mp4` in the project root directory.
2. Open `http://localhost:8000` in your browser.
3. Click the **Process local test.mp4** button.
4. Watch the progress nodes update. As soon as the badge says **`Ready (Early-Play)`**, click **Play** to start streaming the video immediately!

---

## Cloud Infrastructure Setup (AWS S3)

To connect this pipeline to your AWS S3 bucket (or S3-compatible service like MinIO, Cloudflare R2, or DigitalOcean Spaces), configure the following environment variables:

### 1. Environment Variables
Set these variables in your deployment environment or server script:

| Environment Variable | Description | Example |
| :--- | :--- | :--- |
| `STORAGE_BACKEND` | Storage type | `s3` (defaults to `local`) |
| `S3_BUCKET` | Destination bucket name | `my-video-bucket` |
| `S3_REGION` | AWS Region (if using AWS) | `us-east-1` |
| `S3_ACCESS_KEY` | AWS Access Key ID | `AKIAIOSFODNN7EXAMPLE` |
| `S3_SECRET` | AWS Secret Access Key | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` |
| `S3_ENDPOINT_URL` | Endpoint URL (for R2/Spaces/MinIO) | `https://<account_id>.r2.cloudflarestorage.com` |
| `CDN_URL` | CDN Domain URL | `https://media.mybrand.com` |

### 2. S3 Bucket CORS Policy (Crucial for Player)
Because your video files will be requested from your S3 bucket domain by the browser, you **must** configure a CORS policy on your S3 bucket. Without this, browsers will block HLS playback due to origin mismatches.

Go to your S3 bucket settings under **Permissions -> CORS (Cross-Origin Resource Sharing)** and add the following JSON policy:

```json
[
    {
        "AllowedHeaders": [
            "*"
        ],
        "AllowedMethods": [
            "GET",
            "HEAD"
        ],
        "AllowedOrigins": [
            "*"
        ],
        "ExposeHeaders": [
            "Access-Control-Allow-Origin",
            "Content-Length"
        ],
        "MaxAgeSeconds": 3000
    }
]
```
> **Security Note**: In production, replace `*` in `AllowedOrigins` with your specific application domain (e.g., `https://app.mycompany.com`).

---

## Developer Integration Guide

To integrate this SDK into your own web application (Node.js, Ruby, Django, Go, etc.), follow these patterns:

### 1. Invoking the SDK (Python Example)
```python
from cowatch_sdk.config import SDKConfig
from cowatch_sdk.backends.storage.s3 import S3Storage
from cowatch_sdk.pipeline.transcode import run_pipeline
from cowatch_sdk.pipeline.results import WebhookResultSink

# 1. Instantiate the SDK configuration
config = SDKConfig(
    storage_backend="s3",
    s3_bucket="my-video-bucket",
    s3_access_key="my-key",
    s3_secret="my-secret",
    ffmpeg_preset="medium",  # Optimal encoding quality balance
    result_backend="webhook",
    result_webhook_url="https://app.mycompany.com/api/videos/callback"
)

# 2. Initialize storage and webhook sink
storage = S3Storage(config)
sink = WebhookResultSink(config)

# 3. Trigger the pipeline (runs in a background thread or Celery worker)
run_pipeline(
    video_id="my-unique-video-uuid",
    input_path="/path/to/uploaded/video.mp4",
    config=config,
    storage=storage,
    result=sink
)
```

### 2. Webhook Event System (Payload Formats)
Your main application should expose an endpoint (e.g. `/api/videos/callback`) to receive these events from the SDK:

#### Event: `status`
Fired when the video transitions states.
```json
{
  "video_id": "my-unique-video-uuid",
  "event": "status",
  "status": "processing"  // processing | uploading | ready | failed
}
```

#### Event: `metadata`
Fired when the video dimensions, duration, and audio presence are probed.
```json
{
  "video_id": "my-unique-video-uuid",
  "event": "metadata",
  "duration": 142.58,
  "thumbnail_url": "https://media.mybrand.com/videos/my-unique-video-uuid/thumbnail.jpg"
}
```

#### Event: `delivery_url`
Fired when the master playlist is ready for early playback streaming.
```json
{
  "video_id": "my-unique-video-uuid",
  "event": "delivery_url",
  "url": "https://media.mybrand.com/videos/my-unique-video-uuid/master.m3u8"
}
```

---

## Code Security & IP Protection (For Selling/Client Delivery)

If you are delivering this pipeline to clients and do **not** want to give away your proprietary source code, you can compile the python files into binary packages.

### 1. Compile with Cython (Recommended)
You can compile your python files into `.so` files (Linux) or `.pyd` files (Windows) which can be imported normally by python but cannot be read or decompiled back to source code.

1. Install Cython: `pip install cython`
2. Create a `setup.py` file:
   ```python
   from setuptools import setup
   from Cython.Build import cythonize

   setup(
       ext_modules = cythonize([
           "sdk/cowatch_sdk/pipeline/uploader.py",
           "sdk/cowatch_sdk/pipeline/transcode.py"
       ])
   )
   ```
3. Compile: `python setup.py build_ext --inplace`
4. Delete the original `.py` files and distribute the compiled `.so` / `.pyd` files instead.

### 2. Obfuscate with PyArmor
Alternatively, compile using PyArmor to protect code logic and bind execution to specific license expiration dates/machine hardware:
```bash
pip install pyarmor
pyarmor pack -e " --exclude static" backend/run.py
```
