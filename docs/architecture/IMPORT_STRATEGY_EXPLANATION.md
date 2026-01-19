# Import Strategy Explanation

## The Warning

Vite is warning that `central-auth.ts` is:
- **Statically imported** by `useCentralAuth.tsx` (at module load time)
- **Dynamically imported** by `api-client.ts` (lazy-loaded with `await import()`)

This creates a bundling conflict because Vite can't decide whether to:
- Bundle it with the main chunk (static import)
- Split it into a separate chunk (dynamic import)

## Why This Happens

The dynamic import was likely added to:
1. Avoid circular dependencies
2. Lazy-load the auth module only when needed
3. Reduce initial bundle size

However, since it's already statically imported elsewhere, the dynamic import doesn't provide these benefits.

## Solution: Use Static Import

**Recommendation: Convert to fully static import**

### Reasons:
1. **Small module size**: `central-auth.ts` is relatively small (~350 lines)
2. **Needed at initialization**: `useCentralAuth` needs it immediately on app load
3. **No circular dependency**: The import chain is clean
4. **Better tree-shaking**: Static imports allow better dead code elimination
5. **Simpler code**: No need for async/await around imports

### Benefits:
- ✅ Eliminates Vite warning
- ✅ Simpler code (no dynamic import)
- ✅ Better TypeScript inference
- ✅ Faster execution (no async import overhead)
- ✅ Better code splitting (Vite can optimize properly)

### Trade-offs:
- ⚠️ Slightly larger initial bundle (minimal impact for small module)
- ⚠️ Loaded even if not immediately used (but it is used at init)

## Implementation

Changed `api-client.ts` from:
```typescript
// Dynamic import (causes warning)
const { centralAuth } = await import('./central-auth');
```

To:
```typescript
// Static import (at top of file)
import { centralAuth } from './central-auth';
```

## When to Use Dynamic Imports

Dynamic imports are useful for:
- **Large dependencies** (e.g., chart libraries, code editors)
- **Route-based code splitting** (e.g., `React.lazy()` for pages)
- **Conditional features** (e.g., admin panels only for admins)
- **Breaking circular dependencies** (not needed here)

Since `central-auth` is:
- Small (~10KB)
- Needed at app initialization
- Used by multiple modules
- Not conditionally loaded

**Static import is the right choice.**

---

## Client-Side PKCE/State/Nonce Validation Explanation

### Current State
The auth gateway (onasis-core) handles PKCE (Proof Key for Code Exchange) on the server side. This is secure and follows OAuth 2.0 best practices.

### What "Client-Side Validation" Would Mean

**PKCE (Proof Key for Code Exchange):**
- Currently: Server generates and validates `code_verifier` and `code_challenge`
- Client-side addition: Client could also validate the `code_challenge` before sending it
- Benefit: Extra layer of validation, catches errors earlier
- Priority: Low (server validation is sufficient)

**State Parameter:**
- Currently: Server validates `state` parameter to prevent CSRF
- Client-side addition: Client could store `state` in memory and verify it matches on callback
- Benefit: Prevents state tampering before request reaches server
- Priority: Medium (good defense-in-depth)

**Nonce Parameter:**
- Currently: Server validates `nonce` for OpenID Connect flows
- Client-side addition: Client could generate and verify `nonce`
- Benefit: Prevents replay attacks
- Priority: Low (server handles this)

### Implementation Example

If we added client-side state validation:

```typescript
// In central-auth.ts
class CentralAuthClient {
  private stateStore = new Map<string, number>(); // state -> timestamp

  async loginWithProvider(provider: string): Promise<void> {
    // Generate state
    const state = crypto.randomUUID();
    const timestamp = Date.now();
    
    // Store in memory (not localStorage for security)
    this.stateStore.set(state, timestamp);
    
    // Clean old states (older than 10 minutes)
    this.cleanupOldStates();
    
    const authUrl = new URL(`${API_BASE_URL}/auth/login`);
    authUrl.searchParams.set('state', state);
    // ... rest of params
    
    window.location.href = authUrl.toString();
  }

  async handleAuthCallback(state: string): Promise<void> {
    // Validate state exists and is recent
    const timestamp = this.stateStore.get(state);
    if (!timestamp) {
      throw new Error('Invalid state parameter - possible CSRF attack');
    }
    
    // Check state is not too old (10 minutes max)
    if (Date.now() - timestamp > 10 * 60 * 1000) {
      this.stateStore.delete(state);
      throw new Error('State parameter expired');
    }
    
    // Remove used state (one-time use)
    this.stateStore.delete(state);
    
    // Continue with token exchange...
  }

  private cleanupOldStates(): void {
    const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
    for (const [state, timestamp] of this.stateStore.entries()) {
      if (timestamp < tenMinutesAgo) {
        this.stateStore.delete(state);
      }
    }
  }
}
```

### Why It's "Can Be Added Later"

1. **Server-side validation is sufficient**: The gateway already validates all these parameters
2. **Defense-in-depth**: Client-side validation adds an extra layer but isn't critical
3. **Complexity trade-off**: Adds code complexity for marginal security benefit
4. **Current priority**: More critical security issues (XSS, token storage) were addressed first

### When to Implement

Consider adding client-side validation if:
- You need defense-in-depth for high-security applications
- You want to catch errors before they reach the server
- You're implementing a custom OAuth flow (not using gateway)
- Security audit specifically requires it

For now, **server-side validation is sufficient** and the current implementation is secure.

