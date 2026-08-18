"""Headless smoke test for the CoWatch SDK pipeline (local-only, real ffmpeg).

Usage (from the sdk/ directory):
    pip install -e .
    python test_harness/smoke_test.py path/to/your/video.mp4

Processes the video locally (ABR + source-aware ladder) and prints the result-signal
events plus the produced HLS files so you can confirm the run without the web UI.
Requires ffmpeg + ffprobe on PATH.
"""
import os
import sys
import shutil
import uuid
import tempfile

from cowatch_sdk import SDKConfig, CallbackResultSink, process_video_to_hls


def main():
    if len(sys.argv) < 2:
        print("usage: python test_harness/smoke_test.py <video.mp4>")
        sys.exit(2)
    src = sys.argv[1]
    if not os.path.exists(src):
        print(f"file not found: {src}")
        sys.exit(1)

    video_id = "smoke-" + uuid.uuid4().hex[:8]
    workdir = os.path.join(tempfile.gettempdir(), "cowatch_smoke", video_id)
    os.makedirs(workdir, exist_ok=True)
    input_path = os.path.join(workdir, "original.mp4")
    shutil.copy(src, input_path)

    def handler(ev):
        kind = ev.get("event")
        if kind == "renditions":
            qs = ", ".join(f"{r['name']} ({r['height']}p)" for r in ev["renditions"])
            print(f"[renditions] {qs}")
        elif kind == "delivery_url":
            print(f"[delivery_url] {ev['url']}")
        elif kind == "error":
            print(f"[error] {ev['error']}")
        elif ev.get("status"):
            print(f"[status] {ev['status']}")

    storage_dir = os.path.join(os.getcwd(), "storage")
    cfg = SDKConfig(
        storage_backend="local",
        local_storage_dir=storage_dir,
        result_backend="callback",
    )
    cfg.result_sink = CallbackResultSink(handler)

    print(f"Processing {src} as {video_id} (local ABR)...")
    try:
        process_video_to_hls(video_id, input_path, cfg)
    except Exception as e:
        print(f"FAILED: {e}")
        sys.exit(1)

    out_dir = os.path.join(storage_dir, "videos", video_id)
    files = sorted(os.listdir(out_dir)) if os.path.isdir(out_dir) else []
    print(f"\nProduced files in {out_dir}:")
    for f in files:
        print("  ", f)
    assert "master.m3u8" in files, "master.m3u8 missing!"
    variants = [f for f in files if f.startswith("v") and f.endswith(".m3u8")]
    assert variants, "no variant playlists produced!"
    print(f"\nSMOKE TEST PASSED — {len(variants)} rendition(s) + master playlist.")
    print("Open the harness UI to play it, or point an HLS player at:")
    print(f"  {out_dir}/master.m3u8")


if __name__ == "__main__":
    main()
