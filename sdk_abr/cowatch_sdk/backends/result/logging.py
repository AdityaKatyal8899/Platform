"""Logging result sink — prints signals (dev / smoke tests)."""

import sys

from .base import ResultSink
from ...config import SDKConfig


class LoggingResultSink(ResultSink):
    def __init__(self, config: SDKConfig = None):
        self.config = config

    def on_status(self, video_id, status):
        print(f"[result] {video_id} status={status}", file=sys.stderr)

    def on_metadata(self, video_id, duration, thumbnail_url):
        print(f"[result] {video_id} metadata duration={duration} thumbnail={thumbnail_url}", file=sys.stderr)

    def on_delivery_url(self, video_id, url):
        print(f"[result] {video_id} delivery_url={url}", file=sys.stderr)

    def on_error(self, video_id, error):
        print(f"[result] {video_id} error={error}", file=sys.stderr)
