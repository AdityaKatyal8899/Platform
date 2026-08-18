"""Inline queue backend — runs the pipeline synchronously (simple self-hosts)."""

from .base import QueueBackend
from ...config import SDKConfig, build_adapters
from ...pipeline.transcode import run_pipeline


class InlineQueue(QueueBackend):
    def __init__(self, config: SDKConfig):
        self.config = config

    def enqueue(self, video_id, input_path, config: SDKConfig):
        storage, _, result = build_adapters(config)
        run_pipeline(video_id, input_path, config, storage, result)
