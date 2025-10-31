-- Fix api_keys table schema
-- The table exists but has the wrong column name for the API key

-- Check if we have key_value column and rename it to key
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'api_keys' 
        AND column_name = 'key_value'
    ) THEN
        -- Rename key_value to key
        ALTER TABLE api_keys RENAME COLUMN key_value TO key;
        RAISE NOTICE 'Renamed key_value column to key';
    END IF;
END $$;

-- Check if we have key_hash column and need to add key column
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'api_keys' 
        AND column_name = 'key_hash'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'api_keys' 
        AND column_name = 'key'
    ) THEN
        -- Add key column (will store the actual key, key_hash stores hash for lookups)
        ALTER TABLE api_keys ADD COLUMN key TEXT;
        RAISE NOTICE 'Added key column alongside key_hash';
    END IF;
END $$;

-- Ensure we have the key column if table exists but has neither
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'api_keys'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'api_keys' 
        AND column_name = 'key'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'api_keys' 
        AND column_name = 'key_value'
    ) THEN
        ALTER TABLE api_keys ADD COLUMN key TEXT NOT NULL;
        RAISE NOTICE 'Added key column to api_keys table';
    END IF;
END $$;

-- Create index on key column if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_api_keys_key ON api_keys(key);

-- Make sure basic columns exist
DO $$
BEGIN
    -- Add name if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'api_keys' AND column_name = 'name'
    ) THEN
        ALTER TABLE api_keys ADD COLUMN name VARCHAR(255);
    END IF;
    
    -- Add service if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'api_keys' AND column_name = 'service'
    ) THEN
        ALTER TABLE api_keys ADD COLUMN service VARCHAR(100);
    END IF;
    
    -- Add expires_at if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'api_keys' AND column_name = 'expires_at'
    ) THEN
        ALTER TABLE api_keys ADD COLUMN expires_at TIMESTAMPTZ;
    END IF;
    
    -- Add is_active if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'api_keys' AND column_name = 'is_active'
    ) THEN
        ALTER TABLE api_keys ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
END $$;
