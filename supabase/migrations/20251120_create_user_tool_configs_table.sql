-- Create user_tool_configs table for AI tool configuration
-- This table stores which tools users have enabled and their configurations

CREATE TABLE IF NOT EXISTS user_tool_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tool_id TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  api_key TEXT, -- Encrypted API key for MCP tools
  config JSONB, -- Additional configuration parameters
  permissions TEXT[] NOT NULL DEFAULT '{}', -- Array of permitted action IDs
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure user can only have one config per tool
  UNIQUE(user_id, tool_id)
);

-- Create index for faster lookups
CREATE INDEX idx_user_tool_configs_user_id ON user_tool_configs(user_id);
CREATE INDEX idx_user_tool_configs_tool_id ON user_tool_configs(tool_id);
CREATE INDEX idx_user_tool_configs_enabled ON user_tool_configs(enabled) WHERE enabled = true;

-- Enable Row Level Security
ALTER TABLE user_tool_configs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view their own tool configs
CREATE POLICY "Users can view own tool configs"
  ON user_tool_configs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own tool configs
CREATE POLICY "Users can insert own tool configs"
  ON user_tool_configs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own tool configs
CREATE POLICY "Users can update own tool configs"
  ON user_tool_configs
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own tool configs
CREATE POLICY "Users can delete own tool configs"
  ON user_tool_configs
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_tool_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_user_tool_configs_updated_at
  BEFORE UPDATE ON user_tool_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_user_tool_configs_updated_at();

-- Comments for documentation
COMMENT ON TABLE user_tool_configs IS 'Stores user-specific tool configurations for the AI assistant';
COMMENT ON COLUMN user_tool_configs.user_id IS 'Reference to the user who owns this configuration';
COMMENT ON COLUMN user_tool_configs.tool_id IS 'Identifier for the tool (e.g., dashboard.api_keys, mcp.github)';
COMMENT ON COLUMN user_tool_configs.enabled IS 'Whether the tool is currently enabled for the user';
COMMENT ON COLUMN user_tool_configs.api_key IS 'Encrypted API key for external MCP tools (null for dashboard tools)';
COMMENT ON COLUMN user_tool_configs.config IS 'Additional tool-specific configuration as JSON';
COMMENT ON COLUMN user_tool_configs.permissions IS 'Array of action IDs the AI is permitted to perform';
