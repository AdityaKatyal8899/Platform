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

    @abstractmethod
    def on_error(self, video_id: str, error) -> None:
        ...
