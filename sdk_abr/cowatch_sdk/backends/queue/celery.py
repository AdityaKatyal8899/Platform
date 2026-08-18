"""Celery queue backend (platform default)."""

from dataclasses import asdict

from .base import QueueBackend
from .celery_app import process_video_task
from ...config import SDKConfig


class CeleryQueue(QueueBackend):
    def __init__(self, config: SDKConfig):
        self.config = config

    def enqueue(self, video_id, input_path, config: SDKConfig):
        process_video_task.delay(video_id, input_path, asdict(config))
