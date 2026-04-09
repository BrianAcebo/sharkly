"""
Sharkly blog-to-video microservice (FastAPI).

Run API: `make dev-video` from repo root.
Run worker: `make dev-video-worker` (needs Redis, see docs/blog-to-video-spec.md).

Express API proxies here via VIDEO_SERVICE_URL (e.g. http://localhost:8000).
"""

from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

# Repo root .env (same file as Express `api/src/loadEnv.ts`), then video-service/.env overrides.
_video_service_dir = Path(__file__).resolve().parent
_repo_root = _video_service_dir.parent
load_dotenv(_repo_root / ".env")
load_dotenv(_video_service_dir / ".env")
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import video as video_router
from services import job_store

app = FastAPI(
    title="Sharkly Blog-to-Video",
    version="0.1.0",
    description="Blog-to-video pipeline — Redis/RQ job orchestration (Stage 4+).",
)

_origins_raw = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,http://localhost:5173,https://sharkly-api.fly.dev",
)
_origins = [o.strip() for o in _origins_raw.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(video_router.router, prefix="/api/video", tags=["video"])


@app.get("/api/health")
async def health() -> dict[str, str]:
    redis_status = "ok"
    try:
        job_store.ping()
    except Exception:
        redis_status = "error"
    return {
        "status": "ok",
        "service": "video-service",
        "redis": redis_status,
    }
