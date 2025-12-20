-- Topics and memory_chunks for RAG / clustering projections (Supabase read side)
-- NOTE: Do not apply until live schema is reviewed. Uses IF NOT EXISTS to be safe.

-- Vector extension (needed for embeddings). Safe no-op if already enabled.
CREATE EXTENSION IF NOT EXISTS vector;

-- Keep updated_at fresh
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Hierarchical topics (for clustering / smart tagging)
CREATE TABLE IF NOT EXISTS public.topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  color VARCHAR(32) DEFAULT '#3B82F6',
  icon VARCHAR(64) DEFAULT 'folder',
  parent_id UUID REFERENCES public.topics(id) ON DELETE SET NULL,
  sort_order INTEGER DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, name)
);

CREATE INDEX IF NOT EXISTS idx_topics_org ON public.topics (organization_id);
CREATE INDEX IF NOT EXISTS idx_topics_parent ON public.topics (parent_id);

DROP TRIGGER IF EXISTS trg_topics_updated_at ON public.topics;
CREATE TRIGGER trg_topics_updated_at
BEFORE UPDATE ON public.topics
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Memory chunks for RAG (chunk-level embeddings and offsets)
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
-- Optional: create a vector index after setting a dimension, e.g.:
-- CREATE INDEX IF NOT EXISTS idx_memory_chunks_embedding ON public.memory_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

DROP TRIGGER IF EXISTS trg_memory_chunks_updated_at ON public.memory_chunks;
CREATE TRIGGER trg_memory_chunks_updated_at
BEFORE UPDATE ON public.memory_chunks
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

