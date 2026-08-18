"""Callback result sink — calls a customer-supplied function (in-process embedding).

Set programmatically:  cfg.result_sink = CallbackResultSink(my_handler)
Cannot be supplied via env (callables don't serialize).
"""

from .base import ResultSink
from ...config import SDKConfig


class CallbackResultSink(ResultSink):
    def __init__(self, fn, config: SDKConfig = None):
        self.fn = fn
        self.config = config

    def on_status(self, video_id, status):
        self.fn({"video_id": video_id, "event": "status", "status": status})

    def on_metadata(self, video_id, duration, thumbnail_url):
        self.fn({"video_id": video_id, "event": "metadata", "duration": duration, "thumbnail_url": thumbnail_url})

    def on_delivery_url(self, video_id, url):
        self.fn({"video_id": video_id, "event": "delivery_url", "url": url})

    def on_error(self, video_id, error):
        self.fn({"video_id": video_id, "event": "error", "error": str(error)})
