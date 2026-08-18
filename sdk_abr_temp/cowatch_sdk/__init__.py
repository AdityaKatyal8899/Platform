"""CoWatch Video Pipeline SDK.

Self-hostable video processing: ingest (handed in by the customer's backend) ->
transcode -> HLS package -> upload to the customer's object storage -> emit a
result signal.

Design boundary:
  * STORAGE (customer's S3 / object store)  -> configured, not owned by the SDK.
  * SECRETS are supplied via env / .env (predefined names) or explicit SDKConfig.
  * The SDK owns NO database. It only EMITS a result signal (status / URL /
    metadata); the customer persists it into THEIR own database however they want.

This package is extracted from the CoWatch platform. The original platform code
(``backend/``) is intentionally NOT modified.
"""

from .config import SDKConfig, load_config, build_adapters, config_from_dict
from .pipeline.transcode import run_pipeline, process_video_to_hls
from .backends.storage.base import StorageBackend
from .backends.queue.base import QueueBackend
from .backends.result.base import ResultSink
from .backends.result.webhook import WebhookResultSink
from .backends.result.callback import CallbackResultSink
from .backends.result.logging import LoggingResultSink

__all__ = [
    "SDKConfig",
    "load_config",
    "build_adapters",
    "config_from_dict",
    "run_pipeline",
    "process_video_to_hls",
    "StorageBackend",
    "QueueBackend",
    "ResultSink",
    "WebhookResultSink",
    "CallbackResultSink",
    "LoggingResultSink",
]

__version__ = "0.1.0"
