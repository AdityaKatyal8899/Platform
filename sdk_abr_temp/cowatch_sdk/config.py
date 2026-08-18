"""SDK configuration + adapter factory.

Customers configure the pipeline entirely through ``SDKConfig`` (env-loaded, 12-factor).
``build_adapters`` wires the selected backend implementations.

SECRETS: supplied via env / ``.env`` (predefined names) or explicit ``SDKConfig`` params.
The SDK never logs secret values, and the variable names are part of the published
contract (see ``.env.example``).
"""

import os
from dataclasses import dataclass
from typing import Optional, Any


@dataclass
class SDKConfig:
    # --- Storage (CUSTOMER-owned object store) ---
    storage_backend: str = "s3"            # s3 | local
    s3_bucket: Optional[str] = None
    s3_region: Optional[str] = None
    s3_access_key: Optional[str] = None
    s3_secret: Optional[str] = None
    s3_endpoint_url: Optional[str] = None  # for R2 / MinIO / S3-compatible stores
    local_storage_dir: str = "storage"

    # --- Delivery / CDN (CUSTOMER-owned) ---
    cdn_url: str = ""
    delivery_url_template: str = "{cdn}/videos/{video_id}/stream.m3u8"

    # --- Queue (optional glue; the customer's backend triggers the SDK) ---
    queue_backend: str = "inline"          # inline | celery
    celery_broker_url: str = "redis://localhost:6379/0"

    # --- Result signal (the SDK EMITS; the customer PERSISTS to their DB) ---
    result_backend: str = "webhook"        # webhook | logging | callback
    result_webhook_url: Optional[str] = None
    # Programmatic-only: a ResultSink instance set directly (cannot come from env).
    result_sink: Any = None

    # --- HLS / transcode ---
    hls_segment_seconds: int = 4
    hls_list_size: int = 0
    hls_playlist_type: Optional[str] = None
    keyframe_interval: float = 2.0
    audio_bitrate: str = "128k"
    ffmpeg_bin: str = "ffmpeg"
    ffprobe_bin: str = "ffprobe"
    ffmpeg_preset: str = "medium"
    ffmpeg_tune: Optional[str] = None

    # --- Runtime ---
    temp_dir: str = "storage/videos"
    upload_window: int = 10
    preplay_threshold: float = 0.30
    retry_attempts: int = 5
    retry_backoff: float = 1.0

    def to_dict(self) -> dict:
        """Serialize for passing through a queue (result_sink is intentionally omitted)."""
        return {
            "storage_backend": self.storage_backend,
            "s3_bucket": self.s3_bucket,
            "s3_region": self.s3_region,
            "s3_access_key": self.s3_access_key,
            "s3_secret": self.s3_secret,
            "s3_endpoint_url": self.s3_endpoint_url,
            "local_storage_dir": self.local_storage_dir,
            "cdn_url": self.cdn_url,
            "delivery_url_template": self.delivery_url_template,
            "queue_backend": self.queue_backend,
            "celery_broker_url": self.celery_broker_url,
            "result_backend": self.result_backend,
            "result_webhook_url": self.result_webhook_url,
            "hls_segment_seconds": self.hls_segment_seconds,
            "hls_list_size": self.hls_list_size,
            "hls_playlist_type": self.hls_playlist_type,
            "keyframe_interval": self.keyframe_interval,
            "audio_bitrate": self.audio_bitrate,
            "ffmpeg_bin": self.ffmpeg_bin,
            "ffprobe_bin": self.ffprobe_bin,
            "ffmpeg_preset": self.ffmpeg_preset,
            "ffmpeg_tune": self.ffmpeg_tune,
            "temp_dir": self.temp_dir,
            "upload_window": self.upload_window,
            "preplay_threshold": self.preplay_threshold,
            "retry_attempts": self.retry_attempts,
            "retry_backoff": self.retry_backoff,
        }


def config_from_dict(data: dict) -> "SDKConfig":
    """Rebuild an SDKConfig from a dict (used to pass config through a queue)."""
    return SDKConfig(**dict(data))


def _env(name: str, default=None):
    v = os.getenv(name)
    return v if v is not None else default


def load_config() -> SDKConfig:
    """Build SDKConfig from environment variables (predefined names)."""
    return SDKConfig(
        storage_backend=_env("STORAGE_BACKEND", "s3"),
        s3_bucket=_env("S3_BUCKET"),
        s3_region=_env("S3_REGION"),
        s3_access_key=_env("S3_ACCESS_KEY"),
        s3_secret=_env("S3_SECRET"),
        s3_endpoint_url=_env("S3_ENDPOINT_URL"),
        local_storage_dir=_env("LOCAL_STORAGE_DIR", "storage"),
        cdn_url=_env("CDN_URL", ""),
        delivery_url_template=_env("DELIVERY_URL_TEMPLATE", "{cdn}/videos/{video_id}/stream.m3u8"),
        queue_backend=_env("QUEUE_BACKEND", "inline"),
        celery_broker_url=_env("CELERY_BROKER_URL", "redis://localhost:6379/0"),
        result_backend=_env("RESULT_BACKEND", "webhook"),
        result_webhook_url=_env("RESULT_WEBHOOK_URL"),
        hls_segment_seconds=int(_env("HLS_SEGMENT_SECONDS", "4")),
        hls_list_size=int(_env("HLS_LIST_SIZE", "0")),
        hls_playlist_type=_env("HLS_PLAYLIST_TYPE"),
        keyframe_interval=float(_env("KEYFRAME_INTERVAL", "2.0")),
        audio_bitrate=_env("AUDIOBITRATE", "128k"),
        ffmpeg_bin=_env("FFMPEG_BIN", "ffmpeg"),
        ffprobe_bin=_env("FFPROBE_BIN", "ffprobe"),
        ffmpeg_preset=_env("FFMPEG_PRESET", "medium"),
        ffmpeg_tune=_env("FFMPEG_TUNE"),
        temp_dir=_env("TEMP_DIR", "storage/videos"),
        upload_window=int(_env("UPLOAD_WINDOW", "10")),
        preplay_threshold=float(_env("PREPLAY_THRESHOLD", "0.30")),
        retry_attempts=int(_env("RETRY_ATTEMPTS", "5")),
        retry_backoff=float(_env("RETRY_BACKOFF", "1.0")),
    )


def build_adapters(config: SDKConfig) -> tuple:
    """Instantiate storage and result adapters based on config backends."""
    # Storage adapter
    sb = config.storage_backend.lower()
    if sb == "s3":
        from .backends.storage.s3 import S3StorageBackend
        storage = S3StorageBackend(config)
    elif sb == "local":
        from .backends.storage.local import LocalStorageBackend
        storage = LocalStorageBackend(config)
    else:
        raise ValueError(f"Unknown storage backend: {sb}")

    # Result/signal adapter
    if config.result_sink:
        result = config.result_sink
    else:
        rb = config.result_backend.lower()
        if rb == "webhook":
            from .backends.result.webhook import WebhookResultSink
            result = WebhookResultSink(config)
        elif rb == "logging":
            from .backends.result.logging import LoggingResultSink
            result = LoggingResultSink(config)
        else:
            raise ValueError(f"Unknown result backend: {rb}")

    return storage, result
