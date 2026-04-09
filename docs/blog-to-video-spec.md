# Blog-to-Video Microservice — Product Spec

**Version:** 1.0  
**Architecture:** B.5 — Template-driven rendering with Claude-controlled expressive parameters  
**App:** Sharkly (sharkly.co) — AI SEO SaaS  
**Integration:** Standalone Python FastAPI service deployed on Fly.io, called by the existing Express/TypeScript API at `api/`

---

## 1. What This Is

A Python microservice that accepts blog content (URL, raw text, or article from Sharkly's Tiptap editor) and returns a rendered MP4 video. Claude does NOT generate React or Remotion source — instead it returns structured JSON that maps to pre-built scene compositions. This makes rendering deterministic and crash-resistant while still giving Claude creative control over pacing, animation style, emphasis, and scene ordering.

The primary use case inside Sharkly is turning published cluster articles into short-form video content for SEO-adjacent distribution (YouTube, social, embedded on destination pages).

---

## 2. How It Works (Pipeline Overview)

```
Sharkly React App (app.sharkly.co)
    │
    ▼
POST /api/video/create          ← New route in api/src/routes/video.ts
    │   (Express TypeScript API — sharkly-api.fly.dev)
    │
    ▼
FastAPI Microservice             ← sharkly-video.fly.dev
    │
    ├── 1. Content Processor
    │       Input:  URL | raw text | Tiptap JSON | brief
    │       Output: clean string of article content
    │
    ├── 2. Claude — Script + Direction Pass
    │       Input:  article content + Sharkly brand config
    │       Output: structured JSON scene list (NO code generation)
    │               Claude picks scene types, content, and expressive params
    │
    ├── 3. Cartesia
    │       Input:  narration_script from Claude output
    │       Output: narration.mp3
    │
    ├── 4. Remotion (CLI)
    │       Input:  scene list JSON + brand → `video-templates` React compositions
    │       Output: video_no_audio.mp4 (full timeline)
    │
    └── 5. FFmpeg Assembly
            Input:  silent video + narration.mp3
            Output: final_video.mp4
                    → uploaded to Supabase Storage → signed URL returned
```

---

## 3. Repo Location

The `video-service/` folder lives at the root of the Sharkly monorepo, alongside `api/` and `ui/`:

```
sharkly/
├── api/                           # Express TypeScript API (existing)
├── ui/
│   ├── app/                       # React SaaS app (existing)
│   └── marketing/                 # Marketing site (existing)
├── video-service/                 # ← NEW: Python FastAPI video service
│   ├── main.py                    # FastAPI app entry point
│   ├── requirements.txt
│   ├── fly.toml                   # Fly.io deployment config
│   ├── Dockerfile
│   ├── .env
│   │
│   ├── config/
│   │   └── brands/
│   │       └── sharkly.json       # Sharkly brand config (fonts, colors, voice)
│   │
│   ├── routers/
│   │   └── video.py               # API route handlers
│   │
│   ├── services/
│   │   ├── content_processor.py   # Scraper, Tiptap JSON parser, text cleaner
│   │   ├── claude_service.py      # Claude API calls — returns scene JSON
│   │   ├── cartesia_service.py    # TTS narration via Cartesia API
│   │   ├── remotion_renderer.py   # Remotion CLI — scene JSON → video_no_audio.mp4
│   │   ├── assembler.py           # FFmpeg mux / align audio
│   │   └── storage.py             # Upload to Supabase Storage, return signed URL
│   │
│   ├── video-templates/           # Remotion 4 project (React scene components)
│   │
│   ├── workers/
│   │   └── video_worker.py        # RQ async worker
│   │
│   ├── output/
│   │   └── jobs/                  # Per-job temp folders (gitignored)
│   │
│   └── utils/
│       └── file_helpers.py
│
├── supabase/                      # Supabase local dev (existing)
└── Makefile                       # Add make dev-video target
```

---

## 4. Brand Config Schema

Stored in `config/brands/{brand_id}.json`. For Sharkly, this is `config/brands/sharkly.json`.

```json
{
  "brand_id": "sharkly",
  "display_name": "Sharkly",
  "cartesia_voice_id": "your_cartesia_voice_uuid_here",
  "colors": {
    "background": "#0a0a0a",
    "primary_text": "#f5f3ed",
    "accent": "#2563eb",
    "gold": "#d97706",
    "muted": "#6b7280"
  },
  "fonts": {
    "heading": "Montserrat",
    "body": "Lato"
  },
  "video_style_notes": "Clean, authoritative, data-driven. Navy and cream palette. Professional SEO expert tone — direct, clear, never jargon-heavy. The Apple of SEO tools."
}
```

**Color system:** Claude never references hex values. It picks from semantic names (`primary_text`, `accent`, `gold`, `muted`) which the brand config maps to actual hex. This keeps Claude's output brand-agnostic and always valid.

**Font note:** Sharkly's UI uses Montserrat (headings) and Lato (body) — loaded via Google Fonts. Remotion compositions resolve fonts via `@remotion/google-fonts` / theme config to match brand.

### 4.1 Voice selection and cloning (Cartesia)

**Reference implementation details:** HTTP base URL, authentication headers (`X-API-Key`, `Cartesia-Version`), listing voices, `POST /tts/bytes`, cloning (`POST /voices/clone/clip`), and delete voice are documented in **`docs/cartesia-tts-product-spec.md`** (written for another product stack; adapt the **contracts and behaviors** to Sharkly’s Express + Supabase architecture). Sharkly must never expose `CARTESIA_API_KEY` to the browser — all Cartesia calls go through server-side routes.

**What the user can do (product intent):**

1. **Pick a catalog voice** — Browse Cartesia’s public voice library (languages, accents, styles). The UI loads voices from Cartesia via a Sharkly API proxy (`GET /voices` → see cartesia spec §9.2). The user hears a **short preview** (optional but recommended) before committing. The saved value is always a **Cartesia voice UUID** (`id`), not a display name (names can change on Cartesia’s side).

2. **Clone their own voice** — Upload a recorded sample (minimum duration and quality per Cartesia; product copy should set expectations). Sharkly calls Cartesia **`POST /voices/clone/clip`** (multipart: `clip`, `name`, optional `description`, optional `enhance`) — see cartesia spec §9.5. The response returns a new **`id` (UUID)**. That UUID is a first-class voice: it is used in **`POST /tts/bytes`** the same way as a catalog voice (`voice`: `{ "mode": "id", "id": "<uuid>" }`).

3. **Where the choice is stored** — The active voice for blog-to-video for a site is **`sites.cartesia_voice_id`** (TEXT/UUID string). Whether the user picked a library voice or a clone, **TTS always receives one UUID**; the video worker does not branch on “catalog vs clone.”

**Org-scoped cloned voices (data model):**

| Concept | Storage |
| --- | --- |
| Selected voice for this site | `sites.cartesia_voice_id` — nullable; if null, fall back to brand default in `config/brands/sharkly.json` then service fallback UUID |
| Clones created by the org | New table e.g. **`organization_cartesia_voices`**: `id`, `organization_id`, `cartesia_voice_id` (UUID from Cartesia), `display_name`, `created_at`, optional `created_by_user_id`. Rows are listed in the Site Editor voice picker under **“Your voices”** alongside catalog voices. |
| Delete clone | User removes a cloned voice → Sharkly calls **`DELETE https://api.cartesia.ai/voices/{voiceId}`** (cartesia spec §9.6), then deletes the DB row. Do not leave orphaned Cartesia IDs. |

**Site Editor → Video tab (UX):**

- Replace a raw “paste UUID” field with a **voice picker**: search/filter catalog (as feasible), **Preview** button for sample text, section **“Your voices”** for org clones + **“Clone a new voice”** (upload flow).
- Optional **Advanced**: show read-only UUID for support/debug only.

**Workspace:** The Generate Video modal may default to the site’s `cartesia_voice_id` and optionally allow a one-off override (same picker); spec the override in a later iteration if needed.

---

## 5. API Endpoints

The FastAPI microservice exposes these endpoints. The Sharkly Express API (`api/src/routes/video.ts`) proxies or delegates to them.

### POST `/api/video/create`

Submit a new video job. Returns immediately with a job ID.

**Request body:**

```json
{
  "brand_id": "sharkly",
  "input_type": "url" | "text" | "tiptap_json" | "brief",
  "content": "https://... or raw text or Tiptap JSON string or brief description",
  "cluster_id": "optional — links video to a Sharkly cluster",
  "article_id": "optional — links video to a specific article",
  "cartesia_voice_id": "optional — Cartesia UUID; overrides site default for this job only",
  "options": {
    "max_duration_seconds": 300,
    "include_captions": true,
    "quality": "low" | "medium" | "high"
  }
}
```

**Response:**

```json
{
  "job_id": "uuid-here",
  "status": "queued"
}
```

---

### GET `/api/video/job/{job_id}`

Poll for job status.

**Response:**

```json
{
  "job_id": "uuid",
  "status": "queued" | "processing" | "complete" | "failed",
  "progress": 0,
  "current_step": "generating_script" | "generating_audio" | "rendering_scenes" | "assembling" | "uploading",
  "download_url": "https://[supabase-project].supabase.co/storage/v1/object/sign/videos/{job_id}/final.mp4?token=...",
  "error": null
}
```

---

### GET `/api/video/download/{job_id}`

Redirect to the Supabase Storage signed URL for the finished MP4.

### DELETE `/api/video/job/{job_id}`

Clean up job temp files from disk and remove from Supabase Storage.

### GET `/api/health`

Health check for the Express API to ping before submitting jobs.

### Cartesia proxy routes (Sharkly Express — same auth as rest of app)

These power the Site Editor voice picker and clone flow. Implement alongside `video.ts` (e.g. `routes/cartesiaVideoVoices.ts` or nested under `/api/video/voices`). Request/response shapes follow **`docs/cartesia-tts-product-spec.md`** (§8–9): use `X-API-Key` + `Cartesia-Version` headers server-side only.

| Method | Purpose |
| --- | --- |
| `GET /api/video/voices` | Proxy `GET https://api.cartesia.ai/voices` — return deduped list (`id`, `name`, `language`, `gender`, …) for the catalog picker. |
| `GET /api/video/voices/organization` | Return rows from `organization_cartesia_voices` for the current org (cloned voices). |
| `POST /api/video/voice/preview-audio` | Proxy `POST /tts/bytes` with short transcript + chosen `voice_id` — return base64 or signed URL for browser playback (MP3 @ 44.1 kHz; model_id per cartesia spec §9.4 authenticated preview). |
| `POST /api/video/voice/clone` | Multipart upload → proxy `POST /voices/clone/clip` — on success insert `organization_cartesia_voices` with returned `id`. |
| `DELETE /api/video/voice/:cartesiaVoiceId` | Verify org ownership → proxy `DELETE /voices/{id}` → delete DB row. |

Rate-limit and cap preview length to control cost (see cartesia spec §5 NFRs).

---

## 6. Express Route (`api/src/routes/video.ts`)

The Sharkly Express API adds a `/api/video` route that authenticates via Supabase and proxies to the FastAPI service. This keeps auth centralized in the existing Express middleware pattern.

```typescript
// api/src/routes/video.ts
import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireTier } from '../middleware/requireTier.js';
import {
  createVideoJob,
  getVideoJobStatus,
  downloadVideo,
  deleteVideoJob,
} from '../controllers/videoController.js';

const router = express.Router();

router.use(requireAuth);
router.use(requireTier(['builder', 'growth', 'pro', 'scale'])); // gate to paid tiers

router.post('/create', createVideoJob);
router.get('/job/:jobId', getVideoJobStatus);
router.get('/download/:jobId', downloadVideo);
router.delete('/job/:jobId', deleteVideoJob);

export default router;
```

Register it in `api/src/index.ts`:

```typescript
import videoRoutes from './routes/video.js';
// ...
app.use('/api/video', videoRoutes);
```

---

## 7. Claude Pipeline (B.5 Architecture)

Claude runs **one prompt** that produces the full scene list + narration script. No React/Remotion source is generated — ever.

### System Prompt

```
You are a video director for Sharkly — an AI SEO platform for business owners who want to rank faster on Google.

Brand voice: Direct, clear, authoritative. No jargon. Translate SEO complexity into plain language.
Style notes: Clean and professional. Navy and cream palette. Data-driven storytelling.

You receive an SEO article and return a structured video script.
Your job is to decide:
- How to break the content into scenes
- Which scene template fits each section
- What animation style, pacing, and emphasis to apply
- The full narration script (spoken voiceover for the whole video)

You MUST return only valid JSON. No explanation, no markdown, no code blocks.
All animation_style values must come from the allowed enums below.
All accent_color values must be one of: "primary_text", "accent", "gold", "muted"

Scene types available:
- title_card
- section_header
- bullet_points
- text_reveal
- quote_card
- closing_card

Animation styles per type:
- title_card:      ["fade_up", "typewrite", "slide_in"]
- section_header:  ["fade_up", "wipe_right", "zoom_in"]
- bullet_points:   ["cascade", "all_at_once", "typewrite"]
- text_reveal:     ["fade_in", "slide_up", "typewrite"]
- quote_card:      ["fade_in", "dramatic_pause"]
- closing_card:    ["fade_up", "slide_in"]

Transition options (applied between scenes):
- "fade", "wipe_left", "wipe_right", "slide_up", "cut"
```

### User Prompt

```
Convert this SEO article into a video script:

{article_content}

Max duration: {max_duration_seconds} seconds.
```

### Claude Output Schema

```json
{
  "title": "string",
  "estimated_duration_seconds": 180,
  "narration_script": "Full spoken voiceover for the entire video...",
  "scenes": [
    {
      "scene_id": "scene_01",
      "type": "title_card",
      "duration_seconds": 4,
      "narration_segment": "The portion of narration spoken during this scene...",
      "animation_style": "fade_up",
      "transition_in": "fade",
      "accent_color": "accent",
      "content": {
        "heading": "5 Ways to Improve Your SEO",
        "subheading": "A practical guide for 2025"
      }
    },
    {
      "scene_id": "scene_02",
      "type": "bullet_points",
      "duration_seconds": 8,
      "narration_segment": "...",
      "animation_style": "cascade",
      "transition_in": "wipe_right",
      "accent_color": "accent",
      "emphasis_indices": [0, 2],
      "content": {
        "heading": "The Core Strategies",
        "bullets": [
          "Optimize your title tags",
          "Build topical authority",
          "Improve Core Web Vitals"
        ]
      }
    },
    {
      "scene_id": "scene_03",
      "type": "quote_card",
      "duration_seconds": 5,
      "narration_segment": "...",
      "animation_style": "dramatic_pause",
      "transition_in": "fade",
      "accent_color": "gold",
      "content": {
        "quote": "Content is the foundation. Everything else amplifies it.",
        "attribution": "Sharkly SEO Framework"
      }
    },
    {
      "scene_id": "scene_04",
      "type": "closing_card",
      "duration_seconds": 5,
      "narration_segment": "...",
      "animation_style": "fade_up",
      "transition_in": "fade",
      "accent_color": "accent",
      "content": {
        "heading": "Start ranking faster.",
        "cta": "Try Sharkly free",
        "url": "sharkly.co"
      }
    }
  ]
}
```

---

## 8. Scene rendering (Remotion)

Claude’s JSON `scenes` array is passed to **`services/remotion_renderer.py`**, which runs **`npx remotion render`** against **`video-service/video-templates/`** (React compositions, one `VideoComposition` timeline). Output is a single **`video_no_audio.mp4`**. Brand colors/fonts come from `config/brands/*.json` (mapped into Remotion props). Full visual contract: **`docs/remotion-migration-spec.md`**. Historical template notes (pre-Remotion): **`docs/legacy-video-template-spec.md`**.

---

## 9. Scene types — behavior reference

Each scene `type` maps to a Remotion component; behavior below is the product contract (content fields, animation styles). Implementation files live under `video-templates/src/scenes/` (see migration spec).

### `title_card`

**Content fields:** `heading`, `subheading` (optional)  
**Animation styles:** `fade_up`, `typewrite`, `slide_in`  
**Behavior:** Centered layout. Heading first, subheading fades in below. Holds for `duration_seconds`.

### `section_header`

**Content fields:** `heading`, `label` (optional — e.g. "Strategy 2")  
**Animation styles:** `fade_up`, `wipe_right`, `zoom_in`  
**Behavior:** Full-screen section break. Uses accent color prominently.

### `bullet_points`

**Content fields:** `heading`, `bullets` (array of strings)  
**Animation styles:** `cascade` (one by one), `all_at_once`, `typewrite`  
**Extra params:** `emphasis_indices` — array of bullet indices to render in accent color  
**Behavior:** Heading animates first, then bullets per style. Emphasized bullets get accent color.

### `text_reveal`

**Content fields:** `body` (paragraph of text)  
**Animation styles:** `fade_in`, `slide_up`, `typewrite`  
**Behavior:** Single block of body text. Good for key SEO insights or summaries.

### `quote_card`

**Content fields:** `quote`, `attribution` (optional)  
**Animation styles:** `fade_in`, `dramatic_pause`  
**Behavior:** Quote centered with decorative marks. Attribution smaller below. `dramatic_pause` adds a 0.5s hold before text appears.

### `closing_card`

**Content fields:** `heading`, `cta` (optional — call to action text), `url` (optional)  
**Animation styles:** `fade_up`, `slide_in`  
**Behavior:** End card. Sharkly brand colors prominent. CTA text in accent color. URL displayed at bottom.

---

## 10. Cartesia TTS (`services/cartesia_service.py`)

Narration audio is generated via Cartesia's `POST /tts/bytes` endpoint. **Request headers, `model_id` / `output_format` choices, clone and list-voice endpoints, and security rules** are aligned with **`docs/cartesia-tts-product-spec.md`** (adapt file paths from that doc’s Paperboat layout to Sharkly’s `video-service` + Express proxies). For video narration, use **MP3 at 44.1 kHz** (file-based batch render, same idea as authenticated browser preview in that doc §9.4).

**Required headers (all requests):**
- `X-API-Key: <CARTESIA_API_KEY>`
- `Cartesia-Version: 2024-06-10`

**`model_id`:** `sonic-2` (high quality, non-streaming)  
**`output_format`:** MP3 at 44,100 Hz (identical to the authenticated browser preview surface)

```python
import os
import httpx

CARTESIA_BASE = "https://api.cartesia.ai"
CARTESIA_API_KEY = os.getenv("CARTESIA_API_KEY")
CARTESIA_VERSION = "2024-06-10"

def _headers() -> dict:
    return {
        "X-API-Key": CARTESIA_API_KEY,
        "Cartesia-Version": CARTESIA_VERSION,
        "Content-Type": "application/json",
    }

def generate_audio(narration_script: str, voice_id: str, output_path: str) -> str:
    """
    Call Cartesia /tts/bytes to synthesize narration and write to output_path.
    Returns the local file path of the saved MP3.
    voice_id is a Cartesia UUID — sourced from sites.cartesia_voice_id (site-level config)
    or the default Sharkly voice UUID from the brand config.
    """
    payload = {
        "model_id": "sonic-2",
        "transcript": narration_script,
        "voice": {
            "mode": "id",
            "id": voice_id,
        },
        "output_format": {
            "container": "mp3",
            "encoding": "mp3",
            "sample_rate": 44100,
        },
    }

    response = httpx.post(
        f"{CARTESIA_BASE}/tts/bytes",
        headers=_headers(),
        json=payload,
        timeout=120,
    )
    response.raise_for_status()

    with open(output_path, "wb") as f:
        f.write(response.content)

    return output_path
```

**Voice ID resolution order (same UUID for catalog and cloned voices):**
1. **Explicit on job payload** — if the Workspace passes `cartesia_voice_id` on `POST /api/video/create`, use it (optional future override).
2. **`sites.cartesia_voice_id`** — set in Site Editor → Video tab via catalog picker or by selecting an org-cloned voice (both store a Cartesia UUID).
3. **`config/brands/sharkly.json → cartesia_voice_id`** — Sharkly product default when the site has no voice saved.
4. **Hard-coded fallback UUID** in the worker — last resort.

Cloned voices are still plain UUIDs: the video service does not call the clone API during render — it only needs `POST /tts/bytes` with `voice.mode: "id"`.

**Note:** The `CARTESIA_API_KEY` is **server-side only** — never sent to the browser. Express proxies implement the same pattern as described in `docs/cartesia-tts-product-spec.md` §5 (Security).

---

## 11. FFmpeg Assembly (`services/assembler.py`)

```python
def assemble_video(clips: list[str], audio_path: str,
                   output_path: str, include_captions: bool):

    # 1. Concatenate all scene clips in order
    concat_video = ffmpeg_concat(clips)

    # 2. Adjust audio length to match total video duration
    duration = get_video_duration(concat_video)
    adjusted_audio = adjust_audio_duration(audio_path, duration)

    # 3. Merge video + audio
    merged = ffmpeg_merge(concat_video, adjusted_audio)

    # 4. Optional: burn captions
    if include_captions:
        transcript = whisper_transcribe(audio_path)
        srt_path = generate_srt(transcript)
        merged = ffmpeg_burn_captions(merged, srt_path)

    # 5. Export final 1080p MP4
    ffmpeg_export(merged, output_path, resolution="1080p")
```

---

## 12. Supabase Storage (`services/storage.py`)

Videos are uploaded to Supabase Storage (bucket: `videos`) and a signed URL is returned to the client. This keeps the Fly.io container stateless and videos accessible from the Sharkly app.

```python
import os
from supabase import create_client

# Same names as repo root `.env`: PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are also accepted (see `video-service/services/storage.py`).
SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("PUBLIC_SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY")

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

def upload_video(job_id: str, local_path: str) -> str:
    """Upload final MP4 to Supabase Storage and return a signed URL."""
    storage_path = f"{job_id}/final.mp4"

    with open(local_path, "rb") as f:
        supabase.storage.from_("videos").upload(
            storage_path,
            f,
            {"content-type": "video/mp4"}
        )

    # Signed URL valid for 7 days
    result = supabase.storage.from_("videos").create_signed_url(storage_path, 604800)
    return result["signedURL"]
```

Create the `videos` bucket in Supabase with public = false (signed URLs only).

---

## 13. Async Job System

Jobs run in the background via Redis + RQ so the API returns immediately.

**Job lifecycle:**

```
queued → processing (generating_script) → processing (generating_audio)
       → processing (rendering_scenes) → processing (assembling)
       → processing (uploading) → complete
                                → failed
```

**Worker entry point (`workers/video_worker.py`):**

```python
from rq import Worker, Queue
from redis import Redis
import os

redis_conn = Redis.from_url(os.getenv("REDIS_URL"))
q = Queue(connection=redis_conn)

def process_video_job(job_id: str, payload: dict):
    try:
        update_status(job_id, "processing", "generating_script", 10)
        script = claude_service.generate_script(payload)

        update_status(job_id, "processing", "generating_audio", 30)
        audio_path = cartesia_service.generate_audio(script["narration_script"])

        update_status(job_id, "processing", "rendering_scenes", 50)
        silent_video = remotion_renderer.render_video(script["scenes"], job_id)

        update_status(job_id, "processing", "assembling", 75)
        local_output = assembler.assemble_final_video([silent_video], audio_path, ...)

        update_status(job_id, "processing", "uploading", 90)
        signed_url = storage.upload_video(job_id, local_output)

        update_status(job_id, "complete", None, 100, download_url=signed_url)

    except Exception as e:
        update_status(job_id, "failed", None, 0, error=str(e))
```

---

## 14. Where It Lives in the App

### Entry Point: Site Editor → Video Tab

The blog-to-video feature is scoped to the currently selected site. Configuration and entry live in the **Site Detail page** (`/sites/:id`) under the **Video** tab.

**What the Video tab contains:**
- Feature overview card explaining what blog-to-video does
- **Voice for narration** — Cartesia **catalog browser** (search/filter as implemented), **preview** before saving, and **“Your voices”** for organization-cloned voices; **Clone a new voice** upload flow per §4.1 and `docs/cartesia-tts-product-spec.md`. Selection persists as **`sites.cartesia_voice_id`** (UUID — same whether catalog or clone).
- Step-by-step instructions pointing users to the Workspace to generate videos from articles
- Tier note (available on Builder and above)

The Video tab is only shown for existing sites (not the "Add Site" sheet). It uses the `SiteDetailForm` component's `variant="page"` tab layout at `ui/app/src/components/sites/SiteDetailForm.tsx`.

### Generation Flow: Workspace → Article Toolbar

The actual video generation trigger lives in the Workspace, not the Site Editor. When a user has finished writing and scoring an article:

1. They click **Generate Video** in the article toolbar
2. A modal lets them set quality, duration, and captions
3. The job is submitted to the video service and polled until complete
4. The finished MP4 is available to download or copy a link

This keeps the Site Editor as configuration-only and the Workspace as the action layer — consistent with how the rest of Sharkly works.

---

## 15. Frontend Integration (React — `ui/app/src/`)

The Sharkly React app uses the existing `api` utility from `ui/app/src/utils/api.ts` which automatically handles the production vs. local API origin. Add video calls alongside the existing API pattern.

```typescript
// ui/app/src/api/video.ts

import { api } from '../utils/api';

export interface VideoJobOptions {
  maxDurationSeconds?: number;
  includeCaptions?: boolean;
  quality?: 'low' | 'medium' | 'high';
}

export async function createVideoJob(
  content: string,
  inputType: 'url' | 'text' | 'tiptap_json' | 'brief',
  options: VideoJobOptions = {},
  clusterId?: string,
  articleId?: string,
  /** Optional; defaults to site’s saved `sites.cartesia_voice_id` */
  cartesiaVoiceId?: string,
): Promise<{ job_id: string; status: string }> {
  const res = await api.post('/api/video/create', {
    brand_id: 'sharkly',
    input_type: inputType,
    content,
    cluster_id: clusterId,
    article_id: articleId,
    cartesia_voice_id: cartesiaVoiceId,
    options: {
      max_duration_seconds: options.maxDurationSeconds ?? 300,
      include_captions: options.includeCaptions ?? true,
      quality: options.quality ?? 'medium',
    },
  });
  return res.json();
}

export async function pollVideoJob(jobId: string) {
  const res = await api.get(`/api/video/job/${jobId}`);
  return res.json();
  // { status, progress, current_step, download_url, error }
}

// Poll every 3 seconds until complete or failed
export async function waitForVideo(
  jobId: string,
  onProgress?: (step: string, progress: number) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const interval = setInterval(async () => {
      const job = await pollVideoJob(jobId);
      onProgress?.(job.current_step, job.progress);

      if (job.status === 'complete') {
        clearInterval(interval);
        resolve(job.download_url);
      } else if (job.status === 'failed') {
        clearInterval(interval);
        reject(new Error(job.error ?? 'Video generation failed'));
      }
    }, 3000);
  });
}
```

---

## 16. Environment Variables

Local development uses **one repo-root `.env`** (same file Express loads via `api/src/loadEnv.ts`). The video-service loads that file first, then optional `video-service/.env` overrides (see `video-service/main.py` and `workers/video_worker.py`).

### Repo root `.env` — blog-to-video–related keys

Use placeholders in real commits; never commit secrets.

**Express API (proxy to video service)**

```bash
# Required for POST /api/video/* — points at FastAPI (video-service)
VIDEO_SERVICE_URL=http://localhost:8000
# Production example:
# VIDEO_SERVICE_URL=https://sharkly-video.fly.dev
```

**Shared Supabase (API + video service uploads)**

```bash
PUBLIC_SUPABASE_URL=https://[your-project].supabase.co
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_VIDEOS_BUCKET=videos
SUPABASE_SIGNED_URL_TTL_SEC=604800
```

**Cartesia (Express voice routes + video service TTS)**

```bash
CARTESIA_API_KEY=
CARTESIA_FALLBACK_VOICE_ID=
CARTESIA_VERSION=2024-06-10
CARTESIA_MODEL_ID=sonic-2
CARTESIA_TTS_TIMEOUT_S=600
CARTESIA_TTS_RETRIES=3
CARTESIA_MAX_TRANSCRIPT_CHARS=100000
```

**Redis + video-service worker / FastAPI**

```bash
REDIS_URL=redis://localhost:6379

# Anthropic (script generation in video-service)
ANTHROPIC_API_KEY=

# Remotion / pipeline tuning (video-service)
REMOTION_RENDER_TIMEOUT_S=7200
OUTPUT_DIR=./output/jobs
MAX_JOB_DURATION_SECONDS=600
RQ_JOB_TIMEOUT_SECONDS=3600
VIDEO_WORKER_STEP_SLEEP=0.15
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
VIDEO_MAX_ARTICLE_CHARS=500000
VIDEO_URL_FETCH_TIMEOUT_S=30
VIDEO_URL_MAX_BYTES=2097152
```

`video-service/.env.example` mirrors these with comments. You can keep secrets only in the repo root `.env` and omit `video-service/.env` entirely.

### Legacy names

If you prefer `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` instead of `PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`, either form works for video service storage uploads.

### Local Mac vs Fly.io (system libraries)

**macOS:** Install **ffmpeg** and **Node.js** (for `npx remotion`). **`make install-video`** creates the Python venv and installs `video-templates` npm deps.

**Fly.io** installs **`ffmpeg`**, **Node/npm**, and Python deps via **`video-service/Dockerfile`** (`apt-get` + `pip install -r requirements.txt` + `npm ci` in `video-templates/`).

---

## 17. Dependencies (`video-service/requirements.txt`)

Authoritative pins live in the repo. At time of writing:

```
fastapi==0.115.6
uvicorn[standard]==0.32.1
python-dotenv==1.0.1
httpx==0.27.2
anthropic==0.40.0
supabase==2.10.0
redis==5.2.1
rq==2.1.0
pydantic==2.10.3
pydantic-settings==2.6.1
```

Plus **`video-templates/package.json`** (Remotion CLI, React, etc.).

---

## 18. Key Design Rules

1. **Claude never emits React/Remotion source.** It only returns JSON with content + expressive params chosen from strict enums.
2. **Scene compositions are fixed in repo.** The worker runs the Remotion CLI against checked-in compositions — never AI-generated code.
3. **Color is always semantic.** Claude returns `"accent"`, Sharkly brand config maps it to hex. Components resolve via theme helpers.
4. **Every animation style has a fallback.** Server and UI coerce unknown enum values to safe defaults (see `claude_service.py` / `videoSceneAnimations.ts`).
5. **Jobs are always async.** The API route handler only enqueues the job and returns. All heavy work happens in the RQ worker.
6. **Videos live in Supabase Storage.** The Fly.io container is stateless — temp files are cleaned up after upload. The signed URL is what the Sharkly app stores and displays.
7. **One output folder per job.** `output/jobs/{job_id}/` contains all temp clips and audio for that job. Cleaned up after successful upload.
8. **Auth flows through the Express API.** The FastAPI service does not know about Sharkly users. Supabase auth is validated in the Express layer; the Express controller then calls the FastAPI service with the job payload.
9. **`tiptap_json` input type.** Since articles in Sharkly are authored in the Tiptap editor, the content processor must be able to accept Tiptap JSON (serialized document) and convert it to plain text before passing to Claude.
10. **Cartesia voice IDs are UUIDs.** Catalog picks and org clones both resolve to the same `voice: { "mode": "id", "id": "<uuid>" }` shape for TTS. List, preview, and clone flows follow **`docs/cartesia-tts-product-spec.md`**; never ship the Cartesia API key to the client.

---

## 19. Deployment (Fly.io)

The `video-service/` deploys as a separate Fly.io app (`sharkly-video`) alongside the existing `sharkly-api`.

**`video-service/fly.toml`:**

```toml
app = "sharkly-video"
primary_region = "iad"

[build]
  dockerfile = "Dockerfile"

[http_service]
  internal_port = 8000
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 0

[env]
  OUTPUT_DIR = "/tmp/jobs"

[[vm]]
  memory = "4gb"
  cpu_kind = "performance"
  cpus = 2
```

**Note:** Remotion (headless Chrome) + FFmpeg muxing are memory-heavy. **4 GB** RAM is a reasonable minimum for the Fly machine; scale up for long videos or high CRF quality.

**Redis:** Use Fly.io's managed Redis (`fly redis create`) or Upstash. Set the `REDIS_URL` secret:

```bash
fly secrets set REDIS_URL=redis://... --app sharkly-video
fly secrets set ANTHROPIC_API_KEY=... --app sharkly-video
fly secrets set CARTESIA_API_KEY=... --app sharkly-video          # From cartesia.ai dashboard
fly secrets set SUPABASE_URL=... --app sharkly-video
fly secrets set SUPABASE_SERVICE_ROLE_KEY=... --app sharkly-video
```

---

## 20. Running Locally

Add a `dev-video` target to the root `Makefile`:

```make
dev-video:
	cd video-service && uvicorn main:app --reload --port 8000
```

Full local stack:

```bash
# Terminal 1 — Sharkly API
make dev-api

# Terminal 2 — Sharkly React app
make dev-app

# Terminal 3 — Video service
make dev-video

# Terminal 4 — Redis (via Docker, already used for Supabase local dev)
docker run -p 6379:6379 redis

# Terminal 5 — RQ Worker
cd video-service && rq worker --with-scheduler
```

Set `VIDEO_SERVICE_URL=http://localhost:8000` in the **repo root** `.env` (Express loads it the same way as the video-service).
