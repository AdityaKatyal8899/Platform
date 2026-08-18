"""Core HLS transcode pipeline (de-coupled from boto3 / celery / any DB).

The pipeline depends ONLY on the ``StorageBackend`` / ``ResultSink`` interfaces and
``SDKConfig``. It does not import any concrete infrastructure library, and it never
touches a database — it EMITS result signals via the ``ResultSink``.
"""

import os
import shutil
import subprocess
import threading
import time

from .metadata import capture_duration, generate_thumbnail, upload_thumbnail, probe_source
from .uploader import run_uploader
from ..backends.storage.base import StorageBackend
from ..backends.result.base import ResultSink
from ..config import SDKConfig, build_adapters


def _build_ffmpeg_args(config: SDKConfig, input_path: str, output_dir: str, has_audio: bool) -> list:
    """Build the ffmpeg HLS command for a single resolution HLS stream.

    Produces stream.m3u8 + stream segments (seg_%03d.ts).
    """
    ffmpeg = config.ffmpeg_bin
    args = [
        ffmpeg, "-y", "-i", input_path,
        "-c:v", "libx264", "-preset", config.ffmpeg_preset,
    ]
    if config.ffmpeg_tune:
        args += ["-tune", config.ffmpeg_tune]
    if has_audio:
        args += ["-c:a", "aac", "-b:a", config.audio_bitrate, "-ac", "2"]
        
    args += [
        "-force_key_frames", f"expr:gte(t,n_forced*{config.keyframe_interval})",
        "-hls_time", str(config.hls_segment_seconds),
        "-hls_list_size", str(config.hls_list_size),
        "-start_number", "0",
        "-hls_flags", "independent_segments",
        "-threads", "2",
        "-avoid_negative_ts", "make_zero",
        "-f", "hls",
        "-hls_segment_filename", os.path.join(output_dir, "seg_%03d.ts"),
    ]
    if config.hls_playlist_type:
        args += ["-hls_playlist_type", config.hls_playlist_type]
        
    args += [os.path.join(output_dir, "stream.m3u8")]
    return args


def run_pipeline(video_id: str, input_path: str, config: SDKConfig,
                 storage: StorageBackend, result: ResultSink):
    output_dir = os.path.dirname(input_path)
    thumbnail_path = os.path.join(output_dir, "thumbnail.jpg")

    sync_thread = None
    stop_event = threading.Event()
    error_container = []
    success = False

    try:
        result.on_status(video_id, "processing")

        # 1. Probe source (resolution + duration) — a single ffprobe call.
        src = probe_source(input_path, config)
        duration = src["duration"]

        # 1b. Metadata + thumbnail (single pass)
        delivery = storage.get_delivery_url(video_id)
        thumbnail_url = delivery.replace("stream.m3u8", "thumbnail.jpg")
        if generate_thumbnail(input_path, thumbnail_path, config):
            try:
                upload_thumbnail(storage, thumbnail_path, video_id, config)
            except Exception:
                pass
        result.on_metadata(video_id, duration, thumbnail_url)

        # 2. Cleanup old artifacts
        for f in os.listdir(output_dir):
            if f.endswith(".ts") or f.endswith(".m3u8"):
                try:
                    os.remove(os.path.join(output_dir, f))
                except Exception:
                    pass

        # 3. Spawn real-time S3 window uploader thread (handles segment pipelining)
        sync_thread = threading.Thread(
            target=run_uploader,
            args=(output_dir, video_id, storage, result, stop_event, error_container, config, duration),
            daemon=True
        )
        sync_thread.start()

        # 4. Run FFmpeg HLS transcode
        has_audio = src.get("has_audio", True)
        args = _build_ffmpeg_args(config, input_path, output_dir, has_audio)

        proc = subprocess.Popen(args, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        
        while proc.poll() is None:
            if error_container:
                proc.terminate()
                raise error_container[0]
            time.sleep(0.5)

        stdout, stderr = proc.communicate()
        if proc.returncode != 0:
            # Capture FFmpeg crash output
            truncated_err = (stderr or "")[-1200:]
            raise RuntimeError(f"FFmpeg transcode crash (code {proc.returncode}):\n{truncated_err}")

        # Transcode finished successfully. Signals the uploader thread to flush remaining segments.
        stop_event.set()
        sync_thread.join()

        if error_container:
            raise error_container[0]

        # 5. Final playlist metadata emit (client-side playlist info)
        hls_url = storage.get_delivery_url(video_id)
        result.on_status(video_id, "completed")
        success = True

    except Exception as e:
        stop_event.set()
        if sync_thread and sync_thread.is_alive():
            sync_thread.join()
        result.on_error(video_id, str(e))
        raise e

    finally:
        # Guarantee cleanup of all temp transcoding segments and playlists
        if os.path.exists(output_dir):
            for f in os.listdir(output_dir):
                if f.endswith(".ts") or f.endswith(".m3u8") or f == "thumbnail.jpg":
                    try:
                        os.remove(os.path.join(output_dir, f))
                    except Exception:
                        pass
