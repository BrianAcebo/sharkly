-- Phase 2: Associate strategy runs with targets for per-target topic generation
-- target_id is optional — existing runs stay null; new runs can record which target they belong to

ALTER TABLE public.strategy_runs
  ADD COLUMN IF NOT EXISTS target_id uuid REFERENCES public.targets(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_strategy_runs_target_id ON public.strategy_runs(target_id);

COMMENT ON COLUMN public.strategy_runs.target_id IS 'Target this run was generated for; null for legacy or site-wide runs';
