# Targets → Topics → Clusters — Implementation Plan

Systematic plan to introduce **Targets** as the organizing layer for content strategy. Execute in order, migration by migration.

---

## Current State

- **sites** — one per project
- **topics** — `site_id`, title, keyword, funnel_stage, status (queued|active|complete|locked), cluster_id
- **clusters** — `site_id`, `topic_id` (NOT NULL), title, target_keyword, destination_page_* (on cluster)
- **pages** — `cluster_id`, site_id

**Flow today:** Site → Strategy generates topics → User picks topic → Start Cluster → Cluster belongs to topic

---

## Target State (from SITEMAP-UPDATED.MD)

- **targets** — NEW. A target = page you want to rank. Name, destination_url, destination_label, seed_keywords
- **topics** — belong to a **target** (not directly to site)
- **clusters** — still link to topic; topic links to target
- Strategy generation runs **per target** (seeds come from target)
- Unlocked vs Locked topics (authority_fit + impression threshold)

---

## Phase 1: Database — Targets Table + Topics Migration

### Migration 1a: Create `targets` table

```sql
-- 2026-03-XX_targets_table.sql
CREATE TABLE IF NOT EXISTS public.targets (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id         uuid        NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  name            text        NOT NULL,
  destination_page_url   text,
  destination_page_label text,
  seed_keywords   text[]      NOT NULL DEFAULT '{}',
  sort_order      integer     NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_targets_site_id ON public.targets(site_id);

ALTER TABLE public.targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view targets for their sites"
  ON public.targets FOR SELECT
  USING (
    site_id IN (
      SELECT s.id FROM public.sites s
      JOIN public.user_organizations uo ON uo.organization_id = s.organization_id
      WHERE uo.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert targets for their sites"
  ON public.targets FOR INSERT
  WITH CHECK (
    site_id IN (
      SELECT s.id FROM public.sites s
      JOIN public.user_organizations uo ON uo.organization_id = s.organization_id
      WHERE uo.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update targets for their sites"
  ON public.targets FOR UPDATE
  USING (
    site_id IN (
      SELECT s.id FROM public.sites s
      JOIN public.user_organizations uo ON uo.organization_id = s.organization_id
      WHERE uo.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete targets for their sites"
  ON public.targets FOR DELETE
  USING (
    site_id IN (
      SELECT s.id FROM public.sites s
      JOIN public.user_organizations uo ON uo.organization_id = s.organization_id
      WHERE uo.user_id = auth.uid()
    )
  );
```

### Migration 1b: Add `target_id` to topics + backfill

```sql
-- 2026-03-XX_topics_add_target_id.sql
ALTER TABLE public.topics
  ADD COLUMN IF NOT EXISTS target_id uuid REFERENCES public.targets(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_topics_target_id ON public.topics(target_id);

-- Backfill: create default target per site, assign existing topics to it
-- Step 1: Insert one target per site that has topics (only if no target exists yet)
INSERT INTO public.targets (site_id, name, destination_page_url, destination_page_label, seed_keywords, sort_order)
SELECT t.site_id, 'Main Strategy', NULL, NULL, ARRAY[]::text[], 0
FROM (SELECT DISTINCT site_id FROM public.topics) t
WHERE NOT EXISTS (
  SELECT 1 FROM public.targets WHERE targets.site_id = t.site_id
);

-- Step 2: Assign topics to their site's default target
UPDATE public.topics t
SET target_id = (
  SELECT id FROM public.targets
  WHERE site_id = t.site_id
  ORDER BY sort_order ASC, created_at ASC
  LIMIT 1
)
WHERE target_id IS NULL;
```

**Decision:** Keep `site_id` on topics for now (redundant but simplifies queries). Or we could derive site from target. For Phase 1, keep both for safety.

### Migration 1c: Make target_id required (after backfill verified)

```sql
-- 2026-03-XX_topics_target_required.sql (run after 1b verified)
ALTER TABLE public.topics
  ALTER COLUMN target_id SET NOT NULL;
```

**Note:** If you have sites with zero topics, the INSERT in 1b won't create targets for them. That's fine — targets get created when user adds first target. For sites with topics, we create "Main Strategy" target.

---

## Phase 2: API — Targets CRUD + Strategy Per Target

### 2.1 Targets API
- `GET /api/sites/:siteId/targets` — list targets for site
- `POST /api/sites/:siteId/targets` — create target (name, destination_url, destination_label, seed_keywords)
- `PATCH /api/targets/:targetId` — update target
- `DELETE /api/targets/:targetId` — delete target (cascade to topics, warn about clusters)

### 2.2 Strategy API changes
- **Current:** `POST /api/strategy/generate` — takes site_id, seeds from body
- **New:** Same endpoint but also accepts `target_id`. If target_id provided:
  - Use target's seed_keywords (or name if empty)
  - Insert topics with `target_id` set
  - Strategy run record links to target (add `target_id` to strategy_runs)

### 2.3 Topics API
- Filter topics by `target_id` when fetching for target detail page
- `GET /api/targets/:targetId/topics` — topics for this target

---

## Phase 3: Hooks & Types — Frontend Data Layer

### 3.1 New: `useTargets(siteId)`
- Fetch targets for site
- Return: targets, loading, error, createTarget, updateTarget, deleteTarget, refetch

### 3.2 New: `useTargetTopics(targetId)` 
- Fetch topics for a specific target (replaces or extends useTopics when target-scoped)
- When targetId is null, could fall back to site-level (for backward compat during transition)

### 3.3 Extend: `useTopics(siteId)`
- **Option A:** Keep as-is for Dashboard/quick stats (all topics for site)
- **Option B:** Deprecate in favor of useTargetTopics when we have targets
- Recommendation: Keep useTopics for site-level aggregation; add useTargetTopics for target detail

### 3.4 Types
- `Target` type: id, siteId, name, destinationPageUrl, destinationPageLabel, seedKeywords, sortOrder
- `Topic` already exists; add `targetId` when we use it

---

## Phase 4: UI — Strategy Page Restructure

### 4.1 `/strategy` — Targets Overview (replace current topic list)
- **New layout:** Targets grid (cards)
- Each card: target name, destination label, topic count, cluster count, "View Topics" CTA
- "Add Target" button → Add Target modal
- Empty state: "You haven't defined any targets yet" + explanation
- **KEYWORDS VIEW toggle** — flat table of all keywords across targets (defer or build with Phase 4)

### 4.2 Add Target modal
- Step 1: Target name, destination URL, destination label, seed keywords (optional)
- Step 2: "Generate Topic Plan" CTA (15 credits) — calls strategy API with target_id

### 4.3 `/strategy/:targetId` — Target Detail (Topic Plan)
- **New route** — currently we only have /strategy
- Breadcrumb: Strategy → [Target Name]
- Target header: name (editable), destination pill, Edit | Regenerate | Add Topic
- **Unlocked Topics** section — same table as today, filtered by target
- **Locked Topics** section (collapsed) — topics with authority_fit=locked (defer impression threshold)
- Topic detail drawer (existing, with "Start Cluster" CTA)
- View toggle: Topics | Keywords (within this target)

### 4.4 Clusters flow
- "New Cluster" on /clusters → **topic selection modal** — topics come from **strategy** (all targets or target-scoped?)
- Sitemap says "Select topic to start cluster (picks from strategy list)" — so we need a topic picker that shows topics across targets or within one target
- When creating cluster from Strategy target detail, we already have target context

---

## Phase 5: Cluster ↔ Target Relationship

- Clusters already have `topic_id` → topic has `target_id`
- **Cluster destination:** Today destination is on **cluster**. Sitemap shows destination on **target**.
- **Option A:** Cluster can override target's destination (cluster.destination_page_url)
- **Option B:** Cluster inherits target's destination; cluster destination is only for clusters without a target
- **Recommendation:** Keep cluster-level destination (L3 already built). Target's destination is the "default" for that target's clusters. When creating cluster from topic → target, we can pre-fill cluster destination from target.

---

## Phase 6: Locked Topics (Defer)

- "Unlocks As You Grow" — impression threshold to unlock
- Requires: `unlock_impression_threshold` on topic? Or computed from authority_fit + site GSC data?
- Defer to post-Phase 4; authority_fit already gives us achievable/buildToward/locked

---

## Execution Order

| Step | Migration | API | UI | Notes |
|------|-----------|-----|-----|-------|
| 1 | 1a: targets table | — | — | Run migration |
| 2 | 1b: topics.target_id + backfill | — | — | Verify backfill |
| 3 | 1c: target_id NOT NULL | — | — | After 1b verified |
| 4 | — | Targets CRUD API | — | |
| 5 | — | — | useTargets hook | |
| 6 | — | Strategy accepts target_id | Add Target modal (Step 1 only) | Create target, no generate yet |
| 7 | — | — | /strategy targets grid | Replace topic list with targets; show "Main Strategy" from backfill |
| 8 | — | Strategy generates into target | Add Target modal Step 2 | |
| 9 | — | — | /strategy/:targetId route | Target detail with topics table |
| 10 | — | — | Keywords view, Locked section | Defer |

---

## Migration File Naming

Use dates: `2026-03-10_targets_table.sql`, `2026-03-10_topics_add_target_id.sql`, etc.

---

## Rollback Considerations

- Phase 1: If we need to rollback, `target_id` is nullable until 1c. We could make it nullable again and drop targets table.
- Keep `site_id` on topics — no change to existing topic queries during transition.
