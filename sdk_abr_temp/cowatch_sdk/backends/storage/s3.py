"""S3 storage backend (customer-provided object store; behavior preserved).

Supports AWS S3 and S3-compatible endpoints (R2, MinIO) via ``s3_endpoint_url``.
"""

import boto3
from botocore.config import Config

from .base import StorageBackend
from ...config import SDKConfig


class S3Storage(StorageBackend):
    def __init__(self, config: SDKConfig):
        self.config = config
        if not config.s3_bucket:
            raise RuntimeError("S3_BUCKET not configured")
        self.bucket = config.s3_bucket
        self._client = boto3.client(
            "s3",
            region_name=config.s3_region,
            aws_access_key_id=config.s3_access_key,
            aws_secret_access_key=config.s3_secret,
            endpoint_url=config.s3_endpoint_url,
            config=Config(signature_version="s3v4", s3={"addressing_style": "virtual"}),
        )

    def upload_file(self, local_path, key, content_type=None):
        extra = {"ContentType": content_type} if content_type else {}
        self._client.upload_file(local_path, self.bucket, key, ExtraArgs=extra)

    def upload_fileobj(self, file_obj, key, content_type=None):
        extra = {"ContentType": content_type} if content_type else {}
        self._client.upload_fileobj(file_obj, self.bucket, key, ExtraArgs=extra)

    def delete_prefix(self, prefix):
        paginator = self._client.get_paginator("list_objects_v2")
        pages = paginator.paginate(Bucket=self.bucket, Prefix=prefix)
        for page in pages:
            keys = [{"Key": o["Key"]} for o in page.get("Contents", [])]
            if keys:
                for i in range(0, len(keys), 1000):
                    self._client.delete_objects(Bucket=self.bucket, Delete={"Objects": keys[i:i + 1000]})

    def get_delivery_url(self, video_id):
        cdn = self.config.cdn_url or ""
        if cdn and not cdn.startswith(("http://", "https://")):
            cdn = "https://" + cdn
        return self.config.delivery_url_template.format(cdn=cdn.rstrip("/"), video_id=video_id)
