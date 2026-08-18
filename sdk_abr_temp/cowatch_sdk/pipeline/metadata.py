"""Metadata + thumbnail extraction (single pass, port of the platform logic)."""

import json
import subprocess

from ..backends.storage.base import StorageBackend
from ..config import SDKConfig


def capture_duration(input_path: str, config: SDKConfig) -> float:
    cmd = [
        config.ffprobe_bin, "-v", "error",
        "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1", input_path,
    ]
    try:
        out = subprocess.run(cmd, capture_output=True, text=True)
        return float(out.stdout.strip())
    except Exception:
        return 0.0


def probe_source(input_path: str, config: SDKConfig) -> dict:
    """Probe source resolution + duration + audio presence in a single ffprobe call.

    Returns {width, height, duration, has_audio}. On any failure returns default values.
    """
    cmd = [
        config.ffprobe_bin, "-v", "error",
        "-show_entries", "stream=width,height,codec_type",
        "-show_entries", "format=duration",
        "-of", "json", input_path,
    ]
    try:
        out = subprocess.run(cmd, capture_output=True, text=True)
        data = json.loads(out.stdout or "{}")
        streams = data.get("streams") or []
        
        video_stream = {}
        has_audio = False
        for s in streams:
            if s.get("codec_type") == "video" and not video_stream:
                video_stream = s
            elif s.get("codec_type") == "audio":
                has_audio = True
                
        fmt = data.get("format") or {}
        return {
            "width": int(video_stream.get("width") or 0),
            "height": int(video_stream.get("height") or 0),
            "duration": float(fmt.get("duration") or 0),
            "has_audio": has_audio,
        }
    except Exception:
        return {"width": 0, "height": 0, "duration": 0.0, "has_audio": False}


def generate_thumbnail(input_path: str, thumbnail_path: str, config: SDKConfig) -> bool:
    cmd = [config.ffmpeg_bin, "-y", "-i", input_path, "-ss", "00:00:02.000", "-vframes", "1", thumbnail_path]
    try:
        subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return True
    except Exception:
        return False


def upload_thumbnail(storage: StorageBackend, thumbnail_path: str, video_id: str, config: SDKConfig):
    storage.upload_file(thumbnail_path, f"videos/{video_id}/thumbnail.jpg", "image/jpeg")
