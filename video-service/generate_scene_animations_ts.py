#!/usr/bin/env python3
"""
Auto-generates videoSceneAnimations.ts from claude_service.py ANIMATION_BY_TYPE.

Run this whenever ANIMATION_BY_TYPE changes in claude_service.py:
    python generate_scene_animations_ts.py

`--check` validates the whole blog-to-video animation contract:

  • ANIMATION_BY_TYPE / SCENE_TYPES / TRANSITIONS / ACCENT_COLORS in claude_service.py
  • videoSceneAnimations.ts — ANIMATION_BY_TYPE lines + SCENE_TYPES set matches Python
  • SCENE_TYPES keys ↔ ANIMATION_BY_TYPE keys (same set)
  • ui/.../videoScript.ts — VIDEO_SCENE_TYPES matches Python SCENE_TYPES
  • parseVideoScript default: mirror of defaultAnimationStyleForSceneType() in videoScript.ts
    must always pick a value allowed for that scene type (catches “global fade_up” bugs)

Place this script in the video-service root and commit it alongside both files.
"""

from __future__ import annotations

import sys
from pathlib import Path

# ── Import ANIMATION_BY_TYPE directly from the service ──────────────────────
SERVICE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SERVICE_DIR))

try:
    from services.claude_service import ANIMATION_BY_TYPE, SCENE_TYPES, TRANSITIONS, ACCENT_COLORS
except ImportError:
    # Fallback: parse the file directly without importing (avoids missing deps)
    import ast, re

    source = (SERVICE_DIR / "services" / "claude_service.py").read_text()
    tree = ast.parse(source)

    ANIMATION_BY_TYPE: dict = {}
    SCENE_TYPES: set = set()
    TRANSITIONS: set = set()
    ACCENT_COLORS: set = set()

    for node in ast.walk(tree):
        if isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Name):
                    if target.id == "ANIMATION_BY_TYPE" and isinstance(node.value, ast.Dict):
                        for k, v in zip(node.value.keys, node.value.values):
                            if isinstance(k, ast.Constant):
                                if isinstance(v, ast.Set):
                                    ANIMATION_BY_TYPE[k.value] = set(
                                        elt.value for elt in v.elts
                                        if isinstance(elt, ast.Constant)
                                    )
                    elif target.id == "SCENE_TYPES" and isinstance(node.value, ast.Set):
                        SCENE_TYPES = {
                            elt.value for elt in node.value.elts
                            if isinstance(elt, ast.Constant)
                        }
                    elif target.id == "TRANSITIONS" and isinstance(node.value, ast.Set):
                        TRANSITIONS = {
                            elt.value for elt in node.value.elts
                            if isinstance(elt, ast.Constant)
                        }
                    elif target.id == "ACCENT_COLORS" and isinstance(node.value, ast.Set):
                        ACCENT_COLORS = {
                            elt.value for elt in node.value.elts
                            if isinstance(elt, ast.Constant)
                        }


def generate_ts() -> str:
    lines = [
        "/**",
        " * AUTO-GENERATED — do not edit by hand.",
        " * Source of truth: video-service/services/claude_service.py ::",
        " *   ANIMATION_BY_TYPE, SCENE_TYPES, TRANSITIONS, ACCENT_COLORS",
        " * Regenerate with: python generate_scene_animations_ts.py",
        " */",
        "",
        "/** All valid scene type strings. */",
        "export const SCENE_TYPES = new Set([",
    ]
    for t in sorted(SCENE_TYPES):
        lines.append(f"  '{t}',")
    lines += [
        "] as const);",
        "",
        "export type SceneType = typeof SCENE_TYPES extends Set<infer T> ? T : never;",
        "",
        "/** Valid transitions between scenes. */",
        "export const TRANSITIONS = new Set([",
    ]
    for t in sorted(TRANSITIONS):
        lines.append(f"  '{t}',")
    lines += [
        "] as const);",
        "",
        "/** Valid accent color names (map to hex via brand config). */",
        "export const ACCENT_COLORS = new Set([",
    ]
    for t in sorted(ACCENT_COLORS):
        lines.append(f"  '{t}',")
    lines += [
        "] as const);",
        "",
        "/** Allowed animation_style values per scene type. */",
        "export const ANIMATION_BY_TYPE: Record<string, readonly string[]> = {",
    ]

    # Sort keys to match Python source order where possible, else alphabetical
    preferred_order = [
        # Universal
        "cold_open", "title_card", "section_header", "bullet_points",
        "stat_callout", "text_reveal", "quote_card", "comparison_table", "closing_card",
        "vox_documentary", "kinetic_chart",
        # SEO + Sales
        "myth_vs_reality", "checklist", "mechanism_diagram",
        # Catholic
        "scripture_quote", "evidence_stack", "objection_rebuttal",
    ]
    sorted_keys = [k for k in preferred_order if k in ANIMATION_BY_TYPE]
    sorted_keys += sorted(k for k in ANIMATION_BY_TYPE if k not in preferred_order)

    for key in sorted_keys:
        vals = sorted(ANIMATION_BY_TYPE[key])
        arr = ", ".join(f"'{v}'" for v in vals)
        lines.append(f"  {key}: [{arr}],")

    lines += [
        "};",
        "",
        "/** Returns the allowed animation styles for a given scene type. */",
        "export function animationsForSceneType(sceneType: string): readonly string[] {",
        "  return ANIMATION_BY_TYPE[sceneType] ?? ANIMATION_BY_TYPE['title_card'];",
        "}",
        "",
        "/** Type guard — returns true if value is a valid animation style for the given scene type. */",
        "export function isValidAnimation(sceneType: string, animation: string): boolean {",
        "  return (ANIMATION_BY_TYPE[sceneType] ?? []).includes(animation);",
        "}",
        "",
        "/** Type guard — returns true if value is a valid scene type. */",
        "export function isValidSceneType(t: string): t is SceneType {",
        "  return SCENE_TYPES.has(t as SceneType);",
        "}",
        "",
        "/** Same as Python `_coerce_animation_style_to_allowed` — invalid/missing → allowed[0]. */",
        "export function coerceAnimationStyle(sceneType: string, animation: string): string {",
        "  const allowed = animationsForSceneType(sceneType);",
        "  const a = animation.trim();",
        "  if (a && allowed.includes(a)) return a;",
        "  return allowed[0] ?? 'fade_up';",
        "}",
        "",
        "/** Same as Python `_coerce_transition_to_allowed`. */",
        "export function normalizeTransition(transitionIn: string): string {",
        "  const t = transitionIn.trim();",
        "  return TRANSITIONS.has(t) ? t : 'fade';",
        "}",
        "",
        "/** Same as Python `_coerce_accent_to_allowed`. */",
        "export function normalizeAccentColor(accent: string): string {",
        "  const c = accent.trim();",
        "  return ACCENT_COLORS.has(c) ? c : 'accent';",
        "}",
        "",
    ]
    return "\n".join(lines)


def _anim_vals(py_vals) -> list[str]:
    """Normalize ANIMATION_BY_TYPE value (set or list) to sorted list."""
    return sorted(py_vals)


def animations_for_scene_type(scene_type: str) -> list[str]:
    """Mirror of videoSceneAnimations.ts `animationsForSceneType`."""
    if scene_type in ANIMATION_BY_TYPE:
        return _anim_vals(ANIMATION_BY_TYPE[scene_type])
    return _anim_vals(ANIMATION_BY_TYPE["title_card"])


def default_animation_style_for_scene_type(scene_type: str) -> str:
    """
    Same rule as `_coerce_animation_style_to_allowed` when the value is missing/invalid:
    first sorted allowed token (matches TS `coerceAnimationStyle`).
    """
    allowed = animations_for_scene_type(scene_type)
    return allowed[0] if allowed else "fade_up"


def check_animation_table_ts_matches_python(ts_path: Path) -> list[str]:
    """ANIMATION_BY_TYPE lines in videoSceneAnimations.ts match claude_service.py."""
    if not ts_path.exists():
        return ["TypeScript file does not exist yet — run without --check to generate it."]

    import re

    content = ts_path.read_text()
    mismatches: list[str] = []

    for scene_type, py_vals in ANIMATION_BY_TYPE.items():
        py_sorted = _anim_vals(py_vals)
        pattern = rf"{re.escape(scene_type)}:\s*\[([^\]]*)\]"
        m = re.search(pattern, content)
        if not m:
            mismatches.append(f"[ANIMATION_BY_TYPE] MISSING in TS: {scene_type}")
            continue
        ts_raw = m.group(1)
        ts_vals = sorted(v.strip().strip("'\"") for v in ts_raw.split(",") if v.strip())
        if py_sorted != ts_vals:
            mismatches.append(
                f"[ANIMATION_BY_TYPE] MISMATCH [{scene_type}]: Python={py_sorted}  TS={ts_vals}"
            )

    return mismatches


def check_ts_scene_types_set_matches_python(ts_path: Path) -> list[str]:
    """`export const SCENE_TYPES = new Set([...])` in videoSceneAnimations.ts matches SCENE_TYPES."""
    import re

    if not ts_path.exists():
        return []

    content = ts_path.read_text()
    m = re.search(r"export const SCENE_TYPES = new Set\(\[([\s\S]*?)\]\s*as const\)", content)
    if not m:
        return ["[SCENE_TYPES] Could not parse SCENE_TYPES Set in videoSceneAnimations.ts"]

    inner = m.group(1)
    ts_types = set(re.findall(r"'([^']+)'", inner))
    py_types = set(SCENE_TYPES)
    mismatches: list[str] = []
    if ts_types != py_types:
        only_py = sorted(py_types - ts_types)
        only_ts = sorted(ts_types - py_types)
        if only_py:
            mismatches.append(f"[SCENE_TYPES] In Python but not TS Set: {only_py}")
        if only_ts:
            mismatches.append(f"[SCENE_TYPES] In TS Set but not Python: {only_ts}")
    return mismatches


def check_python_scene_types_align_with_animation_keys() -> list[str]:
    """SCENE_TYPES and ANIMATION_BY_TYPE must define the same scene keys."""
    keys = set(ANIMATION_BY_TYPE.keys())
    st = set(SCENE_TYPES)
    mismatches: list[str] = []
    if keys != st:
        only_py = sorted(st - keys)
        only_keys = sorted(keys - st)
        if only_py:
            mismatches.append(
                f"[claude_service] SCENE_TYPES entries missing from ANIMATION_BY_TYPE: {only_py}"
            )
        if only_keys:
            mismatches.append(
                f"[claude_service] ANIMATION_BY_TYPE keys not in SCENE_TYPES: {only_keys}"
            )
    return mismatches


def check_parse_video_script_defaults() -> list[str]:
    """
    For every scene type, the TS parseVideoScript fallback animation must be allowed
    (same logic as defaultAnimationStyleForSceneType in videoScript.ts).
    """
    mismatches: list[str] = []
    for st in sorted(SCENE_TYPES):
        default = default_animation_style_for_scene_type(st)
        allowed = ANIMATION_BY_TYPE.get(st, set())
        if default not in allowed:
            mismatches.append(
                f"[parseVideoScript default] scene {st!r}: computed default {default!r} "
                f"not in ANIMATION_BY_TYPE[{st!r}] = {sorted(allowed)}"
            )
    return mismatches


def check_ts_transitions_accents_match_python(ts_path: Path) -> list[str]:
    """TRANSITIONS / ACCENT_COLORS Sets in videoSceneAnimations.ts match claude_service.py."""
    import re

    if not ts_path.exists():
        return []

    content = ts_path.read_text()
    mismatches: list[str] = []

    m = re.search(r"export const TRANSITIONS = new Set\(\[([\s\S]*?)\]\s*as const\)", content)
    if not m:
        mismatches.append("[TRANSITIONS] Could not parse TRANSITIONS Set in videoSceneAnimations.ts")
    else:
        ts_t = set(re.findall(r"'([^']+)'", m.group(1)))
        if ts_t != TRANSITIONS:
            only_py = sorted(TRANSITIONS - ts_t)
            only_ts = sorted(ts_t - TRANSITIONS)
            if only_py:
                mismatches.append(f"[TRANSITIONS] In Python but not TS: {only_py}")
            if only_ts:
                mismatches.append(f"[TRANSITIONS] In TS but not Python: {only_ts}")

    m2 = re.search(r"export const ACCENT_COLORS = new Set\(\[([\s\S]*?)\]\s*as const\)", content)
    if not m2:
        mismatches.append("[ACCENT_COLORS] Could not parse ACCENT_COLORS Set in videoSceneAnimations.ts")
    else:
        ts_a = set(re.findall(r"'([^']+)'", m2.group(1)))
        if ts_a != ACCENT_COLORS:
            only_py = sorted(ACCENT_COLORS - ts_a)
            only_ts = sorted(ts_a - ACCENT_COLORS)
            if only_py:
                mismatches.append(f"[ACCENT_COLORS] In Python but not TS: {only_py}")
            if only_ts:
                mismatches.append(f"[ACCENT_COLORS] In TS but not Python: {only_ts}")

    return mismatches


def check_video_script_scene_types_list(video_script_path: Path) -> list[str]:
    """VIDEO_SCENE_TYPES in videoScript.ts must match SCENE_TYPES (order-independent)."""
    import re

    if not video_script_path.exists():
        return [f"[videoScript.ts] File not found: {video_script_path}"]

    content = video_script_path.read_text()
    m = re.search(
        r"export const VIDEO_SCENE_TYPES = \[([\s\S]*?)\]\s*as const",
        content,
    )
    if not m:
        return ["[VIDEO_SCENE_TYPES] Could not parse VIDEO_SCENE_TYPES in videoScript.ts"]

    inner = m.group(1)
    ts_list = re.findall(r"'([^']+)'", inner)
    ts_set = set(ts_list)
    py_set = set(SCENE_TYPES)
    mismatches: list[str] = []
    if ts_set != py_set:
        only_py = sorted(py_set - ts_set)
        only_ts = sorted(ts_set - py_set)
        if only_py:
            mismatches.append(
                f"[VIDEO_SCENE_TYPES] In Python SCENE_TYPES but not videoScript.ts: {only_py}"
            )
        if only_ts:
            mismatches.append(
                f"[VIDEO_SCENE_TYPES] In videoScript.ts but not Python SCENE_TYPES: {only_ts}"
            )
    if len(ts_list) != len(ts_set):
        mismatches.append(
            f"[VIDEO_SCENE_TYPES] Duplicate entries in array: {ts_list!r}"
        )
    return mismatches


def check_sync(ts_path: Path, video_script_path: Path | None = None) -> list[str]:
    """
    Full validation for blog-to-video animation consistency.
    Returns a list of human-readable failures (empty = OK).
    """
    vs_path = video_script_path
    if vs_path is None:
        vs_path = ts_path.parent / "videoScript.ts"

    out: list[str] = []
    out.extend(check_animation_table_ts_matches_python(ts_path))
    out.extend(check_ts_scene_types_set_matches_python(ts_path))
    out.extend(check_ts_transitions_accents_match_python(ts_path))
    out.extend(check_python_scene_types_align_with_animation_keys())
    out.extend(check_parse_video_script_defaults())
    out.extend(check_video_script_scene_types_list(vs_path))
    return out


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description="Sync ANIMATION_BY_TYPE → TypeScript; --check validates full animation contract"
    )
    parser.add_argument(
        "--out",
        default="../ui/app/src/types/videoSceneAnimations.ts",
        help="Path to output videoSceneAnimations.ts (relative to this script)",
    )
    parser.add_argument(
        "--video-script",
        default="../ui/app/src/types/videoScript.ts",
        help="Path to videoScript.ts for VIDEO_SCENE_TYPES + parse default checks (relative to script)",
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="Validate Python ↔ videoSceneAnimations.ts ↔ videoScript.ts (exits 1 on any failure)",
    )
    args = parser.parse_args()

    out_path = (SERVICE_DIR / args.out).resolve()
    video_script_path = (SERVICE_DIR / args.video_script).resolve()

    if args.check:
        mismatches = check_sync(out_path, video_script_path)
        if mismatches:
            print("❌ Animation contract check failed:")
            for m in mismatches:
                print(f"   {m}")
            sys.exit(1)
        print("✅ Animation contract OK (claude_service ↔ videoSceneAnimations ↔ videoScript defaults).")
        sys.exit(0)

    ts_content = generate_ts()
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(ts_content)
    print(f"✅ Written: {out_path}")

    mismatches = check_sync(out_path, video_script_path)
    if mismatches:
        print("⚠️  Post-write check found issues:")
        for m in mismatches:
            print(f"   {m}")
    else:
        print("✅ Post-write animation contract check passed.")