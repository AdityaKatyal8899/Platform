"""Windowed, real-time HLS segment uploader (port of the platform's s3_sync_worker).

Uploads segments in windows as FFmpeg produces them and deletes them locally
immediately, minimizing local disk. Marks the video ready after ``preplay_threshold``
of segments are uploaded so playback can begin before transcode finishes.
"""

import concurrent.futures
import math
import os
import re
import threading
import time

from ..backends.storage.base import StorageBackend
from ..backends.result.base import ResultSink
from ..config import SDKConfig


def _upload_with_retry(storage, local_path, key, content_type, config):
    backoff = config.retry_backoff
    for attempt in range(1, config.retry_attempts + 1):
        try:
            storage.upload_file(local_path, key, content_type)
            return
        except Exception:
            if attempt == config.retry_attempts:
                raise
            time.sleep(backoff)
            backoff *= 2.0


def run_uploader(output_dir, video_id, storage: StorageBackend, result: ResultSink,
                 stop_event: threading.Event, error_container: list, config: SDKConfig, duration: float):
    uploaded_files = set()
    executor = concurrent.futures.ThreadPoolExecutor(max_workers=8)
    seg_pattern = re.compile(r"^seg_(\d+)\.ts$")
    window_size = config.upload_window
    seg_len = max(1, config.hls_segment_seconds)
    expected_segments = max(1, math.ceil(duration / seg_len))
    pre_play_threshold = max(1, math.ceil(expected_segments * config.preplay_threshold))
    pre_play_triggered = False

    try:
        while not stop_event.is_set() or any(
            f not in uploaded_files for f in os.listdir(output_dir) if f.endswith(".ts")
        ):
            if error_container:
                break

            try:
                all_files = os.listdir(output_dir)
                
                # Get the max sequence number found in the folder
                max_seq = -1
                parsed_segments = []  # list of (seq, filename)
                
                for f in all_files:
                    m = seg_pattern.match(f)
                    if m:
                        seq = int(m.group(1))
                        parsed_segments.append((seq, f))
                        if seq > max_seq:
                            max_seq = seq
                
                if not parsed_segments:
                    time.sleep(1)
                    continue

                uploadable = []
                for seq, fname in parsed_segments:
                    if fname in uploaded_files:
                        continue
                    # Upload only if seq is strictly less than max_seq or transcode is done
                    if seq < max_seq or stop_event.is_set():
                        uploadable.append(fname)

                if len(uploadable) >= window_size or (stop_event.is_set() and len(uploadable) > 0):
                    batch = uploadable[:window_size]
                    futures = {}
                    for filename in batch:
                        file_path = os.path.join(output_dir, filename)
                        key = f"videos/{video_id}/{filename}"
                        futures[executor.submit(_upload_with_retry, storage, file_path, key, "video/MP2T", config)] = filename

                    failed = []
                    for future, filename in futures.items():
                        try:
                            future.result()
                        except Exception as e:
                            failed.append((filename, e))

                    if failed:
                        raise Exception(f"Batch upload failed for: {[f[0] for f in failed]}")

                    for filename in batch:
                        file_path = os.path.join(output_dir, filename)
                        if os.path.exists(file_path):
                            try:
                                os.remove(file_path)
                            except Exception:
                                pass
                    for filename in batch:
                        uploaded_files.add(filename)

                    # Upload all HLS playlists so they stay current
                    for pl in sorted(os.listdir(output_dir)):
                        if pl.endswith(".m3u8"):
                            _upload_with_retry(
                                storage,
                                os.path.join(output_dir, pl),
                                f"videos/{video_id}/{pl}",
                                "application/x-mpegURL",
                                config,
                            )

                    if not pre_play_triggered and len(uploaded_files) >= pre_play_threshold:
                        url = storage.get_delivery_url(video_id)
                        result.on_delivery_url(video_id, url)
                        result.on_status(video_id, "ready")
                        pre_play_triggered = True
                else:
                    time.sleep(1)
            except Exception as e:
                error_container.append(e)
                break
    finally:
        executor.shutdown(wait=True)
