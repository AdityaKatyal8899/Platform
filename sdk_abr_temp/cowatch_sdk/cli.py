"""Command-line entry point: ``cowatch-sdk <input> [--video-id ID]``."""

import argparse
import os
import shutil
import sys
import uuid

from .config import load_config, build_adapters


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(
        prog="cowatch-sdk",
        description="Process a video into HLS via the CoWatch pipeline SDK.",
    )
    parser.add_argument("input", help="Path to source video file")
    parser.add_argument("--video-id", default=None, help="Stable video id (default: random uuid)")
    args = parser.parse_args(argv)

    config = load_config()
    video_id = args.video_id or str(uuid.uuid4())

    if not os.path.exists(args.input):
        print(f"Input not found: {args.input}", file=sys.stderr)
        return 2

    output_dir = os.path.join(config.temp_dir, video_id)
    os.makedirs(output_dir, exist_ok=True)
    staged_input = os.path.join(output_dir, "original.mp4")
    shutil.copyfile(args.input, staged_input)

    storage, _, result = build_adapters(config)
    try:
        from .pipeline.transcode import run_pipeline
        run_pipeline(video_id, staged_input, config, storage, result)
    except Exception as e:
        print(f"Processing failed: {e}", file=sys.stderr)
        return 1

    print(f"Done. Delivery URL: {storage.get_delivery_url(video_id)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
