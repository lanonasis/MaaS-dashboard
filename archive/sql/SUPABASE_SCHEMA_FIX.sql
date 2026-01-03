-- =====================================================
-- Supabase Schema Fix for API Keys
-- =====================================================
-- This migration updates the api_keys table to use key_hash
-- instead of plain text key column
--
-- IMPORTANT: Run this in your Supabase SQL Editor
-- Dashboard: https://supabase.com/dashboard/project/mxtsdgkwzjzlttpotole/editor
-- =====================================================

-- Step 1: Add key_hash column (SHA-256 hash, 64 characters)
ALTER TABLE public.api_keys
ADD COLUMN IF NOT EXISTS key_hash VARCHAR(64);

-- Step 2: Migrate existing plain-text keys to hashed format
-- NOTE: This hashes existing keys, but won't work for validating them later
-- Consider deleting old keys and having users regenerate them
UPDATE public.api_keys
SET key_hash = encode(digest(key, 'sha256'), 'hex')
WHERE key_hash IS NULL AND key IS NOT NULL;

-- Step 3: Make key_hash NOT NULL after migration
-- (Only run this after confirming all keys are migrated)
-- ALTER TABLE public.api_keys
-- ALTER COLUMN key_hash SET NOT NULL;

-- Step 4: Drop old key column (OPTIONAL - only after users regenerate)
-- WARNING: This will delete all existing keys!
-- Users will need to regenerate their API keys
-- ALTER TABLE public.api_keys DROP COLUMN key;

-- Step 5: Add index on key_hash for faster lookups
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash
ON public.api_keys(key_hash);

-- Step 6: Add index on user_id for faster user queries
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id
ON public.api_keys(user_id);

-- =====================================================
-- Verification Queries
-- =====================================================
-- Check schema update
SELECT column_name, data_type, character_maximum_length, is_nullable
FROM information_schema.columns
WHERE table_name = 'api_keys'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Count migrated keys
SELECT
  COUNT(*) as total_keys,
  COUNT(key_hash) as hashed_keys,
  COUNT(key) as plain_keys
FROM public.api_keys;
