import os
import shutil
import uuid
import logging
from pathlib import Path
from fastapi import FastAPI, UploadFile, File, BackgroundTasks, HTTPException, Request
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

# from cowatch_sdk import SDKConfig, process_video_to_hls
import database as db

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("cowatch_backend")

# Define storage and database paths
BACKEND_DIR = Path(__file__).parent.resolve()
STORAGE_DIR = BACKEND_DIR / "storage"
DB_PATH = str(STORAGE_DIR / "database.db")
TEMP_DIR = STORAGE_DIR / "temp"

# Initialize SQLite database
db.init_db(DB_PATH)

app = FastAPI(title="CoWatch Video Pipeline Backend")

# Enable CORS for frontend UI interaction
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Route to serve frontend UI at the root
@app.get("/")
def serve_ui():
    index_file = BACKEND_DIR / "static" / "index.html"
    if not index_file.exists():
        # Ensure static folder exists
        os.makedirs(index_file.parent, exist_ok=True)
    return FileResponse(index_file)

# Core configuration from Environment
PORT = int(os.getenv("PORT", "8000"))
BASE_URL = os.getenv("BASE_URL", f"http://localhost:{PORT}")

def transcode_worker(video_id: str, input_path: str):
    """Simulates the transcoding process for testing without cowatch_sdk dependencies."""
    import time
    logger.info(f"Starting transcode task for video_id: {video_id}")
    
    # 1. Queued -> Transcoding
    time.sleep(2)
    db.update_video_status(DB_PATH, video_id, "transcoding", "Processing video stream & resolution layers...")
    
    # 2. Transcoding -> Uploading (with mock metadata updates)
    time.sleep(3)
    db.update_video_metadata(DB_PATH, video_id, 120.0, "/placeholder-thumbnail.jpg")
    db.update_video_status(DB_PATH, video_id, "uploading", "Uploading HLS segments to delivery store...")
    
    # 3. Uploading -> Completed (mock delivery URLs)
    time.sleep(3)
    delivery_url = f"{BASE_URL}/static/trimmed_clip.mp4" 
    db.update_video_delivery(DB_PATH, video_id, delivery_url)
    db.update_video_renditions(DB_PATH, video_id, [
        {"resolution": "1080p", "width": 1920, "height": 1080, "bitrate": 4500000},
        {"resolution": "720p", "width": 1280, "height": 720, "bitrate": 2200000},
        {"resolution": "360p", "width": 640, "height": 360, "bitrate": 800000}
    ])
    db.update_video_status(DB_PATH, video_id, "completed")
    logger.info(f"Mock transcoding completed successfully for {video_id}")

@app.post("/api/videos/process-local")
def process_local_video(background_tasks: BackgroundTasks):
    """Processes the test.mp4 file pre-placed in the workspace root."""
    workspace_root = BACKEND_DIR.parent
    local_test_file = workspace_root / "test.mp4"
    
    if not local_test_file.exists():
        raise HTTPException(
            status_code=404, 
            detail="test.mp4 was not found in the project root directory."
        )

    video_id = "local-test-" + uuid.uuid4().hex[:8]
    video_temp_dir = TEMP_DIR / video_id
    video_temp_dir.mkdir(parents=True, exist_ok=True)
    input_path = video_temp_dir / "original_test.mp4"

    logger.info(f"Processing local test video: {local_test_file} -> {input_path}")
    
    # Copy file to local temp directory
    try:
        shutil.copy(str(local_test_file), str(input_path))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to initialize local test file: {e}")

    # Initialize the database record
    db.create_video(DB_PATH, video_id, "queued")
    
    # Add transcode task to the background runner
    background_tasks.add_task(transcode_worker, video_id, str(input_path))
    
    return {
        "video_id": video_id,
        "status": "queued",
        "message": "Local test.mp4 has been successfully queued for processing."
    }

@app.post("/api/videos/upload")
async def upload_video(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    """Accepts a video upload and spawns the transcoding process."""
    if not file.filename.lower().endswith((".mp4", ".mov", ".avi", ".mkv")):
        raise HTTPException(status_code=400, detail="Unsupported video format")

    video_id = str(uuid.uuid4())
    video_temp_dir = TEMP_DIR / video_id
    video_temp_dir.mkdir(parents=True, exist_ok=True)
    input_path = video_temp_dir / f"original_{file.filename}"

    logger.info(f"Receiving file upload: {file.filename} -> {input_path}")
    
    # Save the file stream to disk
    with open(input_path, "wb") as buffer:
        while chunk := await file.read(1024 * 1024):
            buffer.write(chunk)

    # Initialize the database record with "queued"
    db.create_video(DB_PATH, video_id, "queued")
    
    # Add transcode task to the background runner
    background_tasks.add_task(transcode_worker, video_id, str(input_path))
    
    return {
        "video_id": video_id,
        "status": "queued",
        "message": "Video successfully uploaded and queued for processing."
    }

@app.post("/api/videos/webhook")
async def webhook_receiver(request: Request):
    """Webhook callback from the SDK to update the database state."""
    try:
        event_data = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    video_id = event_data.get("video_id")
    event_type = event_data.get("event")
    
    if not video_id or not event_type:
        raise HTTPException(status_code=422, detail="Missing video_id or event field")

    logger.info(f"Webhook received: video_id={video_id}, event={event_type}")

    # Handle various SDK events and persist them into the SQLite database
    if event_type == "status":
        status = event_data.get("status")
        db.update_video_status(DB_PATH, video_id, status)
    
    elif event_type == "metadata":
        duration = event_data.get("duration", 0.0)
        thumbnail_url = event_data.get("thumbnail_url", "")
        db.update_video_metadata(DB_PATH, video_id, duration, thumbnail_url)
    
    elif event_type == "delivery_url":
        url = event_data.get("url", "")
        db.update_video_delivery(DB_PATH, video_id, url)
    
    elif event_type == "renditions":
        renditions = event_data.get("renditions", [])
        db.update_video_renditions(DB_PATH, video_id, renditions)
    
    elif event_type == "error":
        error_msg = event_data.get("error", "Unknown error")
        db.update_video_status(DB_PATH, video_id, "failed", error_msg)

    return {"status": "ok"}

@app.get("/api/videos")
def list_videos():
    """Lists all videos in the database."""
    return db.list_videos(DB_PATH)

@app.get("/api/videos/{video_id}")
def get_video(video_id: str):
    """Retrieves metadata and status of a single video."""
    video = db.get_video(DB_PATH, video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    return video

# Content types for HLS delivery
CONTENT_TYPES = {
    ".m3u8": "application/x-mpegURL",
    ".ts": "video/MP2T",
    ".jpg": "image/jpeg",
    ".png": "image/png"
}

@app.get("/videos/{video_id}/{filename:path}")
def serve_video_file(video_id: str, filename: str):
    """Serves transcode outputs (m3u8 playlists, TS segments, thumbnails) locally."""
    target_path = (STORAGE_DIR / "videos" / video_id / filename).resolve()
    
    # Security check: ensure the requested file path lies within our storage boundary
    expected_root = (STORAGE_DIR / "videos").resolve()
    if not str(target_path).startswith(str(expected_root)):
        raise HTTPException(status_code=403, detail="Access denied")

    if not target_path.exists():
        raise HTTPException(status_code=404, detail="Requested video file not found")

    ext = target_path.suffix.lower()
    media_type = CONTENT_TYPES.get(ext, "application/octet-stream")
    return FileResponse(target_path, media_type=media_type)

LEADS_CSV = BACKEND_DIR / "leads.csv"
def notify_owner_of_lead(email: str, first_name: str):
    """Sends a notification email to the owner about a new client lead."""
    import smtplib
    from email.mime.text import MIMEText
    from datetime import datetime, timezone
    
    SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER = os.getenv("SMTP_USER")
    SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
    OWNER_ALERT_EMAIL = os.getenv("OWNER_ALERT_EMAIL", "adityakatyal45678@gmail.com")
    
    if not SMTP_USER or not SMTP_PASSWORD:
        logger.warning("SMTP credentials not configured in environment. Owner alert notification skipped.")
        return
    
    try:
        body = (
            f"Hello,\n\n"
            f"A new client lead has registered interest on the CoWatch SDK platform:\n\n"
            f"- Name: {first_name}\n"
            f"- Email: {email}\n"
            f"- Registered At: {datetime.now(timezone.utc).isoformat()}\n\n"
            f"Best regards,\n"
            f"CoWatch SDK Team"
        )
        msg = MIMEText(body)
        msg["Subject"] = f"[New Lead Alert] {first_name} ({email}) is interested"
        msg["From"] = f"CoWatch SDK Team <{SMTP_USER}>"
        msg["To"] = OWNER_ALERT_EMAIL
        
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.sendmail(SMTP_USER, OWNER_ALERT_EMAIL, msg.as_string())
        server.quit()
        logger.info(f"Alert email sent to owner for lead: {email}")
    except Exception as e:
        logger.error(f"Failed to send lead alert email: {e}")

@app.post("/api/leads")
def add_lead(lead_data: dict, background_tasks: BackgroundTasks):
    """Saves user email and name directly to leads.csv for SMTP campaigns and alerts the owner."""
    email = lead_data.get("email")
    first_name = lead_data.get("first_name", "Developer")
    
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")
        
    import csv
    from datetime import datetime, timezone
    file_exists = LEADS_CSV.exists()
    now_str = datetime.now(timezone.utc).isoformat()
    
    try:
        with open(LEADS_CSV, "a", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            if not file_exists:
                writer.writerow(["email", "first_name", "status", "created_at"])
            writer.writerow([email, first_name, "pending", now_str])
        logger.info(f"Captured client lead: {first_name} ({email}) at {now_str}")
        
        # Enqueue SMTP alert email in background to prevent API latency
        background_tasks.add_task(notify_owner_of_lead, email, first_name)
    except Exception as e:
        logger.error(f"Failed to record lead to CSV: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to record contact details: {e}")
        
    return {"status": "ok", "message": "Lead registered successfully!"}

# Mount static folder for CSS, JS, etc.
app.mount("/static", StaticFiles(directory=str(BACKEND_DIR / "static")), name="static")
