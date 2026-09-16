// Legacy central-auth callback helpers — extracted from useCentralAuth.tsx.
// Pure functions, no React, no hooks. Testable without mounting.

/**
 * Keys for sensitive tokens left by deprecated central-auth flows.
 * Must stay in sync with the constants in useCentralAuth.tsx.
 */
export const LEGACY_SENSITIVE_TOKEN_KEYS = [
  "access_token",
  "lanonasis_token",
  "refresh_token",
  "auth_gateway_tokens",
];

/**
 * Keys for callback metadata left by deprecated central-auth flows.
 */
export const LEGACY_CALLBACK_METADATA_KEYS = [
  "lanonasis_current_session",
  "lanonasis_current_user_id",
  "lanonasis_auth_timestamp",
  "lanonasis_user",
];

/**
 * Keys for session storage left by deprecated central-auth flows.
 */
export const LEGACY_SESSION_STORAGE_KEYS = ["refresh_token_fallback"];

/** Central-auth reauth flag stored in sessionStorage */
export const CENTRAL_AUTH_REAUTH_FLAG =
  "lanonasis_central_auth_reauth_required_v136";

// ── Pure helpers ──────────────────────────────────────────────────────

export function hasSupabaseCallbackParams(
  searchParams: URLSearchParams,
  hash: string
): boolean {
  const hashParams = new URLSearchParams(hash.replace(/^#/, ""));
  return Boolean(
    searchParams.get("code") ||
      searchParams.get("error") ||
      searchParams.get("error_description") ||
      hashParams.get("access_token") ||
      hashParams.get("error")
  );
}

export function hasLegacyCentralCallbackParams(
  searchParams: URLSearchParams
): boolean {
  return Boolean(
    searchParams.get("token") ||
      searchParams.get("access_token") ||
      searchParams.get("refresh_token") ||
      searchParams.get("session") ||
      searchParams.get("user_id") ||
      searchParams.get("timestamp")
  );
}

/** Check whether legacy central-auth artifacts are still in storage */
export function hasLegacyCentralStorageArtifacts(): boolean {
  return (
    [...LEGACY_SENSITIVE_TOKEN_KEYS, ...LEGACY_CALLBACK_METADATA_KEYS].some(
      (key) => Boolean(localStorage.getItem(key))
    ) ||
    LEGACY_SESSION_STORAGE_KEYS.some((key) =>
      Boolean(sessionStorage.getItem(key))
    )
  );
}

/**
 * Remove deprecated central-auth artifacts from browser storage.
 * @param includeMetadata - When true, also clears callback metadata keys.
 */
export function clearLegacyCentralArtifacts(includeMetadata: boolean): void {
  LEGACY_SENSITIVE_TOKEN_KEYS.forEach((key) => localStorage.removeItem(key));
  LEGACY_SESSION_STORAGE_KEYS.forEach((key) => {
    sessionStorage.removeItem(key);
  });

  if (includeMetadata) {
    LEGACY_CALLBACK_METADATA_KEYS.forEach((key) =>
      localStorage.removeItem(key)
    );
  }
}

/** Mark that central-auth reauth is required */
export function markCentralAuthReauthRequired(): void {
  sessionStorage.setItem(CENTRAL_AUTH_REAUTH_FLAG, "1");
}

/**
 * Consume the central-auth reauth flag.
 * @returns true if the flag was set (and is now cleared), false otherwise.
 */
export function consumeCentralAuthReauthRequired(): boolean {
  const flagged = sessionStorage.getItem(CENTRAL_AUTH_REAUTH_FLAG) === "1";
  if (flagged) {
    sessionStorage.removeItem(CENTRAL_AUTH_REAUTH_FLAG);
  }
  return flagged;
}
