-- Purpose: add chunk-level RAG support in public schema (non-breaking)
-- Adds memory_chunks (new) and augments topics with hierarchy/metadata fields.
-- Safe guards:
-- - CREATE TABLE IF NOT EXISTS for memory_chunks
-- - ALTER TABLE ... ADD COLUMN IF NOT EXISTS for topics
-- - touch_updated_at helper is idempotent

-- Include extensions in search_path so vector type is visible
SET search_path = public, extensions;

-- Ensure vector extension for embeddings (no-op if already installed)
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- Helper to keep updated_at fresh
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Augment existing topics to support hierarchy and metadata (non-breaking)
ALTER TABLE public.topics
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.topics(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_topics_parent ON public.topics (parent_id);
CREATE INDEX IF NOT EXISTS idx_topics_org ON public.topics (organization_id);

DROP TRIGGER IF EXISTS trg_topics_updated_at ON public.topics;
CREATE TRIGGER trg_topics_updated_at
BEFORE UPDATE ON public.topics
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Chunk-level storage for RAG (new in public)
CREATE TABLE IF NOT EXISTS public.memory_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id UUID NOT NULL REFERENCES public.memory_entries(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  start_offset INTEGER NOT NULL,
  end_offset INTEGER NOT NULL,
  token_count INTEGER,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  embedding VECTOR, -- dimension intentionally unspecified; set at runtime if needed
  access_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (memory_id, chunk_index)
);

CREATE INDEX IF NOT EXISTS idx_memory_chunks_memory ON public.memory_chunks (memory_id);
CREATE INDEX IF NOT EXISTS idx_memory_chunks_org ON public.memory_chunks (organization_id);
CREATE INDEX IF NOT EXISTS idx_memory_chunks_offsets ON public.memory_chunks (memory_id, chunk_index, start_offset);

DROP TRIGGER IF EXISTS trg_memory_chunks_updated_at ON public.memory_chunks;
CREATE TRIGGER trg_memory_chunks_updated_at
BEFORE UPDATE ON public.memory_chunks
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

