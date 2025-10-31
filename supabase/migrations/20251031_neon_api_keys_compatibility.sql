-- Neon Database: Fix api_keys table schema
-- Make it compatible with dashboard application

-- Add the 'key' column to store the plain API key (for dashboard compatibility)
-- Note: In production, you might want to keep key_hash and handle this differently
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS key TEXT;

-- Add 'service' column (for service-level access control)
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS service TEXT DEFAULT 'all';

-- Add 'is_active' as boolean instead of using revoked_at timestamp
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Update is_active based on revoked_at
UPDATE api_keys SET is_active = (revoked_at IS NULL);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_neon_api_keys_key ON api_keys(key);
CREATE INDEX IF NOT EXISTS idx_neon_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_neon_api_keys_service ON api_keys(service);

-- Add comment
COMMENT ON TABLE api_keys IS 'API keys table - Updated 2025-10-31 to add key column for dashboard compatibility';

-- Show the updated schema
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'api_keys' 
AND table_schema = 'public'
ORDER BY ordinal_position;
