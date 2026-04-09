"""
Remotion CLI — one silent MP4 for the full timeline.
"""

from __future__ import annotations

import json
import logging
import os
import shutil
import subprocess
from pathlib import Path
from typing import Any

log = logging.getLogger(__name__)

SERVICE_ROOT = Path(__file__).resolve().parent.parent
REMOTION_DIR = SERVICE_ROOT / "video-templates"


class RemotionRenderer:
    def __init__(self, brand_config: dict[str, Any], quality: str, output_dir: str | Path):
        self.brand = brand_config
        self.quality = (quality or "medium").lower()
        if self.quality not in ("low", "medium", "high"):
            self.quality = "medium"
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def _quality_to_crf(self) -> int:
        return {"low": 28, "medium": 18, "high": 12}.get(self.quality, 18)

    def _build_brand_prop(self) -> dict[str, Any]:
        """Brand JSON (snake_case) → VideoProps.brand (camelCase)."""
        c = self.brand.get("colors") if isinstance(self.brand.get("colors"), dict) else {}
        fonts = self.brand.get("fonts") if isinstance(self.brand.get("fonts"), dict) else {}
        return {
            "brandId": str(self.brand.get("brand_id", "default")),
            "displayName": str(self.brand.get("display_name", "")),
            "colors": {
                "background": str(c.get("background", "#0a0a0f")),
                "primaryText": str(c.get("primary_text", "#f0f0f5")),
                "accent": str(c.get("accent", "#2563eb")),
                "gold": str(c.get("gold", "#f59e0b")),
                "muted": str(c.get("muted", "#6b7280")),
            },
            "fonts": {
                "heading": str(fonts.get("heading", "Montserrat")),
                "body": str(fonts.get("body", "Lato")),
            },
        }

    def render_video(self, scenes: list[dict[str, Any]], job_id: str) -> str:
        """
        Render all scenes as one silent H.264 MP4 via Remotion CLI.
        ``output_dir`` is the per-job folder (same as worker ``out_dir``).
        """
        _ = job_id  # reserved for logging / future artifact names
        if not REMOTION_DIR.is_dir():
            raise RuntimeError(f"Remotion project missing: {REMOTION_DIR}")
        entry = REMOTION_DIR / "src" / "index.ts"
        if not entry.is_file():
            raise RuntimeError(f"Remotion entry not found: {entry}")

        # Absolute path — Remotion runs with cwd=video-templates; a relative path would resolve
        # under video-templates/ and not where the worker writes (video-service/output/jobs/...).
        output_path = (self.output_dir / "video_no_audio.mp4").resolve()
        props: dict[str, Any] = {
            "scenes": scenes,
            "brand": self._build_brand_prop(),
            "fps": 30,
        }
        props_json = json.dumps(props, ensure_ascii=False)
        timeout = int(os.environ.get("REMOTION_RENDER_TIMEOUT_S", "7200"))

        npx = shutil.which("npx")
        if not npx:
            raise RuntimeError("npx not found on PATH — install Node.js for Remotion renders")

        cmd = [
            npx,
            "remotion",
            "render",
            str(entry),
            "VideoComposition",
            str(output_path),
            "--props",
            props_json,
            "--crf",
            str(self._quality_to_crf()),
            "--codec",
            "h264",
        ]
        # Remotion defaults to high parallelism (heavy CPU/fan on laptops). Set in repo root .env e.g.
        # REMOTION_CONCURRENCY=2  or  REMOTION_CONCURRENCY=50%
        _conc = (os.environ.get("REMOTION_CONCURRENCY") or "").strip()
        if _conc:
            cmd.extend(["--concurrency", _conc])
        log.info(
            "remotion render start job_id=%s crf=%s concurrency=%s",
            job_id,
            self._quality_to_crf(),
            _conc or "(default)",
        )
        result = subprocess.run(
            cmd,
            cwd=str(REMOTION_DIR),
            capture_output=True,
            text=True,
            timeout=timeout,
        )
        if result.returncode != 0:
            tail = ((result.stderr or "") + "\n" + (result.stdout or ""))[-8000:]
            raise RuntimeError(f"Remotion render failed (exit {result.returncode}):\n{tail}")

        if not output_path.is_file():
            raise RuntimeError(f"Remotion did not write output: {output_path}")

        log.info("remotion render done job_id=%s path=%s", job_id, output_path)
        return str(output_path.resolve())
