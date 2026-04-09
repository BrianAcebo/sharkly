"""
RQ worker entrypoint — blog-to-video pipeline.

Stage 5: content processor -> article.txt
Stage 6: Claude -> script.json
Stage 7: Cartesia TTS -> narration.mp3
Stage 8: Remotion -> video_no_audio.mp4
Stage 9: FFmpeg mux + Supabase upload -> download_url
"""

from __future__ import annotations

from pathlib import Path

from dotenv import load_dotenv

_video_service_dir = Path(__file__).resolve().parents[1]
_repo_root = _video_service_dir.parent
load_dotenv(_repo_root / ".env")
load_dotenv(_video_service_dir / ".env")

import json
import logging
import os
import time
from typing import Any

from services.assembler import assemble_final_video
from services.cartesia_service import generate_narration_audio, resolve_cartesia_voice_id
from services.claude_service import (
    generate_video_script,
    load_brand_config,
    parse_and_validate_script_json,
)
from services.content_processor import extract_article_text
from services.job_store import get_job, update_status
from services.storage import upload_video_to_storage
from services.brand_merge import merge_video_brand
from services.remotion_renderer import RemotionRenderer
from utils.file_helpers import job_output_dir, remove_job_output_dir

log = logging.getLogger(__name__)


def process_video_job(job_id: str, payload: dict[str, Any]) -> None:
    log.info("process_video_job start job_id=%s", job_id)
    out_dir: Path | None = None
    try:
        if not get_job(job_id):
            log.warning("missing job record job_id=%s — skipping", job_id)
            return

        step_sleep = float(os.environ.get("VIDEO_WORKER_STEP_SLEEP", "0.15"))

        brand_id = str(payload.get("brand_id") or "sharkly")
        raw_opts = payload.get("options")
        options: dict[str, Any] = raw_opts if isinstance(raw_opts, dict) else {}

        brand = load_brand_config(brand_id)
        raw_override = payload.get("brand_override")
        brand_override = raw_override if isinstance(raw_override, dict) else None
        brand = merge_video_brand(brand, brand_override)

        input_type = str(payload.get("input_type") or "").strip().lower()
        content = payload.get("content")
        if content is None:
            content = ""
        elif not isinstance(content, str):
            content = str(content)

        out_dir = job_output_dir(job_id)

        if input_type == "script_json":
            # User provided edited script — skip article extract + Claude.
            update_status(job_id, "processing", "generating_script", 10)
            try:
                script = parse_and_validate_script_json(content)
            except ValueError as e:
                update_status(job_id, "failed", None, 0, error=f"Script: {e}")
                return
            narration_preview = str(script.get("narration_script") or "")
            article_path = out_dir / "article.txt"
            article_path.write_text(narration_preview, encoding="utf-8")
            script_path = out_dir / "script.json"
            script_path.write_text(json.dumps(script, indent=2), encoding="utf-8")
            log.info(
                "loaded script_json job_id=%s scenes=%s",
                job_id,
                len(script.get("scenes") or []),
            )
            update_status(job_id, "processing", "generating_script", 28)
            time.sleep(step_sleep)
        else:
            # --- Stage 5: content processor (generating_script) ---
            update_status(job_id, "processing", "generating_script", 5)
            try:
                article_text = extract_article_text(input_type, content)
            except ValueError as e:
                update_status(job_id, "failed", None, 0, error=f"Content: {e}")
                return

            article_path = out_dir / "article.txt"
            article_path.write_text(article_text, encoding="utf-8")
            log.info(
                "wrote article.txt job_id=%s chars=%s",
                job_id,
                len(article_text),
            )
            update_status(job_id, "processing", "generating_script", 15)

            # --- Stage 6: Claude script ---
            update_status(job_id, "processing", "generating_script", 20)
            try:
                script = generate_video_script(article_text, brand_id, options)
            except ValueError as e:
                update_status(job_id, "failed", None, 0, error=f"Script: {e}")
                return

            script_path = out_dir / "script.json"
            script_path.write_text(json.dumps(script, indent=2), encoding="utf-8")
            log.info(
                "wrote script.json job_id=%s scenes=%s",
                job_id,
                len(script.get("scenes") or []),
            )
            update_status(job_id, "processing", "generating_script", 28)
            time.sleep(step_sleep)

        # --- Stage 7: Cartesia narration ---
        update_status(job_id, "processing", "generating_audio", 30)
        try:
            voice_id = resolve_cartesia_voice_id(payload, brand)
        except ValueError as e:
            update_status(job_id, "failed", None, 0, error=f"Voice: {e}")
            return

        narration = script.get("narration_script") or ""
        if not str(narration).strip():
            update_status(job_id, "failed", None, 0, error="Script has empty narration_script")
            return

        try:
            generate_narration_audio(str(narration), voice_id, out_dir / "narration.mp3")
        except ValueError as e:
            update_status(job_id, "failed", None, 0, error=f"Audio: {e}")
            return

        log.info("wrote narration.mp3 job_id=%s", job_id)
        update_status(job_id, "processing", "generating_audio", 38)
        time.sleep(step_sleep)

        # --- Stage 8: Remotion (single silent MP4) ---
        quality = str(options.get("quality", "medium")).lower()
        if quality not in ("low", "medium", "high"):
            quality = "medium"

        update_status(job_id, "processing", "rendering_scenes", 42)
        try:
            renderer = RemotionRenderer(brand, quality, out_dir)
            scenes = script.get("scenes") or []
            if not isinstance(scenes, list) or not scenes:
                raise ValueError("script has no scenes")
            video_no_audio = renderer.render_video(
                [s for s in scenes if isinstance(s, dict)],
                job_id,
            )
            clip_paths = [video_no_audio]
        except (RuntimeError, ValueError) as e:
            update_status(job_id, "failed", None, 0, error=f"Render: {e}")
            return

        log.info(
            "rendered video job_id=%s path=%s",
            job_id,
            clip_paths[0] if clip_paths else None,
        )
        update_status(job_id, "processing", "rendering_scenes", 65)
        time.sleep(step_sleep)

        # --- Stage 9: FFmpeg + Supabase ---
        include_captions = bool(options.get("include_captions", False))

        update_status(job_id, "processing", "assembling", 72)
        final_path = out_dir / "final.mp4"
        try:
            assemble_final_video(
                clip_paths,
                out_dir / "narration.mp3",
                final_path,
                work_dir=out_dir / "_assemble",
                include_captions=include_captions,
            )
        except Exception as e:
            update_status(job_id, "failed", None, 0, error=f"Assemble: {e}")
            return

        log.info("wrote final.mp4 job_id=%s", job_id)
        update_status(job_id, "processing", "uploading", 88)
        try:
            download_url = upload_video_to_storage(job_id, str(final_path))
        except Exception as e:
            update_status(job_id, "failed", None, 0, error=f"Upload: {e}")
            return

        update_status(
            job_id,
            "complete",
            None,
            100,
            download_url=download_url,
            clear_error=True,
        )
        log.info("job complete job_id=%s", job_id)
    except Exception as e:
        log.exception("process_video_job failed job_id=%s", job_id)
        update_status(job_id, "failed", None, 0, error=str(e))
        raise
    finally:
        if out_dir is not None:
            remove_job_output_dir(out_dir)
