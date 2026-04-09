"""Paths for per-job output (temp files, extracted article text, etc.)."""

from __future__ import annotations

import logging
import os
import shutil
from pathlib import Path

log = logging.getLogger(__name__)


def job_output_dir(job_id: str, base: str | None = None) -> Path:
    root = base or os.environ.get("OUTPUT_DIR", "./output/jobs")
    p = Path(root) / job_id
    p.mkdir(parents=True, exist_ok=True)
    return p


def jobs_output_root(base: str | None = None) -> Path:
    return Path(base or os.environ.get("OUTPUT_DIR", "./output/jobs")).resolve()


def remove_job_output_dir(out_dir: Path, base: str | None = None) -> None:
    """
    Delete a per-job working directory after the MP4 is uploaded or the job failed.
    Only removes paths that live under OUTPUT_DIR (safety).
    """
    try:
        root = jobs_output_root(base)
        resolved = out_dir.resolve()
        try:
            resolved.relative_to(root)
        except ValueError:
            log.warning("refusing to delete job dir outside OUTPUT_DIR: %s", resolved)
            return
        if resolved == root:
            log.warning("refusing to delete OUTPUT_DIR root itself: %s", resolved)
            return
        if not resolved.exists():
            return
        shutil.rmtree(resolved, ignore_errors=False)
        log.info("removed job output directory %s", resolved)
    except OSError as e:
        log.warning("could not remove job output directory %s: %s", out_dir, e)
