# Security Fixes - Token Storage & Browser Errors

## Issues Fixed

### 1. ✅ XSS Vulnerability - localStorage Token Storage

**Problem**: Access and refresh tokens were stored in `localStorage`, making them vulnerable to Cross-Site Scripting (XSS) attacks. Any malicious script injected into the page could access and steal these tokens.

**Solution**: Implemented secure in-memory token storage that:
- Stores access tokens in memory only (cleared on page close/refresh)
- Uses `sessionStorage` for refresh tokens (cleared when tab closes, better than localStorage)
- Only stores non-sensitive user data in localStorage
- Automatically migrates from old localStorage-based storage

**Files Changed**:
- `src/lib/secure-token-storage.ts` - New secure storage module
- `src/lib/central-auth.ts` - Updated to use secure storage
- `src/lib/api-client.ts` - Updated to use secure storage
- `src/hooks/useCentralAuth.tsx` - Initialize secure storage on mount

### 2. ✅ Browser Error - util.promisify

**Problem**: `util.promisify` stub was throwing errors when called, causing console errors.

**Solution**: Updated the stub to:
- Return a function that rejects with a clear error message
- Add development warnings instead of throwing immediately
- Provide fallback implementations for `inspect` and `format`

**Files Changed**:
- `src/lib/stubs/util.ts` - Improved stub implementation

### 3. ⚠️ Chrome Extension Error

**Error**: `sw.js:1467 Uncaught (in promise) Object - No tab with id: 24495176`

**Analysis**: This error is from a Chrome browser extension (likely a tab management or productivity extension), not from the application code. The extension is trying to access a tab that no longer exists.

**Recommendation**: 
- This is not a bug in the application
- Users can disable problematic extensions if needed
- Consider adding error boundary to catch and suppress extension errors

## Implementation Details

### Secure Token Storage Architecture

```typescript
// Access tokens: In-memory only (cleared on page close)
secureTokenStorage.setAccessToken(token, expiresIn);

// Refresh tokens: sessionStorage (cleared when tab closes)
secureTokenStorage.setRefreshToken(token);

// User data: localStorage (non-sensitive, can persist)
secureTokenStorage.setUser(user);
```

### Token Refresh Flow

1. On page load, check for refresh token in sessionStorage
2. If refresh token exists, use it to get new access token
3. Store new access token in memory
4. Access token expires → automatically refresh using refresh token
5. If refresh fails → redirect to login

### Migration Strategy

The secure storage automatically migrates from localStorage on initialization:
- Reads existing refresh token from localStorage
- Moves it to sessionStorage
- Clears old localStorage tokens
- User data is preserved

## Security Benefits

1. **XSS Protection**: Tokens not accessible via `localStorage.getItem()` from injected scripts
2. **Automatic Cleanup**: Tokens cleared when tab/window closes
3. **Short-lived Access Tokens**: Access tokens expire quickly, reducing attack window
4. **Refresh Token Security**: Refresh tokens in sessionStorage (better than localStorage, though httpOnly cookies would be ideal)

## Future Improvements

### Recommended: httpOnly Cookies for Refresh Tokens

For maximum security, refresh tokens should be stored in httpOnly cookies set by the backend:

```typescript
// Backend should set refresh token in httpOnly cookie
// Frontend only stores access token in memory
// This prevents all JavaScript access to refresh tokens
```

**Implementation**:
1. Backend sets `Set-Cookie: refresh_token=...; HttpOnly; Secure; SameSite=Strict`
2. Frontend removes refresh token storage entirely
3. Backend refresh endpoint reads from cookie automatically
4. Frontend only manages short-lived access tokens in memory

## Testing

### Verify Secure Storage

```typescript
// In browser console after login:
console.log(localStorage.getItem('access_token')); // Should be null
console.log(secureTokenStorage.getAccessToken()); // Should return token
console.log(sessionStorage.getItem('refresh_token_fallback')); // Should return refresh token
```

### Verify Token Refresh

1. Login to dashboard
2. Wait for access token to expire (or manually clear it)
3. Make an API request
4. Should automatically refresh token without redirecting to login

## Netlify Configuration

The dashboard is deployed to Netlify with:
- **Project**: maas-dashboard
- **Site ID**: 64a44156-b629-4ec8-834a-349b306df073
- **URL**: dashboard.lanonasis.com

Configuration is in `netlify.toml` with proper:
- Build settings
- Redirect rules for SPA routing
- Security headers (CSP, HSTS, etc.)

## Chrome Extension Error

The error `No tab with id: 24495176` is from a browser extension, not the app. To suppress:

1. Add error boundary in React app
2. Filter extension errors in error logging
3. Or ignore (doesn't affect app functionality)

