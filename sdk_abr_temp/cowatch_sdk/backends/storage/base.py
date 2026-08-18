"""Storage backend interface (port of the platform's S3 layer)."""

from abc import ABC, abstractmethod
from typing import Optional


class StorageBackend(ABC):
    @abstractmethod
    def upload_file(self, local_path: str, key: str, content_type: Optional[str] = None) -> None:
        """Upload a local file to ``key``."""

    @abstractmethod
    def upload_fileobj(self, file_obj, key: str, content_type: Optional[str] = None) -> None:
        """Upload a file-like object to ``key``."""

    @abstractmethod
    def delete_prefix(self, prefix: str) -> None:
        """Delete all objects under a key prefix (e.g. ``videos/{id}/``)."""

    @abstractmethod
    def get_delivery_url(self, video_id: str) -> str:
        """Public URL where the HLS manifest is delivered."""
