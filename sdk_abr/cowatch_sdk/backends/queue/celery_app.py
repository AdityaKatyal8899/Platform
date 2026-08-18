"""Celery app + task (port of the platform's Celery wiring).

The task receives only serializable args (video_id, input_path, config dict) and
rebuilds its adapters from config at execution time, so no live client objects are
passed across the broker.
"""

import os

from celery import Celery

from ...config import build_adapters, config_from_dict
from ...pipeline.transcode import run_pipeline

broker = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0")
app = Celery("cowatch-sdk", broker=broker, backend=broker)
app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)


@app.task(name="cowatch_sdk.process_video")
def process_video_task(video_id, input_path, config_dict):
    cfg = config_from_dict(config_dict)
    storage, _, result = build_adapters(cfg)
    run_pipeline(video_id, input_path, cfg, storage, result)
