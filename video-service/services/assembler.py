"""
FFmpeg: stitch silent video(s), align narration audio, mux final MP4.

Single Remotion output or multiple stitched clips — same API: ``clip_paths`` ordered list.
Requires ``ffmpeg`` and ``ffprobe`` on PATH.
Optional caption burn-in is not implemented yet (see blog-to-video spec).
"""

from __future__ import annotations

import logging
import os
import shutil
import subprocess
import tempfile
from pathlib import Path
from typing import List

log = logging.getLogger(__name__)


def _which_or_raise(bin_name: str) -> str:
    from shutil import which

    p = which(bin_name)
    if not p:
        raise RuntimeError(f"{bin_name} not found on PATH — install FFmpeg")
    return p


def _ffprobe_duration_seconds(path: str | Path) -> float:
    p = _which_or_raise("ffprobe")
    r = subprocess.run(
        [
            p,
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
            str(path),
        ],
        capture_output=True,
        text=True,
        check=True,
    )
    return float((r.stdout or "0").strip() or 0.0)


def _write_concat_list(clips: List[str], list_path: Path) -> None:
    lines = ["ffconcat version 1.0\n"]
    for raw in clips:
        ap = Path(raw).resolve()
        s = str(ap).replace("'", "'\\''")
        lines.append(f"file '{s}'\n")
    list_path.write_text("".join(lines), encoding="utf-8")


def _concat_clips_ffmpeg(clips: List[str], out_path: Path, work_dir: Path) -> None:
    if not clips:
        raise ValueError("no clips to concatenate")
    lst = work_dir / "concat_list.txt"
    _write_concat_list(clips, lst)
    ff = _which_or_raise("ffmpeg")
    r = subprocess.run(
        [
            ff,
            "-y",
            "-f",
            "concat",
            "-safe",
            "0",
            "-i",
            str(lst),
            "-c",
            "copy",
            str(out_path),
        ],
        capture_output=True,
        text=True,
    )
    if r.returncode != 0:
        log.warning("concat -c copy failed, re-encoding with libx264: %s", r.stderr[-500:])
        r2 = subprocess.run(
            [
                ff,
                "-y",
                "-f",
                "concat",
                "-safe",
                "0",
                "-i",
                str(lst),
                "-c:v",
                "libx264",
                "-preset",
                os.environ.get("FFMPEG_PRESET", "medium"),
                "-crf",
                os.environ.get("FFMPEG_CRF", "23"),
                "-pix_fmt",
                "yuv420p",
                "-an",
                str(out_path),
            ],
            capture_output=True,
            text=True,
        )
        if r2.returncode != 0:
            raise RuntimeError(f"ffmpeg concat failed: {(r2.stderr or r2.stdout)[-8000:]}")


def _adjust_audio_to_duration(audio_in: Path, target_sec: float, audio_out: Path) -> None:
    ad = _ffprobe_duration_seconds(audio_in)
    if ad <= 0:
        raise RuntimeError("could not read narration audio duration")
    ff = _which_or_raise("ffmpeg")
    if ad + 0.05 < target_sec:
        pad = target_sec - ad
        subprocess.run(
            [
                ff,
                "-y",
                "-i",
                str(audio_in),
                "-af",
                f"apad=pad_dur={pad}",
                str(audio_out),
            ],
            capture_output=True,
            text=True,
            check=True,
        )
    elif ad > target_sec + 0.05:
        subprocess.run(
            [ff, "-y", "-i", str(audio_in), "-t", str(target_sec), str(audio_out)],
            capture_output=True,
            text=True,
            check=True,
        )
    else:
        subprocess.run(
            [ff, "-y", "-i", str(audio_in), "-c", "copy", str(audio_out)],
            capture_output=True,
            text=True,
            check=True,
        )


def _mux_video_audio(
    video_in: Path,
    audio_in: Path,
    out_path: Path,
) -> None:
    ff = _which_or_raise("ffmpeg")
    r = subprocess.run(
        [
            ff,
            "-y",
            "-i",
            str(video_in),
            "-i",
            str(audio_in),
            "-map",
            "0:v:0",
            "-map",
            "1:a:0",
            "-c:v",
            "libx264",
            "-preset",
            os.environ.get("FFMPEG_PRESET", "medium"),
            "-crf",
            os.environ.get("FFMPEG_FINAL_CRF", "20"),
            "-c:a",
            "aac",
            "-b:a",
            os.environ.get("FFMPEG_AUDIO_BITRATE", "192k"),
            "-pix_fmt",
            "yuv420p",
            "-shortest",
            str(out_path),
        ],
        capture_output=True,
        text=True,
    )
    if r.returncode != 0:
        raise RuntimeError(f"ffmpeg mux failed: {(r.stderr or r.stdout)[-8000:]}")


def assemble_final_video(
    clip_paths: List[str],
    narration_audio_path: str | Path,
    output_path: str | Path,
    *,
    work_dir: Path | None = None,
    include_captions: bool = False,
) -> str:
    """
    Concat ``clip_paths`` (ordered), pad/trim ``narration_audio`` to match video
    duration, mux to ``output_path``. Returns resolved output path string.
    """
    if include_captions:
        log.warning("Caption burn-in requested but not implemented; continuing without captions")

    out = Path(output_path)
    out.parent.mkdir(parents=True, exist_ok=True)
    narr = Path(narration_audio_path)

    own_tmp = work_dir is None
    tmp = Path(work_dir) if work_dir is not None else Path(tempfile.mkdtemp(prefix="assemble_"))
    tmp.mkdir(parents=True, exist_ok=True)
    concat_vid = tmp / "stitched_video.mp4"
    adj_audio = tmp / "narration_adjusted.mp3"

    try:
        if len(clip_paths) == 1:
            single = Path(clip_paths[0]).resolve()
            if not single.is_file():
                raise ValueError(f"missing video file: {single}")
            vdur = _ffprobe_duration_seconds(single)
            if vdur <= 0:
                raise RuntimeError("video has zero duration")
            _adjust_audio_to_duration(narr, vdur, adj_audio)
            _mux_video_audio(single, adj_audio, out)
        else:
            _concat_clips_ffmpeg(clip_paths, concat_vid, tmp)
            vdur = _ffprobe_duration_seconds(concat_vid)
            if vdur <= 0:
                raise RuntimeError("stitched video has zero duration")

            _adjust_audio_to_duration(narr, vdur, adj_audio)
            _mux_video_audio(concat_vid, adj_audio, out)
    finally:
        if own_tmp:
            shutil.rmtree(tmp, ignore_errors=True)

    return str(out.resolve())
