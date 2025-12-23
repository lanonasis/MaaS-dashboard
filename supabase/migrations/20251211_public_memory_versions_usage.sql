-- Purpose: add memory_versions and usage_analytics to public schema (non-breaking)
-- Safe guards:
-- - CREATE TABLE IF NOT EXISTS
-- - touch_updated_at helper is idempotent

SET search_path = public, extensions;

-- Helper to keep updated_at fresh
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Version history for memories
CREATE TABLE IF NOT EXISTS public.memory_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id UUID NOT NULL REFERENCES public.memory_entries(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  title VARCHAR NOT NULL,
  content TEXT NOT NULL,
  type VARCHAR NOT NULL,
  tags TEXT[] DEFAULT '{}',
  metadata JSONB,
  change_type VARCHAR NOT NULL CHECK (change_type IN ('create','update','delete','restore')),
  changed_fields TEXT[],
  change_summary TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (memory_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_memory_versions_memory ON public.memory_versions (memory_id);

DROP TRIGGER IF EXISTS trg_memory_versions_updated_at ON public.memory_versions;
CREATE TRIGGER trg_memory_versions_updated_at
BEFORE UPDATE ON public.memory_versions
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Usage analytics (lightweight, non-partitioned)
CREATE TABLE IF NOT EXISTS public.usage_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID,
  metric_type VARCHAR NOT NULL,
  metric_value NUMERIC DEFAULT 1,
  dimensions JSONB DEFAULT '{}'::jsonb,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  partition_month DATE NOT NULL DEFAULT date_trunc('month', CURRENT_DATE)::date,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usage_analytics_org ON public.usage_analytics (organization_id, partition_month);
CREATE INDEX IF NOT EXISTS idx_usage_analytics_user ON public.usage_analytics (user_id);
CREATE INDEX IF NOT EXISTS idx_usage_analytics_metric ON public.usage_analytics (metric_type);

DROP TRIGGER IF EXISTS trg_usage_analytics_updated_at ON public.usage_analytics;
CREATE TRIGGER trg_usage_analytics_updated_at
BEFORE UPDATE ON public.usage_analytics
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

