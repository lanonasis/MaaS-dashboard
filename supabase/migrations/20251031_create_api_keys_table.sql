-- Migration: Create API Keys Table for Dashboard
-- This table stores user-generated API keys for the dashboard application
-- Different from vendor_api_keys which stores encrypted third-party API keys

-- Create api_keys table
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    key TEXT NOT NULL UNIQUE,
    key_hash TEXT NOT NULL UNIQUE,
    service VARCHAR(100) DEFAULT 'all',
    description TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    rate_limited BOOLEAN DEFAULT true,
    permissions JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_key ON api_keys(key);
CREATE INDEX IF NOT EXISTS idx_api_keys_service ON api_keys(service);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active);
CREATE INDEX IF NOT EXISTS idx_api_keys_created_at ON api_keys(created_at DESC);

-- Enable RLS (Row Level Security)
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own api_keys" ON api_keys;
DROP POLICY IF EXISTS "Users can insert own api_keys" ON api_keys;
DROP POLICY IF EXISTS "Users can update own api_keys" ON api_keys;
DROP POLICY IF EXISTS "Users can delete own api_keys" ON api_keys;
DROP POLICY IF EXISTS "Service role full access" ON api_keys;

-- Create RLS policies
-- Users can only see their own API keys
CREATE POLICY "Users can view own api_keys" ON api_keys
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Users can create their own API keys
CREATE POLICY "Users can insert own api_keys" ON api_keys
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own API keys
CREATE POLICY "Users can update own api_keys" ON api_keys
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own API keys
CREATE POLICY "Users can delete own api_keys" ON api_keys
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Service role has full access (for backend operations)
CREATE POLICY "Service role full access" ON api_keys
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Create function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_api_keys_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS api_keys_updated_at ON api_keys;
CREATE TRIGGER api_keys_updated_at
    BEFORE UPDATE ON api_keys
    FOR EACH ROW
    EXECUTE FUNCTION update_api_keys_updated_at();

-- Create function to update last_used_at when key is accessed
CREATE OR REPLACE FUNCTION update_api_key_last_used(key_to_update TEXT)
RETURNS void AS $$
BEGIN
    UPDATE api_keys 
    SET last_used_at = NOW() 
    WHERE key = key_to_update OR key_hash = key_to_update;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON api_keys TO authenticated;
GRANT EXECUTE ON FUNCTION update_api_keys_updated_at() TO authenticated;
GRANT EXECUTE ON FUNCTION update_api_key_last_used(TEXT) TO authenticated;

-- Service role gets all permissions
GRANT ALL ON api_keys TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Add helpful comments
COMMENT ON TABLE api_keys IS 'User-generated API keys for dashboard access and integrations';
COMMENT ON COLUMN api_keys.key IS 'The raw API key (shown only once to user at creation)';
COMMENT ON COLUMN api_keys.key_hash IS 'SHA-256 hash of the key for validation';
COMMENT ON COLUMN api_keys.service IS 'Service scope for the API key (e.g., all, payment, wallet)';
COMMENT ON COLUMN api_keys.rate_limited IS 'Whether this key is subject to rate limiting';
COMMENT ON COLUMN api_keys.permissions IS 'JSONB array of specific permissions granted to this key';
COMMENT ON COLUMN api_keys.metadata IS 'Additional metadata for the API key';
