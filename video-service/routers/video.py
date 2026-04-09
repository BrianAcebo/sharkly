"""
Video job API — Stage 4: Redis-backed state + RQ worker (see workers/video_worker.py).
"""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any, Optional
from uuid import uuid4

import redis.exceptions
from fastapi import APIRouter, HTTPException, Response
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, Field
from rq.exceptions import NoSuchJobError
from rq.job import Job

from services import job_store
from services.claude_service import generate_video_script
from services.content_processor import extract_article_text
from services.queue_service import enqueue_video_job

router = APIRouter()
log = logging.getLogger(__name__)


def _reconcile_rq_failure_into_job_store(job_id: str) -> None:
    """
    RQ may mark a job failed (worker crash, SIGABRT, etc.) while our Redis mirror
    still says processing — poll would hang. Sync from RQ when the job finished badly.
    """
    try:
        row = job_store.get_job(job_id)
    except redis.exceptions.RedisError:
        return
    if not row or row.get("status") in ("complete", "failed"):
        return
    rq_jid = row.get("rq_job_id")
    if not rq_jid:
        return
    try:
        rq_job = Job.fetch(rq_jid, connection=job_store.get_rq_redis())
    except NoSuchJobError:
        return
    failed = getattr(rq_job, "is_failed", False) or rq_job.get_status() == "failed"
    if not failed:
        return
    err = rq_job.exc_info
    if not err and rq_job.result is not None:
        err = str(rq_job.result)
    if not err:
        err = "Video worker failed (see RQ logs)"
    if isinstance(err, str) and len(err) > 4000:
        err = err[:4000]
    try:
        job_store.update_status(
            job_id,
            "failed",
            None,
            int(row.get("progress") or 0),
            error=str(err),
        )
    except redis.exceptions.RedisError:
        pass


class VideoCreateBody(BaseModel):
    brand_id: str = "sharkly"
    input_type: str = Field(
        ...,
        description="url | text | tiptap_json | brief",
    )
    content: str = ""
    cluster_id: Optional[str] = None
    article_id: Optional[str] = None
    cartesia_voice_id: Optional[str] = None
    options: Optional[dict[str, Any]] = None
    brand_override: Optional[dict[str, Any]] = Field(
        default=None,
        description="Merge over base brand JSON: colors + fonts (Pango family names).",
    )


def _http_503_redis(exc: Exception) -> HTTPException:
    log.warning("redis error: %s", exc)
    return HTTPException(
        status_code=503,
        detail="redis_unavailable",
    )


@router.post("/create")
async def create_video_job(body: VideoCreateBody) -> dict[str, str]:
    job_id = str(uuid4())
    payload = body.model_dump(exclude_none=True)
    record = {
        "job_id": job_id,
        "status": "queued",
        "progress": 0,
        "current_step": None,
        "download_url": None,
        "error": None,
        "rq_job_id": None,
    }
    try:
        job_store.save_job(record)
        rq_id = enqueue_video_job(job_id, payload)
        job_store.save_job_merge(job_id, {"rq_job_id": rq_id})
    except redis.exceptions.RedisError as e:
        raise _http_503_redis(e) from e
    except Exception as e:
        log.exception("enqueue failed job_id=%s", job_id)
        try:
            job_store.save_job_merge(
                job_id,
                {"status": "failed", "error": f"Enqueue failed: {e}"},
            )
        except redis.exceptions.RedisError:
            pass
        raise HTTPException(status_code=503, detail="video_job_enqueue_failed") from e

    return {"job_id": job_id, "status": "queued"}


@router.post("/generate-script")
async def generate_script_from_article(body: VideoCreateBody) -> dict[str, Any]:
    """
    Synchronous: article → Claude script JSON (no RQ job).
    Used by the app so users can edit the script before enqueueing render.
    """
    it = (body.input_type or "").strip().lower()
    if it not in ("url", "text", "tiptap_json", "brief"):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported input_type for generate-script: {body.input_type!r}",
        )
    try:
        article_text = extract_article_text(body.input_type, body.content or "")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    opts = body.options if isinstance(body.options, dict) else {}
    try:
        script = generate_video_script(article_text, body.brand_id, opts)
    except ValueError as e:
        log.warning("generate_script failed: %s", e)
        raise HTTPException(status_code=502, detail=str(e)) from e
    return {"script": script}


_CATALOG_PATH = Path(__file__).resolve().parents[1] / "config" / "video_font_catalog.json"


@router.get("/font-catalog")
async def get_video_font_catalog() -> dict[str, Any]:
    """Curated fonts + default colors for the blog-to-video UI."""
    if not _CATALOG_PATH.is_file():
        raise HTTPException(status_code=404, detail="font_catalog_missing")
    try:
        return json.loads(_CATALOG_PATH.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        log.warning("font catalog invalid: %s", e)
        raise HTTPException(status_code=500, detail="font_catalog_invalid") from e


@router.get("/job/{job_id}")
async def get_video_job(job_id: str) -> dict[str, Any]:
    try:
        _reconcile_rq_failure_into_job_store(job_id)
        row = job_store.public_job_view(job_id)
    except redis.exceptions.RedisError as e:
        raise _http_503_redis(e) from e
    if not row:
        raise HTTPException(status_code=404, detail="Job not found")
    return row


@router.get("/download/{job_id}")
async def download_video(job_id: str) -> Response:
    """Redirect to signed URL when complete; otherwise 404."""
    try:
        row = job_store.get_job(job_id)
    except redis.exceptions.RedisError as e:
        raise _http_503_redis(e) from e
    if not row:
        raise HTTPException(status_code=404, detail="Job not found")
    if row.get("status") == "complete" and row.get("download_url"):
        return RedirectResponse(row["download_url"], status_code=302)
    raise HTTPException(
        status_code=404,
        detail="Video not ready or not available",
    )


@router.delete("/job/{job_id}")
async def delete_video_job(job_id: str) -> Response:
    try:
        row = job_store.get_job(job_id)
    except redis.exceptions.RedisError as e:
        raise _http_503_redis(e) from e
    if not row:
        raise HTTPException(status_code=404, detail="Job not found")

    rq_id = row.get("rq_job_id")
    if rq_id:
        try:
            job = Job.fetch(rq_id, connection=job_store.get_rq_redis())
            job.cancel()
        except NoSuchJobError:
            pass
        except Exception:
            log.warning("could not cancel rq job %s", rq_id, exc_info=True)

    try:
        job_store.delete_job(job_id)
    except redis.exceptions.RedisError as e:
        raise _http_503_redis(e) from e
    return Response(status_code=204)
