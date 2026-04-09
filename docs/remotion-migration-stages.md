# Remotion migration — implementation stages

**Purpose:** Ordered checklist for migrating the video pipeline to Remotion. Full UI/visual contract lives in [remotion-migration-spec.md](./remotion-migration-spec.md).

**Baseline (Stage 0 snapshot — do not rely on chat memory)**

| Topic | Current repo |
|--------|----------------|
| Stage 8 renderer | `video-service/services/template_renderer.py` → `render_script_to_clips()` (removed in Stage 9) |
| Output today | `{job_dir}/clips/{scene_id}.mp4` (one subprocess per scene — pre-migration) |
| Worker | `video-service/workers/video_worker.py` → Cartesia TTS → clips → `assemble_final_video()` |
| Assembler | `video-service/services/assembler.py` — concat clips, align narration, mux |
| Legacy output defaults | 1920×1080 @ 60fps (Remotion spec targets 1080×1920 @ 30fps — intentional format change) |
| Ops | `Makefile`: `dev-video`, `dev-video-worker`, `video`, `install-video`, `video-fonts`; `video-service/Dockerfile` had Python + legacy renderer, no Node yet |

---

## Stage 1 — Remotion shell ✅

`video-service/video-templates/` — Remotion 4 (`remotion` / `@remotion/cli` pinned to **4.0.447**), `zod` **4.3.6**, `remotion.config.ts`, `src/Root.tsx` + `VideoComposition`, `calculateMetadata` from `scenes` durations. **Dev:** `cd video-service/video-templates && npm run dev`. **CLI render:** `npx remotion render VideoComposition out/test.mp4 --props '<json>'` (first run downloads Chrome Headless Shell). **`make install-video`** also runs `npm ci` in `video-templates/`.

## Stage 2 — Types & themes ✅

`src/types.ts` — full Claude-aligned types, content interfaces, `resolveColor`. `src/themes/` — `seo`, `catholic`, `sales`, `sharkly` (matches `config/brands/sharkly.json`), `getTheme(brandId)` with `seo_app`, `sharkly`, `catholic`, `word_journal`, `apologetics`, `sales` (unknown → `seoTheme`). `Root` default props use `getTheme('sharkly')`.

## Stage 3 — Global visual layer ✅

`src/global/` — `FilmGrain`, `Vignette`, `SceneWrapper` (solid brand color, noise tile at 8% + `multiply`, then content, then vignette + animated grain). `public/textures/noise-{dark,light}.png` from `npm run generate-textures` (`pngjs` devDep). `VideoComposition` — `Series` + `Series.Sequence` + `SceneWrapper` + `ScenePlaceholder`. Asset URLs via `staticFile()`.

## Stage 4 — Primitives ✅

`src/components/` — `AnimatedText`, `AccentBar`, `HighlightRect`, `SideRule`, `NoiseBackground` (`staticFile` textures), `VoxHighlighter`; barrel `index.ts`. `SceneProps` on `types.ts`. `ScenePlaceholder` uses `AnimatedText` + `AccentBar` for smoke-test. Patterns: `interpolate` + `extrapolateRight: 'clamp'`, frame `delay`, `resolveColor` unchanged.

## Stage 5 — Scene components (batched PRs) ✅

All 15 Claude `SCENE_TYPES` implemented under `src/scenes/*.tsx`. `VideoComposition` routes `scene.type` via `SCENE_MAP`; unknown types fall back to `ScenePlaceholder`. Helpers: `mapAnimatedTextStyle` (`src/lib/mapAnimatedTextStyle.ts`). No flat full-frame backgrounds — content sits on `SceneWrapper` base. **5a:** `cold_open`, `title_card`, `section_header`, `text_reveal`, `quote_card`, `closing_card` · **5b:** `bullet_points`, `checklist`, `comparison_table`, `stat_callout` · **5c:** `myth_vs_reality`, `objection_rebuttal`, `mechanism_diagram`, `scripture_quote`, `evidence_stack`. (`vox_documentary` / `kinetic_chart` = Stage 6.)

## Stage 6 — New V1 scenes ✅

`src/scenes/VoxDocumentary.tsx` — paper card, `NoiseBackground` (`noise-light.png`), `VoxHighlighter`, jitter. `src/scenes/KineticChart.tsx` — Recharts `BarChart` with frame-driven `animatedValue` (no Recharts animation). Both registered in `VideoComposition` (`vox_documentary`, `kinetic_chart`). Default Studio props include sample `scene_02` / `scene_03`. Claude prompt + `SCENE_TYPES` = Stage 8.

## Stage 7 — Python integration ✅

`services/remotion_renderer.py` — `npx remotion render VideoComposition …` from `video-templates/`, `--props` JSON (`scenes`, camelCase `brand`, `fps` 30), `REMOTION_RENDER_TIMEOUT_S` (default 7200). Worker writes `video_no_audio.mp4` in the job dir; `assemble_final_video` fast-paths **one** clip (no concat). **Dockerfile:** `nodejs` + `npm`, `RUN cd video-templates && npm ci`. Requires **`npx`** on PATH for workers (see `make install-video`).

## Stage 8 — Claude + codegen ✅

`claude_service.py`: `vox_documentary`, `kinetic_chart` in `SCENE_TYPES` / `ANIMATION_BY_TYPE`; universal prompt lines + director rule; `content` coercion keys `highlight_words`, `data`, `chart_type`, `unit`. Regenerate: `python video-service/generate_scene_animations_ts.py`. UI: `videoScript.ts` `VIDEO_SCENE_TYPES`, `SceneContentForm` fields for both types.

## Stage 9 — Remove legacy Python renderer & ops ✅

Removed `video-service/templates/` (legacy scene modules), `services/template_renderer.py`, `services/bundled_fonts.py`, `utils/pango_fonts.py`, `scripts/download_bundled_fonts.py`; slimmed `requirements.txt` (no Cairo/Pango stack). **Dockerfile:** `ffmpeg` + Node/`npm ci` in `video-templates/` only (no Cairo/Pango build deps). **Makefile:** `install-video` no longer needs Homebrew Cairo; `video-textures` replaces `video-fonts` (`npm run generate-textures`). **`.env.example`:** `REMOTION_RENDER_TIMEOUT_S` replaces legacy scene timeouts / Pango font overrides. Run a full job in dev/staging to confirm.

---

**Polish (after Stage 9):** font loading audit (`@remotion/google-fonts`), easing consistency, render timeouts/logging.
