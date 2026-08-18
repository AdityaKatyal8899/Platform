#!/bin/sh
# Default: run the CLI. For async processing, override CMD with:
#   docker run ... cowatch-sdk-worker celery -A cowatch_sdk.backends.queue.celery_app worker --loglevel=info
set -e

if [ "$1" = "celery" ]; then
  shift
  exec celery -A cowatch_sdk.backends.queue.celery_app "$@"
else
  exec cowatch-sdk "$@"
fi
