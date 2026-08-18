"""Local filesystem storage backend (dev / tests / on-disk self-hosting)."""

import os
import shutil

from .base import StorageBackend
from ...config import SDKConfig


class LocalStorage(StorageBackend):
    def __init__(self, config: SDKConfig):
        self.config = config
        self.root = config.local_storage_dir
        os.makedirs(self.root, exist_ok=True)

    def _dest(self, key):
        dest = os.path.join(self.root, key)
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        return dest

    def upload_file(self, local_path, key, content_type=None):
        dest = self._dest(key)
        temp_dest = dest + ".tmp"
        try:
            with open(local_path, "rb") as src, open(temp_dest, "wb") as dst:
                dst.write(src.read())
            os.replace(temp_dest, dest)
        except Exception as e:
            if os.path.exists(temp_dest):
                try:
                    os.remove(temp_dest)
                except Exception:
                    pass
            raise e

    def upload_fileobj(self, file_obj, key, content_type=None):
        dest = self._dest(key)
        temp_dest = dest + ".tmp"
        try:
            with open(temp_dest, "wb") as dst:
                dst.write(file_obj.read())
            os.replace(temp_dest, dest)
        except Exception as e:
            if os.path.exists(temp_dest):
                try:
                    os.remove(temp_dest)
                except Exception:
                    pass
            raise e

    def delete_prefix(self, prefix):
        target = os.path.join(self.root, prefix)
        if os.path.isdir(target):
            shutil.rmtree(target)

    def get_delivery_url(self, video_id):
        cdn = self.config.cdn_url or ""
        if cdn and not cdn.startswith(("http://", "https://")):
            cdn = "https://" + cdn
        return self.config.delivery_url_template.format(cdn=cdn.rstrip("/"), video_id=video_id)
