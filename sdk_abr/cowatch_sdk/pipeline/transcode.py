"""Core HLS transcode pipeline (de-coupled from boto3 / celery / any DB).

The pipeline depends ONLY on the ``StorageBackend`` / ``ResultSink`` interfaces and
``SDKConfig``. It does not import any concrete infrastructure library, and it never
touches a database — it EMITS result signals via the ``ResultSink``.
"""

import os
import shutil
import subprocess
import tempfile
import threading
import time

from .metadata import capture_duration, generate_thumbnail, upload_thumbnail, probe_source
from .uploader import run_uploader
from ..backends.storage.base import StorageBackend
from ..backends.result.base import ResultSink
from ..config import SDKConfig, build_adapters


def _build_ffmpeg_args(config: SDKConfig, input_path: str, output_dir: str, has_audio: bool) -> list:
    """Build the ffmpeg HLS command for a single-rendition (non-ABR) stream.

    Produces master.m3u8 + v0.m3u8 + v0_seg_%03d.ts, with keyframes aligned across
    segments via the shared ``force_key_frames`` expression so segment boundaries are
    clean.
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
        "-hls_segment_filename", os.path.join(output_dir, "v0_seg_%03d.ts"),
        "-master_pl_name", "master.m3u8",
        "-var_stream_map", "v:0,a:0" if has_audio else "v:0",
        os.path.join(output_dir, "v0.m3u8"),
    ]
    return args


def run_pipeline(video_id: str, input_path: str, config: SDKConfig,
                 storage: StorageBackend, result: ResultSink):
    os.makedirs(config.temp_dir, exist_ok=True)
    output_dir = tempfile.mkdtemp(prefix=f"cowatch-{video_id}-", dir=config.temp_dir)
    thumbnail_path = os.path.join(output_dir, "thumbnail.jpg")

    sync_thread = None
    stop_event = threading.Event()
    error_container = []

    try:
        result.on_status(video_id, "processing")

        # 1. Probe source (resolution + duration) — a single ffprobe call.
        src = probe_source(input_path, config)
        duration = src["duration"]

        # 1b. Metadata + thumbnail (single pass)
        delivery = storage.get_delivery_url(video_id)
        thumbnail_url = delivery.replace("master.m3u8", "thumbnail.jpg")
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

        # 3. FFmpeg HLS encode — single-rendition (non-ABR) stream
        args = _build_ffmpeg_args(config, input_path, output_dir, src.get("has_audio", True))

        # 4. Parallel uploader thread
        sync_thread = threading.Thread(
            target=run_uploader,
            args=(output_dir, video_id, storage, result, stop_event, error_container, config, duration),
        )
        sync_thread.start()

        ffmpeg_log = os.path.join(output_dir, "ffmpeg.log")
        with open(ffmpeg_log, "w") as log_file:
            process = subprocess.Popen(args, stdout=subprocess.DEVNULL, stderr=log_file)
            while process.poll() is None:
                if error_container:
                    process.terminate()
                    process.wait()
                    raise error_container[0]
                time.sleep(1)

            if process.returncode != 0:
                msg = "Unknown FFmpeg error"
                try:
                    with open(ffmpeg_log) as f:
                        msg = f.read()
                except Exception:
                    pass
                raise Exception(f"FFmpeg failed (exit {process.returncode}): {msg}")

        # 5. Finalize
        result.on_status(video_id, "uploading")
        stop_event.set()
        sync_thread.join()

        if error_container:
            raise error_container[0]

        master = os.path.join(output_dir, "master.m3u8")
        if not os.path.exists(master):
            raise Exception("FFmpeg completed but master.m3u8 was not generated")
        
        for f in sorted(os.listdir(output_dir)):
            if f.endswith(".m3u8"):
                storage.upload_file(
                    os.path.join(output_dir, f),
                    f"videos/{video_id}/{f}",
                    "application/x-mpegURL",
                )

        delivery = storage.get_delivery_url(video_id)
        result.on_delivery_url(video_id, delivery)

    except Exception as e:
        result.on_status(video_id, "failed")
        result.on_error(video_id, e)
        raise
    finally:
        stop_event.set()
        if sync_thread and sync_thread.is_alive():
            sync_thread.join()
        # Clean up local temp files to free up disk space
        if os.path.exists(output_dir):
            try:
                shutil.rmtree(output_dir)
            except Exception:
                pass


def process_video_to_hls(video_id: str, input_path: str, config: SDKConfig):
    """Convenience entry: build adapters from config and dispatch via the queue backend."""
    storage, queue, result = build_adapters(config)
    queue.enqueue(video_id, input_path, config)
