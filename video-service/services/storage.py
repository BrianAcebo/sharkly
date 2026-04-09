"""
Stage 9b — Upload final MP4 to Supabase Storage and return a signed URL.
"""

from __future__ import annotations

import os
from typing import Any, Dict

from supabase import create_client


def _client() -> Any:
    # Align with repo root `.env` (PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) and video-service/.env.example
    url = (
        os.environ.get("SUPABASE_URL")
        or os.environ.get("PUBLIC_SUPABASE_URL")
        or ""
    ).strip()
    key = (
        os.environ.get("SUPABASE_SERVICE_KEY")
        or os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        or ""
    ).strip()
    if not url or not key:
        raise ValueError(
            "Set SUPABASE_URL or PUBLIC_SUPABASE_URL, and SUPABASE_SERVICE_KEY or SUPABASE_SERVICE_ROLE_KEY, to upload rendered videos"
        )
    return create_client(url, key)


def upload_video_to_storage(job_id: str, local_path: str) -> str:
    """
    Upload ``{job_id}/final.mp4`` to the configured bucket and return a signed HTTPS URL.
    """
    bucket = (os.environ.get("SUPABASE_VIDEOS_BUCKET") or "videos").strip()
    ttl = int(os.environ.get("SUPABASE_SIGNED_URL_TTL_SEC", "604800"))

    storage_path = f"{job_id}/final.mp4"
    client = _client()
    api = client.storage.from_(bucket)

    with open(local_path, "rb") as f:
        file_bytes = f.read()

    opts: Dict[str, Any] = {
        "content-type": "video/mp4",
        "upsert": "true",
    }
    try:
        api.upload(storage_path, file_bytes, file_options=opts)
    except Exception as e:
        err_s = str(e).lower()
        if "too large" in err_s or "payload" in err_s:
            raise RuntimeError(
                "Video upload rejected: file exceeds Supabase Storage max size. "
                "Raise the global limit in Supabase Dashboard → Storage → Settings (Pro+); "
                "the Free tier max is 50 MB and cannot be increased. "
                "Or reduce size: shorter script, render quality 'low', or FFMPEG_FINAL_CRF=26 in .env."
            ) from e
        raise

    signed = api.create_signed_url(storage_path, ttl)
    if isinstance(signed, dict) and signed.get("signedURL"):
        return str(signed["signedURL"])
    raise RuntimeError(f"Unexpected signed URL response: {signed!r}")
