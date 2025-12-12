-- Migration: Ensure last_used_at exists on api_keys
-- Context: SSE/auth middleware updates both usage_count and last_used_at.
-- Some deployments only applied the usage_count migration, so we add a
-- defensive, idempotent addition of last_used_at.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'api_keys'
          AND column_name = 'last_used_at'
    ) THEN
        ALTER TABLE public.api_keys
        ADD COLUMN last_used_at TIMESTAMPTZ;
    END IF;
END $$;

COMMENT ON COLUMN public.api_keys.last_used_at IS 'Timestamp of the most recent API key use';
