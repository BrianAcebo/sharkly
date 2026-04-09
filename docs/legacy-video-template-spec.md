# Legacy scene templates (pre-Remotion, archived)

> **Archived.** This spec described a removed Python template layer (`templates/scenes/*.py`) before the **Remotion** migration. See **`docs/remotion-migration-spec.md`** and **`video-service/video-templates/`** for the current system.

**Version:** 2.0 (historical)  
**Purpose (at time of writing):** Replace basic text-fade templates with motion-graphic quality scenes  
**Rule:** Every template must have background geometry, structured layout, and meaningful animation — never just text floating on a background.

---

## Core Design Principles

### What Every Template Must Have

1. **Background geometry** — at least one decorative element behind the text (line, rectangle, shape, gradient bar). The frame must feel _designed_.
2. **Structured layout** — text is anchored to visible layout elements, not just centered in space.
3. **Layered animation** — background elements animate first, then primary content, then secondary details. Never everything at once.
4. **Color discipline** — use `self.resolve_color()` always. Never hardcode hex. Brand colors come from `COLOR_MAP`.

### Animation Timing Pattern (use across all templates)

```
0.0s  → background geometry appears (fast, 0.3-0.5s)
0.3s  → primary text animates in (0.6-1.0s)
0.8s  → secondary text / details (0.4-0.6s)
1.2s+ → hold for duration
```

### Historical imports (removed third-party package)

```python
# Illustrative — removed third-party animation package.
from legacy_animation import (
    # Mobjects
    Text, VGroup, Rectangle, Line, Circle, Triangle, Dot,
    RoundedRectangle, Arrow, DoubleArrow, BraceBetweenPoints,
    # Positioning
    UP, DOWN, LEFT, RIGHT, ORIGIN,
    UL, UR, DL, DR,          # corners
    # Colors
    WHITE, BLACK, GRAY, BLUE, YELLOW, GREEN, RED,
    # Animation
    FadeIn, FadeOut, Write, DrawBorderThenFill,
    GrowFromCenter, GrowFromEdge, GrowArrow,
    Create, Uncreate,
    AnimationGroup, LaggedStart, LaggedStartMap,
    Transform, ReplacementTransform,
    # Updaters / value tracking
    always_redraw, ValueTracker,
    # Camera
    Scene, MovingCameraScene,
)
```

---

## Base Scene (Updated)

**File:** `templates/scenes/base_scene.py`

```python
"""Base scene — brand colors/fonts injected at runtime."""
from __future__ import annotations
from legacy_animation import *

class BaseScene(Scene):
    BG_COLOR    = "#0a0a0a"
    PRIMARY     = "#f5f3ed"
    ACCENT      = "#2563eb"
    GOLD        = "#d97706"
    MUTED       = "#6b7280"
    FONT_HEADING = "Montserrat"
    FONT_BODY    = "Lato"
    SCENE_DATA: dict = {}

    COLOR_MAP = {
        "primary_text": PRIMARY,
        "accent":       ACCENT,
        "gold":         GOLD,
        "muted":        MUTED,
    }

    def setup(self) -> None:
        self.camera.background_color = self.BG_COLOR

    def resolve_color(self, name: str) -> str:
        return self.COLOR_MAP.get(name, self.PRIMARY)

    # ── Text helpers ──────────────────────────────────────────────
    def make_heading(self, text: str, color_name: str = "accent", size: int = 52) -> Text:
        return Text(text, font=self.FONT_HEADING, font_size=size,
                    color=self.resolve_color(color_name))

    def make_body(self, text: str, color_name: str = "primary_text", size: int = 32) -> Text:
        return Text(text, font=self.FONT_BODY, font_size=size,
                    color=self.resolve_color(color_name))

    def make_label(self, text: str, color_name: str = "muted", size: int = 24) -> Text:
        return Text(text.upper(), font=self.FONT_BODY, font_size=size,
                    color=self.resolve_color(color_name))

    # ── Shape helpers ─────────────────────────────────────────────
    def accent_bar(self, width: float = 1.2, height: float = 0.06,
                   color_name: str = "accent") -> Rectangle:
        """Thin horizontal rule — use under headings."""
        return Rectangle(width=width, height=height,
                         fill_color=self.resolve_color(color_name),
                         fill_opacity=1, stroke_width=0)

    def highlight_rect(self, width: float, height: float,
                       color_name: str = "accent", opacity: float = 0.15) -> Rectangle:
        """Translucent background rectangle behind text."""
        return Rectangle(width=width, height=height,
                         fill_color=self.resolve_color(color_name),
                         fill_opacity=opacity, stroke_width=0)

    def side_rule(self, height: float = 3.0, color_name: str = "accent") -> Line:
        """Vertical accent line — left edge decoration."""
        return Line(UP * height / 2, DOWN * height / 2,
                    color=self.resolve_color(color_name), stroke_width=3)

    def corner_dot(self, color_name: str = "accent") -> Dot:
        return Dot(radius=0.06, color=self.resolve_color(color_name))

    # ── Animation helpers ─────────────────────────────────────────
    def animate_in(self, mob, style: str, duration: float = 0.8) -> None:
        """Dispatcher — maps style string to library animation calls. Always has fallback."""
        dispatch = {
            "fade_up":       lambda: self.play(FadeIn(mob, shift=UP * 0.3),    run_time=duration),
            "fade_in":       lambda: self.play(FadeIn(mob),                     run_time=duration),
            "slide_in":      lambda: self.play(FadeIn(mob, shift=RIGHT * 0.5), run_time=duration),
            "slide_up":      lambda: self.play(FadeIn(mob, shift=UP * 0.4),    run_time=duration),
            "zoom_in":       lambda: self.play(GrowFromCenter(mob),             run_time=duration),
            "wipe_right":    lambda: self.play(DrawBorderThenFill(mob),         run_time=duration),
            "typewrite":     lambda: self.play(Write(mob),                      run_time=duration),
            "draw":          lambda: self.play(Create(mob),                     run_time=duration),
            "dramatic_pause": lambda: (self.wait(0.5), self.play(FadeIn(mob),  run_time=duration)),
        }
        dispatch.get(style, lambda: self.play(FadeIn(mob), run_time=duration))()

    def lagged_animate(self, group: VGroup, style: str,
                       lag: float = 0.15, duration: float = 0.5) -> None:
        """Animate a VGroup with staggered lag — for bullet cascades etc."""
        self.play(LaggedStart(
            *[FadeIn(m, shift=UP * 0.2) for m in group],
            lag_ratio=lag, run_time=duration * len(group)
        ))

    def hold_for_duration(self) -> None:
        dur = float(self.SCENE_DATA.get("duration_seconds", 4))
        self.wait(min(max(0.5, dur), 30.0))
```

---

## Template 1: `cold_open`

**Purpose:** Bold hook. First thing the viewer sees. Must arrest attention.  
**Design inspiration:** The "CONVEX OPTIMIZATION" card — large text, background highlight bar, two-tier typography.

**Visual design:**

- Full-bleed dark background
- LARGE top-line word(s) on a solid highlight rectangle (like a headline stamp)
- Bottom-line subtext in a contrasting color below
- Optional: thin accent line between the two

**Layout:**

```
┌─────────────────────────────────┐
│                                 │
│   ████████████████████████████  │  ← highlight_rect (accent, opacity 1.0)
│   █  HOOK STATEMENT HERE      █  │  ← heading, white text ON the rect
│   ████████████████████████████  │
│                                 │
│   Secondary context line        │  ← body text, muted color
│   ─────────────────────         │  ← accent_bar, thin
│                                 │
└─────────────────────────────────┘
```

**Animation sequence:**

1. `highlight_rect` slides in from LEFT (0.4s)
2. Heading text writes/fades in ON the rect (0.6s)
3. Accent bar draws from left to right using `Create` (0.3s)
4. Subtext fades up (0.4s)

**Content fields from Claude:**

```json
{
	"heading": "ALWAYS BE SELLING",
	"subheading": "Is killing your SEO rankings",
	"accent_color": "accent"
}
```

**Implementation notes:**

- Heading font size: 64-72 (big, bold, fills the rect)
- Rect width: 13 (nearly full screen), height: 1.4
- Text color on rect: always `PRIMARY` (white/light), regardless of `accent_color`
- `accent_color` drives the rect fill and the accent bar color
- Animation style options: `"stamp"` (rect slams in), `"slide_in"` (rect slides from left), `"fade_up"`

---

## Template 2: `title_card`

**Purpose:** Video title / chapter opener. More elegant than `cold_open`.  
**Visual design:**

- Heading centered, large
- Thin accent bar ABOVE the heading (like a top rule)
- Subheading below in muted
- Two small decorative corner dots (top-left, bottom-right)

**Layout:**

```
┌─────────────────────────────────┐
│  •                              │  ← corner_dot (top-left)
│                                 │
│  ─────────────────              │  ← accent_bar (short, left-aligned)
│  Main Video Title               │  ← heading
│  Subtitle or context here       │  ← body, muted
│                                 │
│                              •  │  ← corner_dot (bottom-right)
└─────────────────────────────────┘
```

**Animation sequence:**

1. Corner dots appear simultaneously (FadeIn, 0.3s)
2. Accent bar draws left→right (Create, 0.4s)
3. Heading fades up (0.7s)
4. Subheading fades in (0.5s)

**Content fields:**

```json
{ "heading": "string", "subheading": "string (optional)" }
```

**Animation style options:** `"fade_up"`, `"typewrite"`, `"slide_in"`

---

## Template 3: `section_header`

**Purpose:** Cinematic break between major sections.  
**Visual design:**

- Full-width horizontal line across screen
- Section number / label (e.g. "PART 2" or "THE MECHANISM") small, above the line
- Heading below the line, large
- Line animates as a "wipe" reveal

**Layout:**

```
┌─────────────────────────────────┐
│                                 │
│  PART 2                         │  ← label, muted, small caps
│  ─────────────────────────────  │  ← full-width Line, accent color
│                                 │
│  How Rankings Actually Work     │  ← heading
│                                 │
└─────────────────────────────────┘
```

**Animation sequence:**

1. Label fades in (0.3s)
2. Line draws left→right using `Create` (0.5s) — this is the cinematic moment
3. Heading slides up from below the line (0.6s)

**Content fields:**

```json
{ "heading": "string", "label": "string (optional, e.g. 'Part 2')" }
```

**Animation style options:** `"wipe_right"`, `"fade_up"`, `"zoom_in"`

---

## Template 4: `bullet_points`

**Purpose:** Key points, lists, takeaways.  
**Visual design:**

- Heading at top with accent underline bar
- Each bullet on its own row with a colored square/dot marker (NOT a unicode "•")
- Emphasized bullets get accent-colored marker AND text
- Subtle left-rule (vertical line) anchoring the bullet column

**Layout:**

```
┌─────────────────────────────────┐
│  Heading Text                   │
│  ────────────                   │  ← accent_bar under heading
│                                 │
│  │  ■ First bullet point        │  ← side_rule | colored square | text
│  │  ■ Second bullet point       │
│  │  ■ Third bullet (EMPHASIS)   │  ← accent color on marker + text
│  │  ■ Fourth bullet point       │
└─────────────────────────────────┘
```

**Animation sequence:**

- Heading + underline bar animate first (0.5s)
- Left side_rule draws top→bottom (0.4s)
- Bullets cascade in via `LaggedStart` with `FadeIn(shift=UP*0.2)` — lag_ratio=0.2

**Content fields:**

```json
{
	"heading": "string",
	"bullets": ["string", "string", "string"],
	"emphasis_indices": [0, 2]
}
```

**Animation style options:**

- `"cascade"` → LaggedStart, one by one with stagger (DEFAULT)
- `"all_at_once"` → AnimationGroup, all bullets simultaneously
- `"typewrite"` → Write() on each bullet sequentially

**Implementation notes:**

- Bullet marker: use `Square(side_length=0.12)` filled with color, not unicode bullet
- Emphasized bullets: marker and text both use `accent_color`
- Normal bullets: marker uses `accent` at 0.4 opacity, text uses `primary_text`

---

## Template 5: `stat_callout`

**Purpose:** Single powerful number or fact — makes data feel dramatic.  
**Visual design:**

- Giant number/stat centered (font size 96-120)
- Label above in small caps, muted
- Context line below in body text
- Background: large translucent circle or rectangle behind the number

**Layout:**

```
┌─────────────────────────────────┐
│                                 │
│         MANUSCRIPT COUNT        │  ← label, small, muted
│                                 │
│      ○○○○○○○○○○○○○○○○○○         │  ← highlight_rect (translucent)
│           5,800                 │  ← stat, giant, accent color
│      ○○○○○○○○○○○○○○○○○○         │
│                                 │
│    Greek NT manuscripts found   │  ← context, body text
│                                 │
└─────────────────────────────────┘
```

**Animation sequence:**

1. Background circle/rect grows from center (0.4s)
2. Label fades in (0.3s)
3. Stat number grows from center (GrowFromCenter, 0.7s) — the dramatic moment
4. Context line fades up (0.4s)

**Content fields:**

```json
{
	"stat": "5,800",
	"label": "MANUSCRIPT COUNT",
	"context": "Greek New Testament manuscripts — more than any ancient text"
}
```

**Animation style options:** `"zoom_in"`, `"fade_up"`, `"typewrite"`

---

## Template 6: `text_reveal`

**Purpose:** Key explanatory paragraph — a moment to read and absorb.  
**Visual design:**

- Body text in a clearly readable block, centered
- Left-edge vertical rule (side_rule) in accent color
- Optional pull-quote styling: slightly larger font, italic-weight
- Text must wrap — no single line stretches full width

**Layout:**

```
┌─────────────────────────────────┐
│                                 │
│  ▌ Google records every click   │
│  ▌ after your result appears.   │
│  ▌ Visitors who leave instantly │
│  ▌ signal failure. That signal  │
│  ▌ compounds for 13 months.     │
│                                 │
└─────────────────────────────────┘
```

**Animation sequence:**

1. Side rule draws top→bottom (Create, 0.4s)
2. Text block animates per style

**Content fields:**

```json
{ "body": "string (paragraph text)" }
```

**Implementation notes:**

- Max width: 10.5 (leave breathing room)
- Font size: 34 for short text (<100 chars), 28 for medium, 24 for long
- Always `scale_to_fit_width(10.5)` as a safety net

**Animation style options:** `"fade_in"`, `"slide_up"`, `"typewrite"`

---

## Template 7: `quote_card`

**Purpose:** Memorable quote, scripture, or key principle.  
**Visual design:**

- Large decorative quotation mark (Text object: `"❝"`, very large, low opacity) behind the quote
- Quote text centered, elegant
- Attribution below with a short accent line above it
- The whole composition feels like a designed card

**Layout:**

```
┌─────────────────────────────────┐
│                                 │
│  ❝                              │  ← giant quote mark, 10% opacity, gold
│                                 │
│   "The truth does not change    │
│    according to our ability     │
│    to stomach it."              │  ← quote text, heading font, gold
│                                 │
│         ────────                │  ← short accent_bar
│         — Flannery O'Connor     │  ← attribution, muted, small
│                                 │
└─────────────────────────────────┘
```

**Animation sequence:**

1. Giant quote mark fades in at low opacity (0.4s)
2. `dramatic_pause`: wait 0.5s before quote text if style is `"dramatic_pause"`
3. Quote text fades in or writes in (0.8s)
4. Accent bar draws (0.3s)
5. Attribution fades in (0.4s)

**Content fields:**

```json
{
	"quote": "string",
	"attribution": "string (optional)"
}
```

**Animation style options:** `"fade_in"`, `"dramatic_pause"`, `"typewrite"`

---

## Template 8: `comparison_table`

**Purpose:** Side-by-side comparison — wrong vs right, before vs after, A vs B.  
**Visual design:**

- Two columns separated by a vertical divider line
- Column headers with background rects (LEFT = negative/red, RIGHT = positive/accent)
- Rows build in one at a time
- Checkmark (✓) or X markers on each row

**Layout:**

```
┌──────────────┬──────────────────┐
│  ✗ OLD WAY   │  ✓ RIGHT WAY     │  ← header rects, contrasting colors
├──────────────┼──────────────────┤
│  Always sell │  Match intent    │  ← row 1
│  Push CTAs   │  Serve first     │  ← row 2
│  Ignore UX   │  Earn the click  │  ← row 3
└──────────────┴──────────────────┘
```

**Animation sequence:**

1. Table frame (outer rect + divider line) draws in (0.5s)
2. Both column headers slide in from their respective sides (0.4s)
3. Rows cascade in via LaggedStart, LEFT then RIGHT alternating (lag_ratio=0.3)

**Content fields:**

```json
{
	"left_header": "❌ Old Way",
	"right_header": "✓ Right Way",
	"rows": [
		{ "left": "Always be selling", "right": "Match search intent" },
		{ "left": "Push CTAs everywhere", "right": "Serve the reader first" }
	]
}
```

**Animation style options:** `"cascade"`, `"all_at_once"`

**Implementation notes:**

- Table width: 12, each column: 5.8, divider at x=0
- Header rect fill: LEFT uses `#c0392b` at opacity 0.8, RIGHT uses `accent` at opacity 0.9
- Row text: font size 26, wraps within column width

---

## Template 9: `closing_card`

**Purpose:** End card. Leave the viewer with a clear next step.  
**Visual design:**

- Centered composition
- Brand accent bar at TOP of frame (full width, thin)
- Heading large and centered
- CTA in a bordered rounded rectangle (feels like a button)
- URL small below in muted

**Layout:**

```
┌─────────────────────────────────┐
│ ██████████████████████████████  │  ← full-width accent bar (top)
│                                 │
│                                 │
│      Thanks for watching        │  ← heading
│                                 │
│    ┌─────────────────────┐      │
│    │  Try Sharkly Free   │      │  ← CTA in RoundedRectangle border
│    └─────────────────────┘      │
│                                 │
│      sharkly.co                 │  ← url, muted
│                                 │
└─────────────────────────────────┘
```

**Animation sequence:**

1. Top accent bar draws left→right (Create, 0.4s)
2. Heading fades up (0.6s)
3. CTA rounded rect draws border first, then text fades in (0.5s)
4. URL fades in (0.4s)

**Content fields:**

```json
{
	"heading": "string",
	"cta": "string (optional)",
	"url": "string (optional)"
}
```

**Animation style options:** `"fade_up"`, `"slide_in"`

---

## Template 10: `myth_vs_reality` _(SEO/Sales)_

**Purpose:** Bust a misconception. High-impact two-act reveal.  
**Visual design:**

- Act 1: MYTH statement in a red-tinted frame with ✗ marker — holds for 1.5s
- Act 2: Frame transforms/replaces to green/accent REALITY with ✓ marker
- Transition: MYTH fades out, REALITY stamps in

**Layout:**

```
ACT 1:                          ACT 2:
┌────────────────────┐          ┌────────────────────┐
│ ✗  MYTH            │   →→→    │ ✓  REALITY         │
│                    │          │                    │
│ "More CTAs =       │          │ "Serve first.      │
│  more sales"       │          │  Sell second."     │
└────────────────────┘          └────────────────────┘
```

**Animation sequence:**

1. Red rect + ✗ icon + MYTH label draws in (0.5s)
2. Myth statement types in (0.6s)
3. Hold 1.5s
4. FadeOut everything (0.4s)
5. Accent rect + ✓ icon + REALITY label stamps in (0.5s)
6. Reality statement fades up (0.6s)

**Content fields:**

```json
{
	"myth": "string",
	"reality": "string"
}
```

---

## Template 11: `checklist` _(SEO/Sales)_

**Purpose:** Step-by-step process or checklist — feels actionable.  
**Visual design:**

- Title at top
- Each item has a checkbox that animates to "checked" as it appears
- Checkbox: `Square` outline → fill with checkmark `Text("✓")`
- Items build one by one always (no all_at_once option)

**Layout:**

```
┌─────────────────────────────────┐
│  SEO Migration Checklist        │
│  ─────────────                  │
│                                 │
│  ☐→☑  Audit existing URLs       │
│  ☐→☑  Map redirects             │
│  ☐→☑  Update internal links     │
│  ☐→☑  Submit new sitemap        │
└─────────────────────────────────┘
```

**Animation sequence per item:**

1. Square outline appears (Create, 0.2s)
2. Item text slides in from right (0.3s)
3. Square fills + checkmark appears (Transform, 0.2s)
4. Brief pause (0.15s) before next item

**Content fields:**

```json
{
	"heading": "string",
	"items": ["string", "string", "string"]
}
```

---

## Template 12: `mechanism_diagram` _(SEO/Sales)_

**Purpose:** Show a cause → effect chain or simple flow.  
**Visual design:**

- 2-4 nodes connected by arrows
- Each node is a RoundedRectangle with label inside
- Arrows draw between them sequentially
- Can be horizontal (2-3 nodes) or vertical (3-4 nodes)

**Layout (horizontal, 3 nodes):**

```
┌──────────┐        ┌──────────┐        ┌──────────┐
│  Visitor │ ──→──  │  Bounces │ ──→──  │ Ranking  │
│  arrives │        │ quickly  │        │  drops   │
└──────────┘        └──────────┘        └──────────┘
```

**Animation sequence:**

1. Node 1 grows from center (0.4s)
2. Arrow 1 draws left→right (GrowArrow, 0.4s)
3. Node 2 grows from center (0.4s)
4. Arrow 2 draws (0.4s)
5. Node 3 grows — if it's the "bad" outcome, use red; "good" outcome, use accent

**Content fields:**

```json
{
  "nodes": [
    { "label": "Visitor arrives", "color": "primary_text" },
    { "label": "Bounces quickly", "color": "muted" },
    { "label": "Ranking drops", "color": "gold" }
  ],
  "direction": "horizontal" | "vertical"
}
```

---

## Template 13: `scripture_quote` _(Catholic/Apologetics)_

**Purpose:** Scripture verse — most sacred scene type. Must feel reverent.  
**Visual design:**

- Deep, ornate feel — more decorated than `quote_card`
- Top and bottom horizontal rules (double-line style)
- Large verse text in serif heading font
- Book/chapter/verse reference in small gold below
- Optional: subtle cross or decorative mark centered behind text at very low opacity

**Layout:**

```
┌─────────────────────────────────┐
│  ═══════════════════════════    │  ← double top rule (two Lines, 2px apart)
│                                 │
│   "For God so loved the world   │
│    that He gave His only Son,   │
│    that whoever believes in     │
│    Him shall not perish..."     │  ← verse, heading font, gold
│                                 │
│            — John 3:16          │  ← reference, small, muted
│  ═══════════════════════════    │  ← double bottom rule
└─────────────────────────────────┘
```

**Animation sequence:**

1. Top double-rule draws left→right (Create, 0.5s)
2. Wait 0.3s (reverent pause)
3. Verse text fades in slowly (1.2s — longer than other templates)
4. Reference fades in (0.4s)
5. Bottom double-rule draws left→right (0.5s)

**Content fields:**

```json
{
	"verse": "string",
	"reference": "John 3:16"
}
```

**Animation style options:** `"fade_in"`, `"dramatic_pause"`, `"typewrite"`

**Implementation notes:**

- Double rule: two parallel `Line` objects, 0.08 apart vertically, both accent/gold color
- Verse font size: 36 if short (<80 chars), 28 if medium, 24 if long
- Always gold accent — this template ignores `accent_color` and uses `GOLD`

---

## Template 14: `evidence_stack` _(Catholic/Apologetics)_

**Purpose:** Building a cumulative case — evidence piles up visually.  
**Visual design:**

- Each evidence point appears as a "card" that slides in and stacks
- Cards are slightly offset (layered stack effect)
- Number badge on each card (1, 2, 3...)
- As cards stack, earlier cards scale down slightly to show depth

**Layout (3 cards stacked):**

```
         ┌─────────────────────┐   ← card 3 (front, full size)
       ┌─────────────────────┐ │   ← card 2 (behind, slightly smaller)
     ┌─────────────────────┐ │ │   ← card 1 (furthest back, smallest)
     │  ③  Third Evidence  │ │─┘
     │  Detailed point...  │─┘
     └─────────────────────┘
```

**Animation sequence:**

1. Card 1 slides in from right, places at slight angle/offset (0.5s)
2. Card 2 slides in, card 1 scales to 0.9 and shifts back (0.5s)
3. Card 3 slides in, card 2 scales to 0.9 and shifts back (0.5s)
4. Final stack holds — all 3 visible, depth implied

**Content fields:**

```json
{
	"heading": "The Evidence",
	"points": [
		{ "number": "①", "title": "Manuscript Evidence", "detail": "5,800+ Greek manuscripts" },
		{ "number": "②", "title": "Archaeological Support", "detail": "Confirms biblical locations" },
		{ "number": "③", "title": "Eyewitness Testimony", "detail": "Written within living memory" }
	]
}
```

**Implementation notes:**

- Each card: `RoundedRectangle(width=9, height=1.8, corner_radius=0.15)`
- Number badge: small circle with number text inside, accent/gold color
- Stack offset: each card 0.15 higher and 0.1 to the right of the one behind it

---

## Template 15: `objection_rebuttal` _(Catholic/Apologetics)_

**Purpose:** "Skeptics say X — but here's the truth." Debate-style reveal.  
**Visual design:**

- Two-act like `myth_vs_reality` but more intellectual tone
- Act 1: OBJECTION in a cool gray frame, italic text, quote marks
- Act 2: RESPONSE in accent/gold frame, confident upright text

**Layout:**

```
ACT 1:                             ACT 2:
┌──────────────────────────┐       ┌──────────────────────────┐
│  SKEPTIC SAYS            │  →→   │  THE EVIDENCE            │
│                          │       │                          │
│  "The Bible was written  │       │  The John Rylands        │
│   centuries after the    │       │  Fragment dates to       │
│   fact..."               │       │  125 AD — within         │
│                          │       │  decades of writing.     │
└──────────────────────────┘       └──────────────────────────┘
```

**Animation sequence:**

1. Gray frame draws + "SKEPTIC SAYS" label fades (0.5s)
2. Objection text types in (0.8s) — typewriter style always
3. Hold 1.5s
4. Frame transforms color to accent (Transform, 0.4s)
5. Label changes to "THE EVIDENCE" (0.3s)
6. Response text fades in (0.7s)

**Content fields:**

```json
{
	"objection": "string",
	"response": "string",
	"objection_label": "SKEPTIC SAYS",
	"response_label": "THE EVIDENCE"
}
```

---

## Theme Configs

Three brand configs — inject into `BaseScene` at runtime via `TemplateRenderer`.

### Theme: `seo_app` (Sharkly)

```json
{
	"brand_id": "seo_app",
	"display_name": "Sharkly",
	"elevenlabs_voice_id": "YOUR_VOICE_ID",
	"colors": {
		"background": "#0a0a0f",
		"primary_text": "#f0f0f5",
		"accent": "#2563eb",
		"gold": "#f59e0b",
		"muted": "#6b7280"
	},
	"fonts": {
		"heading": "Montserrat",
		"body": "Lato"
	},
	"video_style_notes": "Sharp, data-driven, confident. Blue accent dominant. Bold contrarian hooks. Feels like a smart tech publication. Tables and mechanisms over abstract text."
}
```

### Theme: `catholic` (The Word Journal)

```json
{
	"brand_id": "catholic",
	"display_name": "The Word Journal",
	"elevenlabs_voice_id": "YOUR_VOICE_ID",
	"colors": {
		"background": "#0d0b08",
		"primary_text": "#f5f0e8",
		"accent": "#7c5c3a",
		"gold": "#c9a84c",
		"muted": "#8b7d6b"
	},
	"fonts": {
		"heading": "Cormorant Garamond",
		"body": "EB Garamond"
	},
	"video_style_notes": "Reverent, weighty, classical. Gold is the dominant accent. Scripture quotes get special treatment. Evidence builds cumulatively. Slower pacing. Feels like illuminated manuscript meets documentary."
}
```

### Theme: `sales`

```json
{
	"brand_id": "sales",
	"display_name": "Sales Training",
	"elevenlabs_voice_id": "YOUR_VOICE_ID",
	"colors": {
		"background": "#0f0f0f",
		"primary_text": "#ffffff",
		"accent": "#22c55e",
		"gold": "#eab308",
		"muted": "#9ca3af"
	},
	"fonts": {
		"heading": "Oswald",
		"body": "Source Sans Pro"
	},
	"video_style_notes": "High energy, punchy, transformation-focused. Green accent. Bold frameworks and before/after reveals. Fast pacing. Feels like a high-production course platform."
}
```

---

## Claude Prompt — Updated Scene Type Enum

Update the system prompt in `claude_service.py` to include all 15 scene types:

```
Scene types available:
UNIVERSAL (all themes):
- cold_open          → bold hook, first scene always
- title_card         → video title, elegant
- section_header     → cinematic chapter break
- bullet_points      → cascading key points
- stat_callout       → single dramatic number/fact
- text_reveal        → explanatory paragraph
- quote_card         → memorable quote
- comparison_table   → two-column side by side
- closing_card       → end card with CTA

SEO + SALES only:
- myth_vs_reality    → misconception → truth reveal
- checklist          → step-by-step with animated checkboxes
- mechanism_diagram  → cause → effect flow (2-4 nodes)

CATHOLIC + APOLOGETICS only:
- scripture_quote    → ornate verse with double rules
- evidence_stack     → cumulative case builder (stacked cards)
- objection_rebuttal → skeptic claim → evidence response
```

---

## Key Rules for Cursor

1. **Every template must import and extend `BaseScene`** — never write a standalone library `Scene` subclass outside the template system.
2. **Every template must call `self.hold_for_duration()` as the last line** of `construct()`.
3. **Never hardcode hex values** in templates — always use `self.resolve_color("name")`.
4. **Every `animate_in()` style must have a working implementation** — no silently skipped styles.
5. **Background geometry animates before text, always** — shapes first, content second.
6. **Use `LaggedStart` for any group of 3+ items** — never animate a loop with sequential `self.play()` calls (it's slow and choppy).
7. **Text wrapping:** Any body text over 40 characters must use `scale_to_fit_width()` or be split into multiple `Text` objects stacked vertically.
8. **Font availability:** Montserrat, Lato, Oswald, Source Sans Pro, EB Garamond, and Cormorant Garamond must be installed on the system. Add a `check_fonts.sh` script to verify before first render.
9. **The `mechanism_diagram` template should use `MovingCameraScene`** if it needs to pan across nodes that don't fit on screen.
10. **Test each template in isolation** with the historical CLI for the removed animation package before wiring into the pipeline.
