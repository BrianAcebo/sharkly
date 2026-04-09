"""Merge Sharkly JSON brand file with optional user overrides from the video UI."""

from __future__ import annotations

import copy
from typing import Any, Dict, Optional


def merge_video_brand(base: Dict[str, Any], override: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """Deep-merge colors and fonts; unknown keys in override are ignored."""
    out = copy.deepcopy(base)
    if not override or not isinstance(override, dict):
        return out

    oc = override.get("colors")
    if isinstance(oc, dict):
        colors = out.setdefault("colors", {})
        for key in ("background", "primary_text", "accent", "gold", "muted"):
            val = oc.get(key)
            if isinstance(val, str) and val.strip():
                colors[key] = val.strip()

    of = override.get("fonts")
    if isinstance(of, dict):
        fonts = out.setdefault("fonts", {})
        for key in ("heading", "body"):
            val = of.get(key)
            if isinstance(val, str) and val.strip():
                fonts[key] = val.strip()

    return out
