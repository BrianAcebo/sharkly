"""
RQ queue helper — enqueue video jobs on the default queue.
"""

from __future__ import annotations

import logging
import os
from typing import Any, Optional

from rq import Queue

from services.job_store import get_rq_redis, get_job, update_status

log = logging.getLogger(__name__)

_queue: Optional[Queue] = None


def get_queue() -> Queue:
    global _queue
    if _queue is None:
        _queue = Queue(connection=get_rq_redis())
    return _queue


def _on_video_job_failure(job, exc_type, exc_value, _tb) -> None:
    """Keep Redis job record in sync when the worker raises (non-crash failures)."""
    try:
        args = getattr(job, "args", None) or ()
        if not args:
            return
        our_id = args[0]
        row = get_job(our_id) or {}
        if row.get("status") in ("complete", "failed"):
            return
        msg = f"{getattr(exc_type, '__name__', 'Error')}: {exc_value}"
        if len(msg) > 4000:
            msg = msg[:4000]
        update_status(our_id, "failed", None, int(row.get("progress") or 0), error=msg)
    except Exception:
        log.exception("on_failure for video job")


def enqueue_video_job(job_id: str, payload: dict[str, Any]) -> str:
    """
    Enqueue process_video_job. Returns RQ job id (for cancellation).
    """
    from workers.video_worker import process_video_job

    q = get_queue()
    timeout = int(os.getenv("RQ_JOB_TIMEOUT_SECONDS", "3600"))
    job = q.enqueue(
        process_video_job,
        job_id,
        payload,
        job_timeout=timeout,
        result_ttl=0,
        failure_ttl=86400,
        on_failure=_on_video_job_failure,
    )
    return job.get_id()
