"""
Redis-backed video job records (Stage 4+). Keys: video:job:{job_id}
"""

from __future__ import annotations

import json
import os
from typing import Any, Optional

import redis

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")

_client: Optional[redis.Redis] = None
_rq_client: Optional[redis.Redis] = None


def get_redis() -> redis.Redis:
    """JSON job records (`video:job:*`) — string values."""
    global _client
    if _client is None:
        _client = redis.from_url(REDIS_URL, decode_responses=True)
    return _client


def get_rq_redis() -> redis.Redis:
    """
    Raw Redis connection for RQ queues / job payloads (pickled bytes).
    Do not use decode_responses=True here — it breaks RQ.
    """
    global _rq_client
    if _rq_client is None:
        _rq_client = redis.from_url(REDIS_URL, decode_responses=False)
    return _rq_client


def ping() -> bool:
    return bool(get_redis().ping())


def _key(job_id: str) -> str:
    return f"video:job:{job_id}"


def get_job(job_id: str) -> Optional[dict[str, Any]]:
    raw = get_redis().get(_key(job_id))
    if not raw:
        return None
    return json.loads(raw)


def save_job(record: dict[str, Any]) -> None:
    job_id = record["job_id"]
    get_redis().set(_key(job_id), json.dumps(record))


def save_job_merge(job_id: str, updates: dict[str, Any]) -> None:
    row = get_job(job_id) or {}
    row["job_id"] = job_id
    row.update(updates)
    save_job(row)


def delete_job(job_id: str) -> None:
    get_redis().delete(_key(job_id))


def update_status(
    job_id: str,
    status: str,
    current_step: Optional[str],
    progress: int,
    *,
    download_url: Optional[str] = None,
    error: Optional[str] = None,
    clear_error: bool = False,
) -> None:
    """Merge status fields into the job record (worker + API)."""
    row = get_job(job_id)
    if not row:
        return
    row["status"] = status
    row["current_step"] = current_step
    row["progress"] = progress
    if download_url is not None:
        row["download_url"] = download_url
    if clear_error:
        row["error"] = None
    elif error is not None:
        row["error"] = error
    save_job(row)


def public_job_view(job_id: str) -> Optional[dict[str, Any]]:
    row = get_job(job_id)
    if not row:
        return None
    return {
        "job_id": row["job_id"],
        "status": row["status"],
        "progress": row["progress"],
        "current_step": row.get("current_step"),
        "download_url": row.get("download_url"),
        "error": row.get("error"),
    }
