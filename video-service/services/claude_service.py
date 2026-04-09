"""
Stage 6 — Claude generates the video script JSON (structured scenes only; no imperative render code).
See docs/blog-to-video-spec.md (Claude Pipeline / B.5 Architecture).
"""

from __future__ import annotations

import json
import os
import re
from pathlib import Path
from typing import Any, Dict, List, Optional, Set

from anthropic import Anthropic, AnthropicError
from pydantic import BaseModel, ConfigDict, Field, ValidationError

_SERVICE_ROOT = Path(__file__).resolve().parent.parent

SCENE_TYPES: Set[str] = {
    # Universal — available to all themes
    "cold_open",
    "title_card",
    "section_header",
    "bullet_points",
    "stat_callout",
    "text_reveal",
    "quote_card",
    "comparison_table",
    "closing_card",
    "vox_documentary",
    "kinetic_chart",
    # SEO + Sales only
    "myth_vs_reality",
    "checklist",
    "mechanism_diagram",
    # Catholic + Apologetics only
    "scripture_quote",
    "evidence_stack",
    "objection_rebuttal",
}

TRANSITIONS: Set[str] = {"fade", "wipe_left", "wipe_right", "slide_up", "cut"}

ACCENT_COLORS: Set[str] = {"primary_text", "accent", "gold", "muted"}

ANIMATION_BY_TYPE: Dict[str, Set[str]] = {
    # Universal
    "cold_open":         {"stamp", "slide_in", "fade_up"},
    "title_card":        {"fade_up", "typewrite", "slide_in"},
    "section_header":    {"fade_up", "wipe_right", "zoom_in"},
    "bullet_points":     {"cascade", "all_at_once", "typewrite"},
    "stat_callout":      {"zoom_in", "fade_up", "typewrite"},
    "text_reveal":       {"fade_in", "fade_up", "slide_up", "typewrite"},
    # fade_up: same visual path as fade_in in quote_card template; Claude often uses neutral fade_up.
    "quote_card":        {"fade_in", "fade_up", "dramatic_pause", "typewrite"},
    # Template maps non-all_at_once to row-by-row lag; fade_in/fade_up match global "neutral body" guidance.
    "comparison_table":  {"cascade", "all_at_once", "fade_in", "fade_up"},
    "closing_card":      {"fade_up", "slide_in"},
    "vox_documentary":   {"fade_in", "slide_up"},
    "kinetic_chart":   {"fade_up", "slide_in"},
    # SEO + Sales
    "myth_vs_reality":   {"stamp", "fade_in", "dramatic_pause"},
    "checklist":         {"cascade"},           # always one-by-one, no other option
    "mechanism_diagram": {"fade_in", "slide_in", "typewrite"},
    # Catholic + Apologetics
    "scripture_quote":   {"fade_in", "fade_up", "dramatic_pause", "typewrite"},
    "evidence_stack":    {"cascade", "slide_in"},
    "objection_rebuttal": {"typewrite", "fade_in"},
}

# TS mirror: `video-service/generate_scene_animations_ts.py` → `ui/.../videoSceneAnimations.ts`
# Invalid LLM values are fixed in `_coerce_llm_script_shape` (animation / transition / accent).


def _coerce_animation_style_to_allowed(scene_type: str, animation_style: str) -> str:
    """
    Map LLM output to ANIMATION_BY_TYPE. Models often reuse a generic style (e.g. typewrite)
    for every scene even when only one value is valid (e.g. checklist → cascade only).
    """
    allowed = ANIMATION_BY_TYPE.get(scene_type)
    if not allowed:
        return (animation_style or "").strip() or sorted(ANIMATION_BY_TYPE["title_card"])[0]
    st = (animation_style or "").strip()
    if st in allowed:
        return st
    return sorted(allowed)[0]


def _coerce_transition_to_allowed(transition_in: str) -> str:
    st = (transition_in or "").strip()
    if st in TRANSITIONS:
        return st
    return "fade"


def _coerce_accent_to_allowed(accent_color: str) -> str:
    st = (accent_color or "").strip()
    if st in ACCENT_COLORS:
        return st
    return "accent"


def load_brand_config(brand_id: str) -> dict[str, Any]:
    path = _SERVICE_ROOT / "config" / "brands" / f"{brand_id}.json"
    if not path.is_file():
        raise ValueError(f"Unknown brand_id: no config at {path}")
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def _build_system_prompt(brand: dict[str, Any]) -> str:
    style        = brand.get("video_style_notes") or ""
    name         = brand.get("display_name") or brand.get("brand_id") or "Unknown Brand"
    brand_id     = brand.get("brand_id") or ""

    # Determine which scene types are available based on brand/theme
    is_catholic  = brand_id in ("catholic", "word_journal", "apologetics")
    is_seo_sales = not is_catholic  # seo_app, sales, default — all get SEO/Sales templates

    universal_scenes = """UNIVERSAL scenes (always available):
- cold_open          → Bold full-screen hook. Use as scene_01 ALWAYS. Large stamped text on a highlight bar.
                       Trigger: every video. content: {heading, subheading}
- title_card         → Elegant title with corner accents and accent bar. Use after cold_open.
                       content: {heading, subheading (optional)}
- section_header     → Cinematic chapter break. Full-width line wipes across screen, heading slides up.
                       Trigger: every major section shift in the article.
                       content: {heading, label (optional, e.g. "Part 2")}
- bullet_points      → Cascading key points with colored markers and left rule.
                       Trigger: any list of 3-6 items, takeaways, steps, features.
                       content: {heading, bullets: [str, ...]}  optional: emphasis_indices: [int, ...]
- stat_callout       → Giant single number/fact. Dramatic, full-screen.
                       Trigger: any specific statistic, percentage, count, year, or dollar figure worth isolating.
                       content: {stat, label, context}
- text_reveal        → Single explanatory paragraph with a left accent rule.
                       Trigger: a key insight or explanation that needs to breathe — not a list, not a quote.
                       content: {body}
- quote_card         → Memorable quote with decorative large quote mark behind it.
                       Trigger: any quotable principle, named quote, or powerful one-liner.
                       content: {quote, attribution (optional)}
- comparison_table   → Two-column side-by-side. Rows build one at a time.
                       Trigger: wrong vs right, before vs after, old way vs new way, A vs B.
                       content: {left_header, right_header, rows: [{left, right}, ...]}
- vox_documentary    → Newspaper clipping card with animated yellow highlighter under the line.
                       Trigger: pull quote, punchy one-liner, memorable sound bite (not a long block quote).
                       content: {quote, attribution (optional), highlight_words (optional array of strings)}
- kinetic_chart      → Self-drawing vertical bar chart — numbers compared side by side.
                       Trigger: before/after metrics, bounce rates, rankings, conversion, A vs B numbers.
                       content: {heading, chart_type: "bar" or "comparison_bar",
                                 data: [{label, value, color (optional: primary_text|accent|gold|muted)}],
                                 unit (optional, e.g. "%"), context (optional caption below chart)}
- closing_card       → End card. CTA in a bordered rect. Always scene_last.
                       content: {heading, cta (optional), url (optional)}"""

    seo_sales_scenes = """
SEO + SALES scenes (use for seo_app, sales, and general content):
- myth_vs_reality    → Two-act reveal. Red MYTH frame → accent REALITY frame. High impact.
                       Trigger: article busts a misconception or counterintuitive claim.
                       content: {myth, reality}
- checklist          → Animated checkbox items that tick in one by one.
                       Trigger: step-by-step process, migration checklist, action plan.
                       content: {heading, items: [str, ...]}
- mechanism_diagram  → 2-4 nodes connected by arrows. Shows cause → effect chain.
                       Trigger: explaining HOW something works mechanically (e.g. Navboost → ranking drop).
                       content: {nodes: [{label, color}, ...], direction: "horizontal"|"vertical"}"""

    catholic_scenes = """
CATHOLIC + APOLOGETICS scenes (use for catholic, word_journal, apologetics brands):
- scripture_quote    → Ornate verse with double horizontal rules above and below. Always gold accent.
                       Trigger: any Bible verse, scripture reference, or sacred text.
                       content: {verse, reference (e.g. "John 3:16")}
- evidence_stack     → Cards that slide in and stack with depth effect. Builds a cumulative case.
                       Trigger: presenting multiple pieces of evidence for a claim (3-4 points).
                       content: {heading, points: [{number, title, detail}, ...]}
- objection_rebuttal → Gray OBJECTION frame types in → transforms to accent RESPONSE frame.
                       Trigger: "Critics say X..." or "Skeptics claim..." followed by a rebuttal.
                       content: {objection, response, objection_label, response_label}"""

    theme_scenes = catholic_scenes if is_catholic else seo_sales_scenes

    return f"""You are a video director for {name}.

Brand style: {style}

You receive article content and convert it into a structured video script with scenes.
Think like a documentary director — your job is to make information visually compelling,
not just readable. Every scene should feel like a deliberate directorial choice.

DIRECTORIAL RULES:
1. scene_01 MUST always be "cold_open" — the bold hook that arrests attention.
2. The last scene MUST always be "closing_card".
3. Use "section_header" at every major topic shift — it gives the video rhythm.
4. Prefer "stat_callout" over "text_reveal" whenever there's a specific number — numbers are visual.
   Use "kinetic_chart" when comparing 2+ numeric values (before/after, benchmarks). Use "vox_documentary" for a standout pull-quote moment.
5. Use "myth_vs_reality" or "objection_rebuttal" aggressively — conflict drives engagement.
6. Vary your scene types — never use the same type more than twice in a row.
7. "bullet_points" is for LISTS only — not for prose. Max 6 bullets per scene.
8. The narration_script is the FULL spoken voiceover read start to finish. Write it naturally, as speech.
9. Each narration_segment is the portion of the narration spoken DURING that specific scene.
   NEVER leave narration_segment as "" — every scene needs at least one character (use a short beat or "—" if the moment is mostly visual).
10. Duration should match narration length — roughly 150 words per minute speaking pace.

{universal_scenes}
{theme_scenes}

ANIMATION STYLE GUIDANCE — each scene "type" only accepts specific animation_style values (enforced by the server).
- "checklist" → MUST use "cascade" only (checkbox template; no typewrite/fade_up/etc.).
- "cascade" / "dramatic_pause" → slow, weighty moments (revelations, scripture, key truths)
- "stamp" / "zoom_in" → bold, punchy moments (hooks, myth busts, big claims)
- "typewrite" → technical or precise content (mechanisms, evidence — NOT for checklist)
- "wipe_right" / "slide_in" → transitional moments (section headers, flowing content)
- "fade_up" / "fade_in" → neutral, clean reveals (most body content)
- "comparison_table" → prefer "cascade" (rows one-by-one) or "all_at_once" (whole table); "fade_in"/"fade_up" are also valid and render like cascade for rows.

ACCENT COLOR GUIDANCE:
- "accent"       → default for most headings and key content
- "gold"         → quotes, scripture, special callouts, reverent moments
- "muted"        → labels, attributions, secondary info
- "primary_text" → body text that should be neutral white/light

TRANSITIONS — match the pacing:
- "cut"       → high energy, punchy (after cold_open, after myth_vs_reality)
- "wipe_right" → confident forward momentum
- "slide_up"  → building upward energy
- "fade"      → neutral, standard (default for most)
- "wipe_left" → contrast or reversal moments

OUTPUT FORMAT:
You MUST return ONLY valid JSON. No explanation, no markdown, no code blocks.
Use EXACTLY these property names — the pipeline is strict and will reject any aliases.

Root keys: "title", "estimated_duration_seconds", "narration_script", "scenes"
Each scene MUST have: "scene_id" (e.g. "scene_01"), "type", "duration_seconds",
"narration_segment", "animation_style", "transition_in", "accent_color", "content"
Optional per scene: "emphasis_indices" (array of ints, bullet_points only)

Minimal shape example:
{{"title":"...","estimated_duration_seconds":180,"narration_script":"...","scenes":[{{"scene_id":"scene_01","type":"cold_open","duration_seconds":4,"narration_segment":"...","animation_style":"stamp","transition_in":"cut","accent_color":"accent","content":{{"heading":"ALWAYS BE SELLING","subheading":"Is killing your SEO rankings"}}}}]}}
"""


def _build_user_prompt(article: str, max_duration_seconds: int) -> str:
    # Estimate word count to give Claude a scene count target
    word_count = len(article.split())
    # At 150 wpm, estimate minutes, then rough scene count (avg 8s per scene)
    estimated_minutes = max_duration_seconds / 60
    target_scenes = max(6, min(20, int(estimated_minutes * 60 / 8)))

    return f"""Convert this article into a video script.

BEFORE you write the JSON, think through:
1. What is the single most surprising or counterintuitive claim in this article? → That becomes cold_open.
2. Are there any specific statistics, numbers, or dates? → Each gets a stat_callout.
3. Does the article bust a myth or answer a skeptic? → Use myth_vs_reality or objection_rebuttal.
4. What are the major sections? → Each gets a section_header.
5. Are there any quotes, scripture, or memorable one-liners? → quote_card or scripture_quote.
6. What is the ONE thing the viewer should do or remember? → closing_card CTA.

Article word count: ~{word_count} words
Max video duration: {max_duration_seconds} seconds ({estimated_minutes:.0f} minutes)
Target scene count: {target_scenes} scenes (adjust based on content richness)

ARTICLE:
{article}
"""


def _strip_markdown_json_fence(raw: str) -> str:
    text = raw.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.IGNORECASE)
        text = re.sub(r"\s*```\s*$", "", text)
    return text.strip()


def _parse_json_object(raw: str) -> dict[str, Any]:
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        pass
    stripped = _strip_markdown_json_fence(raw)
    try:
        return json.loads(stripped)
    except json.JSONDecodeError as e:
        raise ValueError(f"Claude did not return valid JSON: {e}") from e


def _coerce_llm_script_shape(data: dict[str, Any]) -> dict[str, Any]:
    """
    Map common alternate keys from LLM output (e.g. video_title, scene_number) to our schema
    before Pydantic validation. Keeps valid user-shaped JSON mostly intact.
    """
    d: dict[str, Any] = dict(data)

    if "title" not in d:
        for alt in ("video_title", "videoTitle", "headline"):
            v = d.get(alt)
            if v is not None and str(v).strip():
                d["title"] = str(v).strip()
                break

    if "estimated_duration_seconds" not in d:
        for alt in (
            "total_duration_seconds",
            "duration_seconds_total",
            "estimated_total_duration_seconds",
        ):
            v = d.get(alt)
            if v is not None:
                try:
                    d["estimated_duration_seconds"] = int(v)
                    break
                except (TypeError, ValueError):
                    continue

    if "narration_script" not in d:
        for alt in (
            "narration",
            "full_narration",
            "voiceover_script",
            "voiceover",
            "full_voiceover",
        ):
            v = d.get(alt)
            if v is not None and str(v).strip():
                d["narration_script"] = str(v).strip()
                break

    scenes = d.get("scenes")
    if not isinstance(scenes, list):
        return d

    fixed_scenes: List[dict[str, Any]] = []
    for i, raw_scene in enumerate(scenes):
        if not isinstance(raw_scene, dict):
            fixed_scenes.append(raw_scene)  # type: ignore[arg-type]
            continue
        s = dict(raw_scene)

        if "duration_seconds" not in s and s.get("duration") is not None:
            try:
                s["duration_seconds"] = int(s["duration"])
            except (TypeError, ValueError):
                pass

        if "scene_id" not in s or not str(s.get("scene_id", "")).strip():
            sid = s.get("scene_number")
            if sid is not None:
                try:
                    n = int(sid)
                    s["scene_id"] = f"scene_{n:02d}"
                except (TypeError, ValueError):
                    s["scene_id"] = f"scene_{i + 1:02d}"
            else:
                s["scene_id"] = f"scene_{i + 1:02d}"

        if "narration_segment" not in s or not str(s.get("narration_segment", "")).strip():
            for alt in ("narration_segment", "narration", "voiceover", "spoken_text", "dialogue", "text"):
                v = s.get(alt)
                if v is not None and str(v).strip():
                    s["narration_segment"] = str(v).strip()
                    break

        # Claude sometimes leaves narration_segment blank for mostly-visual beats; schema requires ≥1 char.
        if not str(s.get("narration_segment", "")).strip():
            s["narration_segment"] = "—"

        if "transition_in" not in s or not str(s.get("transition_in", "")).strip():
            tr = s.get("transition") or s.get("transition_type")
            if tr is not None and str(tr).strip():
                s["transition_in"] = str(tr).strip()
            else:
                s["transition_in"] = "fade"
        s["transition_in"] = _coerce_transition_to_allowed(str(s.get("transition_in") or ""))
        s["accent_color"] = _coerce_accent_to_allowed(str(s.get("accent_color") or ""))

        co = s.get("content")
        if isinstance(co, str) and str(co).strip():
            s["content"] = {"body": str(co).strip()}
        elif not isinstance(s.get("content"), dict):
            content_keys = (
                "heading",
                "subheading",
                "bullets",
                "quote",
                "attribution",
                "cta",
                "url",
                "body",
                "label",
                "stat",
                "context",
                "left_header",
                "right_header",
                "rows",
                "myth",
                "reality",
                "items",
                "nodes",
                "direction",
                "verse",
                "reference",
                "points",
                "objection",
                "response",
                "objection_label",
                "response_label",
                "highlight_words",
                "data",
                "chart_type",
                "unit",
            )
            nested = {k: s.pop(k) for k in content_keys if k in s}
            s["content"] = nested if nested else {}

        st = str(s.get("type", "")).strip()
        if st in ANIMATION_BY_TYPE:
            s["animation_style"] = _coerce_animation_style_to_allowed(
                st, str(s.get("animation_style") or "")
            )

        fixed_scenes.append(s)

    d["scenes"] = fixed_scenes
    return d


class SceneModel(BaseModel):
    model_config = ConfigDict(extra="allow")

    scene_id: str = Field(min_length=1)
    type: str
    duration_seconds: int = Field(ge=1, le=600)
    narration_segment: str = Field(min_length=1)
    animation_style: str
    transition_in: str
    accent_color: str
    content: dict[str, Any]
    emphasis_indices: Optional[List[int]] = None


class VideoScriptModel(BaseModel):
    model_config = ConfigDict(extra="ignore")

    title: str = Field(min_length=1)
    estimated_duration_seconds: int = Field(ge=1, le=86400)
    narration_script: str = Field(min_length=1)
    scenes: List[SceneModel] = Field(min_length=1)


def _validate_script_semantics(data: dict[str, Any]) -> VideoScriptModel:
    try:
        model = VideoScriptModel.model_validate(data)
    except ValidationError as e:
        errs = e.errors()
        head = errs[:10]
        parts = [
            f"{' -> '.join(str(x) for x in err.get('loc', ()))}: {err.get('msg', '')}"
            for err in head
        ]
        suffix = f" (+{len(errs) - len(head)} more)" if len(errs) > len(head) else ""
        raise ValueError(
            "Script JSON does not match the required shape. "
            + "; ".join(parts)
            + suffix
        ) from e
    except Exception as e:
        raise ValueError(f"Script schema validation failed: {e}") from e

    for scene in model.scenes:
        st = scene.type
        if st not in SCENE_TYPES:
            raise ValueError(f"Invalid scene type: {st!r}")
        allowed_anim = ANIMATION_BY_TYPE.get(st, set())
        if scene.animation_style not in allowed_anim:
            raise ValueError(
                f"animation_style {scene.animation_style!r} not allowed for {st}"
            )
        if scene.transition_in not in TRANSITIONS:
            raise ValueError(f"Invalid transition_in: {scene.transition_in!r}")
        if scene.accent_color not in ACCENT_COLORS:
            raise ValueError(f"Invalid accent_color: {scene.accent_color!r}")
        if st != "bullet_points" and scene.emphasis_indices is not None:
            raise ValueError("emphasis_indices only allowed for bullet_points")

    return model


def parse_and_validate_script_json(content: str) -> dict[str, Any]:
    """
    Parse user-edited script JSON (string) and return the same dict shape as generate_video_script.
    Raises ValueError if JSON or schema is invalid.
    """
    if not content or not str(content).strip():
        raise ValueError("script_json content is empty")
    raw = str(content).strip()
    parsed = _parse_json_object(raw)
    if not isinstance(parsed, dict):
        raise ValueError("Script root must be a JSON object")
    return _validate_script_semantics(_coerce_llm_script_shape(parsed)).model_dump()


def generate_video_script(
    article_text: str,
    brand_id: str,
    options: Optional[dict[str, Any]] = None,
) -> dict[str, Any]:
    """
    Call Claude and return a validated script dict (title, narration_script, scenes, ...).
    Raises ValueError on bad config, API errors, or invalid output.
    """
    opts = options or {}
    max_duration = int(opts.get("max_duration_seconds", 300))
    max_article = int(os.environ.get("CLAUDE_MAX_INPUT_CHARS", "120000"))
    article = article_text if len(article_text) <= max_article else article_text[:max_article]

    api_key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
    if not api_key:
        raise ValueError("ANTHROPIC_API_KEY is not set")

    # Script generation uses Sonnet — creative directorial work needs the stronger model.
    _default_sonnet = "claude-sonnet-4-5-20250929"
    model_id = (
        os.environ.get("CLAUDE_SONNET_MODEL", "").strip()
        or os.environ.get("ANTHROPIC_MODEL", "").strip()
        or _default_sonnet
    )
    # Long scripts (many scenes + narration) need a large budget; 8k often truncates mid-JSON.
    # Sonnet 4.x supports up to ~64k output tokens; override via CLAUDE_MAX_OUTPUT_TOKENS if needed.
    max_tokens = int(os.environ.get("CLAUDE_MAX_OUTPUT_TOKENS", "64000"))
    temperature = float(os.environ.get("CLAUDE_TEMPERATURE", "0.4"))  # slight creativity boost

    brand = load_brand_config(brand_id)
    system = _build_system_prompt(brand)
    user_prompt = _build_user_prompt(article, max_duration)

    client = Anthropic(api_key=api_key)
    try:
        message = client.messages.create(
            model=model_id,
            max_tokens=max_tokens,
            temperature=temperature,
            system=system,
            messages=[
                {
                    "role": "user",
                    "content": [{"type": "text", "text": user_prompt}],
                }
            ],
        )
    except AnthropicError as e:
        raise ValueError(f"Anthropic request failed: {e}") from e

    if getattr(message, "stop_reason", None) == "max_tokens":
        raise ValueError(
            "Video script generation hit the output token limit (response was truncated, often mid-JSON). "
            "Raise CLAUDE_MAX_OUTPUT_TOKENS, or shorten the article / reduce max_duration_seconds."
        )

    parts: List[str] = []
    for block in message.content:
        if getattr(block, "type", None) == "text":
            parts.append(block.text)
    raw = "".join(parts).strip()
    if not raw:
        raise ValueError("Empty response from Claude")

    parsed = _parse_json_object(raw)
    if not isinstance(parsed, dict):
        raise ValueError("Claude JSON root must be an object")

    validated = _validate_script_semantics(_coerce_llm_script_shape(parsed))
    return validated.model_dump()