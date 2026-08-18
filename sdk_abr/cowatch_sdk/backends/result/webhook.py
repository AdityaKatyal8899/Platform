"""Webhook result sink (default for customers) — POSTs the result to a customer URL."""

import json
import sys
import urllib.request

from .base import ResultSink
from ...config import SDKConfig


class WebhookResultSink(ResultSink):
    def __init__(self, config: SDKConfig):
        self.url = config.result_webhook_url
        if not self.url:
            raise RuntimeError("RESULT_WEBHOOK_URL not configured for webhook result backend")

    def _post(self, payload):
        data = json.dumps(payload).encode()
        req = urllib.request.Request(
            self.url, data=data, headers={"Content-Type": "application/json"}
        )
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                if resp.status >= 400:
                    print(
                        f"[cowatch-sdk][webhook] WARN {resp.status} posting {self.url} "
                        f"event={payload.get('event')}",
                        file=sys.stderr,
                    )
        except Exception as e:
            print(
                f"[cowatch-sdk][webhook] WARN failed to POST {self.url}: {e}",
                file=sys.stderr,
            )

    def on_status(self, video_id, status):
        self._post({"video_id": video_id, "event": "status", "status": status})

    def on_metadata(self, video_id, duration, thumbnail_url):
        self._post({"video_id": video_id, "event": "metadata", "duration": duration, "thumbnail_url": thumbnail_url})

    def on_delivery_url(self, video_id, url):
        self._post({"video_id": video_id, "event": "delivery_url", "url": url})

    def on_error(self, video_id, error):
        self._post({"video_id": video_id, "event": "error", "error": str(error)})
