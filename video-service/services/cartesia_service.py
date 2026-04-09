"""
Stage 7 — Cartesia TTS for full narration (POST /tts/bytes, MP3 @ 44.1 kHz).
See docs/blog-to-video-spec.md and docs/cartesia-tts-product-spec.md (9.3, 9.4).
"""

from __future__ import annotations

import logging
import os
import time
from pathlib import Path
from typing import Any, Optional

import httpx

log = logging.getLogger(__name__)

CARTESIA_BASE = os.environ.get("CARTESIA_BASE_URL", "https://api.cartesia.ai").rstrip("/")


def resolve_cartesia_voice_id(payload: dict[str, Any], brand: dict[str, Any]) -> str:
    """
    Resolution order (blog-to-video spec):
    1. Job payload cartesia_voice_id
    2. Brand config cartesia_voice_id
    3. CARTESIA_FALLBACK_VOICE_ID env
    """
    raw = payload.get("cartesia_voice_id")
    if isinstance(raw, str) and raw.strip():
        return raw.strip()

    raw = brand.get("cartesia_voice_id")
    if isinstance(raw, str) and raw.strip():
        return raw.strip()

    fb = os.environ.get("CARTESIA_FALLBACK_VOICE_ID", "").strip()
    if fb:
        return fb

    raise ValueError(
        "No narration voice ID: set cartesia_voice_id on the job payload, "
        "in config/brands/{brand_id}.json, or CARTESIA_FALLBACK_VOICE_ID"
    )


def _headers() -> dict[str, str]:
    key = os.environ.get("CARTESIA_API_KEY", "").strip()
    if not key:
        raise ValueError("CARTESIA_API_KEY is not set")
    version = os.environ.get("CARTESIA_VERSION", "2024-06-10").strip()
    return {
        "X-API-Key": key,
        "Cartesia-Version": version,
        "Content-Type": "application/json",
    }


def _truncate_transcript(text: str) -> str:
    max_chars = int(os.environ.get("CARTESIA_MAX_TRANSCRIPT_CHARS", "100000"))
    if len(text) <= max_chars:
        return text
    log.warning("truncating narration transcript from %s to %s chars", len(text), max_chars)
    return text[:max_chars]


def generate_narration_audio(
    narration_script: str,
    voice_id: str,
    output_path: str | Path,
) -> str:
    """
    Synthesize narration to an MP3 file via POST /tts/bytes.
    Returns the resolved path as a string.
    """
    vid = voice_id.strip()
    if not vid:
        raise ValueError("voice_id is empty")

    transcript = _truncate_transcript(narration_script)
    if not transcript.strip():
        raise ValueError("narration_script is empty")

    model_id = os.environ.get("CARTESIA_MODEL_ID", "sonic-2").strip()
    timeout_s = float(os.environ.get("CARTESIA_TTS_TIMEOUT_S", "600"))
    retries = max(1, int(os.environ.get("CARTESIA_TTS_RETRIES", "3")))

    payload: dict[str, Any] = {
        "model_id": model_id,
        "transcript": transcript,
        "voice": {"mode": "id", "id": vid},
        "output_format": {
            "container": "mp3",
            "encoding": "mp3",
            "sample_rate": 44100,
        },
    }

    url = f"{CARTESIA_BASE}/tts/bytes"
    path = Path(output_path)
    path.parent.mkdir(parents=True, exist_ok=True)

    last_err: Optional[BaseException] = None
    for attempt in range(retries):
        try:
            with httpx.Client(timeout=timeout_s) as client:
                with client.stream("POST", url, headers=_headers(), json=payload) as response:
                    if response.status_code >= 400:
                        body = response.read()
                        msg = body.decode("utf-8", errors="replace")[:800]
                        if response.status_code >= 500 and attempt < retries - 1:
                            log.warning(
                                "TTS HTTP %s (attempt %s/%s): %s",
                                response.status_code,
                                attempt + 1,
                                retries,
                                msg[:200],
                            )
                            time.sleep(0.4 * (attempt + 1))
                            continue
                        raise ValueError(
                            f"Narration synthesis failed ({response.status_code}): {msg}"
                        )

                    with open(path, "wb") as f:
                        for chunk in response.iter_bytes():
                            f.write(chunk)
            return str(path.resolve())
        except ValueError:
            raise
        except httpx.RequestError as e:
            last_err = e
            if attempt < retries - 1:
                log.warning("TTS request error (attempt %s/%s): %s", attempt + 1, retries, e)
                time.sleep(0.4 * (attempt + 1))
                continue
            raise ValueError(f"Narration synthesis request failed: {e}") from e
        except OSError as e:
            raise ValueError(f"Failed to write audio file: {e}") from e

    raise ValueError(f"Narration synthesis failed after {retries} attempts: {last_err!r}")
