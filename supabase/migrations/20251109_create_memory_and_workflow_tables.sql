-- Migration: Create memory_entries and workflow_runs tables
-- Created: 2025-11-09
-- Description: Tables for vector memory storage and AI workflow orchestration

-- Create memory_entries table for vector memory storage
CREATE TABLE IF NOT EXISTS public.memory_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    type TEXT,
    tags JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_memory_entries_user_id ON public.memory_entries(user_id);

-- Create index on created_at for ordering
CREATE INDEX IF NOT EXISTS idx_memory_entries_created_at ON public.memory_entries(created_at DESC);

-- Create index on type for filtering
CREATE INDEX IF NOT EXISTS idx_memory_entries_type ON public.memory_entries(type);

-- Add RLS (Row Level Security) policies for memory_entries
ALTER TABLE public.memory_entries ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own memories
CREATE POLICY "Users can read their own memory entries"
    ON public.memory_entries
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can insert their own memories
CREATE POLICY "Users can insert their own memory entries"
    ON public.memory_entries
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own memories
CREATE POLICY "Users can update their own memory entries"
    ON public.memory_entries
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own memories
CREATE POLICY "Users can delete their own memory entries"
    ON public.memory_entries
    FOR DELETE
    USING (auth.uid() = user_id);

-- Create workflow_runs table for orchestrator history
CREATE TABLE IF NOT EXISTS public.workflow_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    goal TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    steps JSONB DEFAULT '[]'::jsonb,
    results JSONB DEFAULT '{}'::jsonb,
    error_message TEXT,
    used_memories JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_workflow_runs_user_id ON public.workflow_runs(user_id);

-- Create index on created_at for ordering
CREATE INDEX IF NOT EXISTS idx_workflow_runs_created_at ON public.workflow_runs(created_at DESC);

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_workflow_runs_status ON public.workflow_runs(status);

-- Add RLS (Row Level Security) policies for workflow_runs
ALTER TABLE public.workflow_runs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own workflow runs
CREATE POLICY "Users can read their own workflow runs"
    ON public.workflow_runs
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can insert their own workflow runs
CREATE POLICY "Users can insert their own workflow runs"
    ON public.workflow_runs
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own workflow runs
CREATE POLICY "Users can update their own workflow runs"
    ON public.workflow_runs
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own workflow runs
CREATE POLICY "Users can delete their own workflow runs"
    ON public.workflow_runs
    FOR DELETE
    USING (auth.uid() = user_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for memory_entries updated_at
DROP TRIGGER IF EXISTS update_memory_entries_updated_at ON public.memory_entries;
CREATE TRIGGER update_memory_entries_updated_at
    BEFORE UPDATE ON public.memory_entries
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE public.memory_entries IS 'Stores vector memory entries for users with semantic search capabilities';
COMMENT ON TABLE public.workflow_runs IS 'Stores AI-orchestrated workflow execution history and plans';
COMMENT ON COLUMN public.memory_entries.type IS 'Type of memory: context, project, knowledge, reference, personal, workflow, note, document';
COMMENT ON COLUMN public.memory_entries.tags IS 'Array of string tags for categorization';
COMMENT ON COLUMN public.workflow_runs.status IS 'Status: analyzing, planning, executing, completed, failed';
COMMENT ON COLUMN public.workflow_runs.steps IS 'Array of workflow step objects with action, tool, and reasoning';
COMMENT ON COLUMN public.workflow_runs.used_memories IS 'Array of memory entry IDs used as context for this workflow';

