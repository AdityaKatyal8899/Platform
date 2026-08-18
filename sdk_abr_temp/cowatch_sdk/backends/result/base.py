"""Result sink interface.

The SDK NEVER owns a database. It only signals the outcome of a task; the customer's
backend receives these signals and writes to THEIR own database however they choose.
"""

from abc import ABC, abstractmethod


class ResultSink(ABC):
    @abstractmethod
    def on_status(self, video_id: str, status: str) -> None:
        """processing | uploading | ready | failed"""

    @abstractmethod
    def on_metadata(self, video_id: str, duration: float, thumbnail_url: str) -> None:
        ...

    @abstractmethod
    def on_delivery_url(self, video_id: str, url: str) -> None:
        ...

    def on_renditions(self, video_id: str, renditions: list) -> None:
        """Optional signal: list of available renditions.

        Default no-op so existing sinks keep satisfying the interface; override to
        deliver it. Each entry: {name, width, height, video_bitrate, audio_bitrate, url}.
        """
        pass

    @abstractmethod
    def on_error(self, video_id: str, error) -> None:
        ...
