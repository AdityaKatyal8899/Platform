"""Queue backend interface."""

from abc import ABC, abstractmethod


class QueueBackend(ABC):
    @abstractmethod
    def enqueue(self, video_id: str, input_path: str, config) -> None:
        """Enqueue a processing job for ``video_id`` from ``input_path``."""
