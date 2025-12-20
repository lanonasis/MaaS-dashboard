-- Auth events read-side (Supabase)
-- Creates auth_events table and projection tables for users, sessions, and api keys.
-- Events are ingested via upserts (idempotent on event_id) from the auth-gateway outbox forwarder.

-- Base event log (idempotent target)
CREATE TABLE IF NOT EXISTS public.auth_events (
  event_id UUID PRIMARY KEY,
  aggregate_type TEXT NOT NULL,
  aggregate_id TEXT NOT NULL,
  version BIGINT NOT NULL,
  event_type TEXT NOT NULL,
  event_type_version INTEGER NOT NULL DEFAULT 1,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_events_aggregate
  ON public.auth_events (aggregate_type, aggregate_id, version);

-- Projection tables
CREATE TABLE IF NOT EXISTS public.auth_users (
  user_id TEXT PRIMARY KEY,
  email TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_event_version BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.auth_sessions (
  session_id TEXT PRIMARY KEY,
  user_id TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  expires_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_event_version BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id
  ON public.auth_sessions (user_id);

CREATE TABLE IF NOT EXISTS public.auth_api_keys (
  key_id TEXT PRIMARY KEY,
  user_id TEXT,
  name TEXT,
  service TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_event_version BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_api_keys_user_id
  ON public.auth_api_keys (user_id);

-- Helper to keep updated_at fresh on projections
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply event to projections (idempotent by event_id + version ordering)
CREATE OR REPLACE FUNCTION public.apply_auth_event()
RETURNS TRIGGER AS $$
DECLARE
  v_payload JSONB := NEW.payload;
  v_type TEXT := NEW.event_type;
  v_version BIGINT := NEW.version;
  v_user_id TEXT := COALESCE(v_payload->>'user_id', NEW.aggregate_id);
  v_session_id TEXT := COALESCE(v_payload->>'session_id', NEW.aggregate_id);
  v_key_id TEXT := COALESCE(v_payload->>'key_id', NEW.aggregate_id);
  v_email TEXT := v_payload->>'email';
  v_service TEXT := v_payload->>'service';
  v_name TEXT := v_payload->>'name';
  v_expires_at TIMESTAMPTZ := NULL;
BEGIN
  BEGIN
    v_expires_at := (v_payload->>'expires_at')::timestamptz;
  EXCEPTION WHEN others THEN
    v_expires_at := NULL;
  END;

  -- Users
  IF v_type = 'UserCreated' THEN
    INSERT INTO public.auth_users AS u (user_id, email, metadata, last_event_version, created_at, updated_at)
    VALUES (v_user_id, v_email, COALESCE(v_payload->'metadata', '{}'::jsonb), v_version, NEW.occurred_at, NEW.occurred_at)
    ON CONFLICT (user_id) DO UPDATE
      SET email = COALESCE(EXCLUDED.email, u.email),
          metadata = COALESCE(EXCLUDED.metadata, u.metadata),
          last_event_version = GREATEST(u.last_event_version, EXCLUDED.last_event_version),
          updated_at = NEW.occurred_at
      WHERE EXCLUDED.last_event_version >= u.last_event_version;
  ELSIF v_type = 'UserUpdated' THEN
    INSERT INTO public.auth_users AS u (user_id, email, metadata, last_event_version, created_at, updated_at)
    VALUES (v_user_id, v_email, COALESCE(v_payload->'metadata', '{}'::jsonb), v_version, NEW.occurred_at, NEW.occurred_at)
    ON CONFLICT (user_id) DO UPDATE
      SET email = COALESCE(EXCLUDED.email, u.email),
          metadata = COALESCE(EXCLUDED.metadata, u.metadata),
          last_event_version = GREATEST(u.last_event_version, EXCLUDED.last_event_version),
          updated_at = NEW.occurred_at
      WHERE EXCLUDED.last_event_version >= u.last_event_version;
  END IF;

  -- Sessions
  IF v_type = 'SessionCreated' THEN
    INSERT INTO public.auth_sessions AS s (session_id, user_id, status, expires_at, metadata, last_event_version, created_at, updated_at)
    VALUES (v_session_id, v_user_id, 'active', v_expires_at, COALESCE(v_payload->'metadata', '{}'::jsonb), v_version, NEW.occurred_at, NEW.occurred_at)
    ON CONFLICT (session_id) DO UPDATE
      SET user_id = COALESCE(EXCLUDED.user_id, s.user_id),
          status = EXCLUDED.status,
          expires_at = COALESCE(EXCLUDED.expires_at, s.expires_at),
          metadata = COALESCE(EXCLUDED.metadata, s.metadata),
          last_event_version = GREATEST(s.last_event_version, EXCLUDED.last_event_version),
          updated_at = NEW.occurred_at
      WHERE EXCLUDED.last_event_version >= s.last_event_version;
  ELSIF v_type = 'SessionRevoked' THEN
    UPDATE public.auth_sessions
      SET status = 'revoked',
          last_event_version = GREATEST(last_event_version, v_version),
          updated_at = NEW.occurred_at
      WHERE session_id = v_session_id
        AND v_version >= last_event_version;
  ELSIF v_type = 'SessionExtended' THEN
    UPDATE public.auth_sessions
      SET expires_at = COALESCE(v_expires_at, expires_at),
          last_event_version = GREATEST(last_event_version, v_version),
          updated_at = NEW.occurred_at
      WHERE session_id = v_session_id
        AND v_version >= last_event_version;
  END IF;

  -- API Keys
  IF v_type = 'ApiKeyCreated' THEN
    INSERT INTO public.auth_api_keys AS k (key_id, user_id, name, service, is_active, expires_at, metadata, last_event_version, created_at, updated_at)
    VALUES (v_key_id, v_user_id, v_name, v_service, true, v_expires_at, COALESCE(v_payload->'metadata', '{}'::jsonb), v_version, NEW.occurred_at, NEW.occurred_at)
    ON CONFLICT (key_id) DO UPDATE
      SET user_id = COALESCE(EXCLUDED.user_id, k.user_id),
          name = COALESCE(EXCLUDED.name, k.name),
          service = COALESCE(EXCLUDED.service, k.service),
          is_active = EXCLUDED.is_active,
          expires_at = COALESCE(EXCLUDED.expires_at, k.expires_at),
          metadata = COALESCE(EXCLUDED.metadata, k.metadata),
          last_event_version = GREATEST(k.last_event_version, EXCLUDED.last_event_version),
          updated_at = NEW.occurred_at
      WHERE EXCLUDED.last_event_version >= k.last_event_version;
  ELSIF v_type = 'ApiKeyRevoked' THEN
    UPDATE public.auth_api_keys
      SET is_active = false,
          last_event_version = GREATEST(last_event_version, v_version),
          updated_at = NEW.occurred_at
      WHERE key_id = v_key_id
        AND v_version >= last_event_version;
  ELSIF v_type = 'ApiKeyActivated' THEN
    UPDATE public.auth_api_keys
      SET is_active = true,
          last_event_version = GREATEST(last_event_version, v_version),
          updated_at = NEW.occurred_at
      WHERE key_id = v_key_id
        AND v_version >= last_event_version;
  ELSIF v_type = 'ApiKeyUpdated' THEN
    UPDATE public.auth_api_keys
      SET name = COALESCE(v_name, name),
          service = COALESCE(v_service, service),
          expires_at = COALESCE(v_expires_at, expires_at),
          metadata = COALESCE(v_payload->'metadata', metadata),
          last_event_version = GREATEST(last_event_version, v_version),
          updated_at = NEW.occurred_at
      WHERE key_id = v_key_id
        AND v_version >= last_event_version;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_apply_auth_event ON public.auth_events;
CREATE TRIGGER trg_apply_auth_event
AFTER INSERT ON public.auth_events
FOR EACH ROW EXECUTE FUNCTION public.apply_auth_event();

-- Keep projection updated_at columns fresh
DROP TRIGGER IF EXISTS trg_auth_users_updated_at ON public.auth_users;
CREATE TRIGGER trg_auth_users_updated_at
BEFORE UPDATE ON public.auth_users
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_auth_sessions_updated_at ON public.auth_sessions;
CREATE TRIGGER trg_auth_sessions_updated_at
BEFORE UPDATE ON public.auth_sessions
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_auth_api_keys_updated_at ON public.auth_api_keys;
CREATE TRIGGER trg_auth_api_keys_updated_at
BEFORE UPDATE ON public.auth_api_keys
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

