# CoWatch SDK (Pro Plan) — Developer Setup Guide

Welcome to the **CoWatch SDK (Pro Plan)**. If you are reading this, you are one of our valued Pro Plan customers. Thank you for choosing CoWatch to power your video infrastructure! 

This repository houses the core video processing library that coordinates high-performance transcoding, automated S3 cloud storage uploads, and live status webhooks. Below is a comprehensive developer integration guide to get the SDK running on your project servers.

---

## 1. System Requirements

Before running the SDK, ensure your environment meets the following dependencies:

* **Python 3.8+**
* **FFmpeg**: Must be installed and accessible via your system's global environment path (`PATH`).
  * *Ubuntu/Debian:* `sudo apt update && sudo apt install -y ffmpeg`
  * *macOS (Homebrew):* `brew install ffmpeg`
  * *Windows:* Download from the official website and add the `/bin` directory to your System Environment variables.

---

## 2. Installation

Since this is a private SDK repository, you can install it directly from your private GitHub URL or package it locally:

### Option A: Direct git installation (Recommended)
Add the private repository to your `requirements.txt` or install it directly using `pip` (requires a GitHub Personal Access Token or SSH configured on your server):
```bash
pip install git+https://github.com/AdityaKatyal8899/Platform.git#egg=cowatch_sdk&subdirectory=sdk
```

### Option B: Local installation
1. Clone this repository onto your server.
2. Navigate into the `sdk/` directory.
3. Install the SDK in editable mode:
   ```bash
   pip install -e .
   ```

---

## 3. Quick Start Integration

Integrating the SDK into your Python application involves two simple steps: instantiating the configuration helper and invoking the transcoding pipeline.

### Basic Integration Code Example

```python
from cowatch_sdk import SDKConfig, process_video_to_hls

# 1. Instantiate the SDK configuration (Local or S3-compatible cloud)
config = SDKConfig(
    # Storage settings
    storage_backend="s3",  # Choose "s3" or "local"
    s3_bucket="my-bucket-name",
    s3_region="us-east-1",
    s3_access_key="YOUR_S3_ACCESS_KEY",
    s3_secret="YOUR_S3_SECRET_KEY",
    s3_endpoint_url="https://your-endpoint.com",  # E.g. Cloudflare R2 or MinIO
    
    # Delivery CDN
    cdn_url="https://cdn.yourdomain.com",
    
    # Callback Sink Settings
    result_backend="webhook",
    result_webhook_url="https://your-app.com/api/videos/webhook",
    
    # Transcoder tuning
    ffmpeg_preset="medium",  # "ultrafast", "medium", "slow"
    ffmpeg_tune="film",      # optional tuning preset
    temp_dir="/tmp/cowatch-transcode"
)

# 2. Run the transcoding pipeline (processes and uploads)
# Typically run inside a background worker (Celery, FastAPI background tasks, etc.)
video_id = "video-uuid-12345"
input_video_path = "/path/to/uploaded/video.mp4"

try:
    process_video_to_hls(
        video_id=video_id, 
        input_path=input_video_path, 
        config=config
    )
    print(f"Transcoding successfully initiated for: {video_id}")
except Exception as e:
    print(f"Transcode initiation failed: {e}")
```

---

## 4. Webhook Notification Events

The SDK fires sequential events to your `result_webhook_url` receiver endpoint during the transcoding lifecycle:

| Event Type | Payload Fields | Description |
| :--- | :--- | :--- |
| `status` | `{"video_id": "...", "event": "status", "status": "transcoding"}` | Transcoding has started. |
| `metadata` | `{"video_id": "...", "event": "metadata", "duration": 120.5}` | Video duration and dimensions loaded. |
| `status` | `{"video_id": "...", "event": "status", "status": "uploading"}` | Transcoding complete, segments uploading. |
| `delivery_url`| `{"video_id": "...", "event": "delivery_url", "url": "..."}` | **Pre-play threshold met!** manifest is live. |
| `renditions` | `{"video_id": "...", "event": "renditions", "renditions": [...]}`| Transcoder resolutions available (1080p, 720p, etc.). |
| `status` | `{"video_id": "...", "event": "status", "status": "completed"}` | Process finished successfully. |
| `error` | `{"video_id": "...", "event": "error", "error": "Reason"}` | Transcode pipeline failed. |

---

## 5. Key Architecture Features

### 🚀 Early-Play Playback (Pre-Play)
The SDK leverages progressive segment uploading. As soon as the first few seconds of HLS segments (`.ts`) are generated and uploaded (based on the `preplay_threshold` config parameter), the manifest `.m3u8` is published and a `delivery_url` event is sent. **Your player can start streaming the video immediately while transcoding continues in the background.**

### 🖥️ Multi-Rendition ABR (Adaptive Bitrate)
The SDK generates a master HLS manifest with separate resolution variant sub-manifests (e.g., `1080p`, `720p`, `360p`), ensuring buffer-free streaming quality switching based on user network speeds.

---

## Support & Updates
For core upgrades, pipeline customizations, or dedicated integration help, please coordinate with the **CoWatch SDK Team** at [cowatchservices@gmail.com](mailto:cowatchservices@gmail.com).
