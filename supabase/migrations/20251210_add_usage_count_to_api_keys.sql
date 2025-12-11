-- Migration: Add usage_count column to api_keys table
-- This column tracks how many times an API key has been used
-- Required for alignment with auth middleware that tracks usage

-- Add usage_count column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'api_keys' 
        AND column_name = 'usage_count'
    ) THEN
        ALTER TABLE api_keys ADD COLUMN usage_count INTEGER DEFAULT 0;
    END IF;
END $$;

-- Add constraint to ensure usage_count is non-negative
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'api_keys_usage_count_positive'
        AND table_name = 'api_keys'
    ) THEN
        ALTER TABLE api_keys ADD CONSTRAINT api_keys_usage_count_positive CHECK (usage_count >= 0);
    END IF;
END $$;

-- Create index for usage tracking queries
CREATE INDEX IF NOT EXISTS idx_api_keys_usage_count ON api_keys(usage_count);

-- Comment on the new column
COMMENT ON COLUMN api_keys.usage_count IS 'Number of times this API key has been used for authentication';

