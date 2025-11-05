-- Add avatar support to businesses
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS avatar text;


