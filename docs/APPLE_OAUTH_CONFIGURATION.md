# 🍎 Apple OAuth Configuration Guide

## Issue: "Invalid Client Error" on Apple Sign In

### Problem Description
When users attempt to sign in with Apple, they encounter an "Invalid client error" page. This error indicates that the Apple Service ID (Client ID) is not properly configured in Apple Developer Console.

**Error Details:**
- **Client ID**: `com.lanonasis.sub-pro`
- **Redirect URI**: `https://lanonasis.supabase.co/auth/v1/callback`
- **Error**: Invalid client error from Apple

---

## Root Cause

The error occurs because:
1. The Service ID (`com.lanonasis.sub-pro`) is not registered in Apple Developer Console, OR
2. The Service ID exists but the redirect URI is not configured correctly, OR
3. The Service ID is not associated with the correct App ID

Apple's OAuth implementation requires precise configuration matching between:
- Apple Developer Console settings
- Supabase Provider configuration
- The OAuth request parameters

---

## ✅ Complete Configuration Steps

### Step 1: Apple Developer Console Setup

#### 1.1 Create an App ID (if not already created)

1. Go to [Apple Developer Console](https://developer.apple.com/account)
2. Navigate to **Certificates, Identifiers & Profiles**
3. Click **Identifiers** → **+** (Add new)
4. Select **App IDs** → **Continue**
5. Fill in the details:
   - **Description**: `LanOnasis Dashboard`
   - **Bundle ID**: `com.lanonasis.dashboard` (or your existing bundle ID)
   - **Capabilities**: Enable **Sign in with Apple**
6. Click **Continue** → **Register**

#### 1.2 Create a Services ID

1. In **Identifiers**, click **+** (Add new)
2. Select **Services IDs** → **Continue**
3. Fill in the details:
   - **Description**: `LanOnasis Dashboard OAuth`
   - **Identifier**: `com.lanonasis.sub-pro` (match the client_id in error)
4. Click **Continue** → **Register**

#### 1.3 Configure Sign in with Apple for Services ID

1. Select the newly created Services ID (`com.lanonasis.sub-pro`)
2. Check the **Sign in with Apple** checkbox
3. Click **Configure** next to Sign in with Apple
4. In the configuration dialog:
   - **Primary App ID**: Select `com.lanonasis.dashboard` (from Step 1.1)
   - **Domains and Subdomains**: Add:
     ```
     lanonasis.supabase.co
     dashboard.lanonasis.com
     ```
   - **Return URLs**: Add:
     ```
     https://lanonasis.supabase.co/auth/v1/callback
     ```
5. Click **Save** → **Continue** → **Save**

#### 1.4 Create a Key for Sign in with Apple

1. Navigate to **Keys** → **+** (Add new)
2. Fill in the details:
   - **Key Name**: `LanOnasis Sign in with Apple Key`
   - **Capabilities**: Enable **Sign in with Apple**
3. Click **Configure** next to Sign in with Apple
4. Select **Primary App ID**: `com.lanonasis.dashboard`
5. Click **Save** → **Continue** → **Register**
6. **Download the key file** (.p8 file) - you cannot download it again!
7. **Note the Key ID** (e.g., `ABC123XYZ`)

#### 1.5 Get Your Team ID

1. Go to **Membership** in Apple Developer Console
2. Find and copy your **Team ID** (e.g., `ABCD123456`)

---

### Step 2: Supabase Configuration

#### 2.1 Enable Apple Provider

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `mxtsdgkwzjzlttpotole`
3. Navigate to **Authentication** → **Providers**
4. Find **Apple** and click to enable it

#### 2.2 Configure Apple Provider Settings

Fill in the following fields:

- **Enabled**: Toggle ON
- **Client ID (Services ID)**: 
  ```
  com.lanonasis.sub-pro
  ```
- **Secret Key (Team ID)**: 
  ```
  YOUR_TEAM_ID_FROM_STEP_1.5
  ```
- **Key ID**: 
  ```
  YOUR_KEY_ID_FROM_STEP_1.4
  ```
- **Private Key**: 
  Paste the contents of the .p8 file downloaded in Step 1.4
  ```
  -----BEGIN PRIVATE KEY-----
  [Your private key content here]
  -----END PRIVATE KEY-----
  ```

#### 2.3 Verify Redirect URL

Ensure the redirect URL in Supabase matches Apple configuration:
```
https://lanonasis.supabase.co/auth/v1/callback
```

This should already be configured by Supabase automatically.

#### 2.4 Add Dashboard URLs to Allowed Redirect URLs

1. In Supabase Dashboard, go to **Authentication** → **URL Configuration**
2. Add these URLs to **Redirect URLs** (if not already present):
   ```
   https://dashboard.lanonasis.com/auth/callback
   https://dashboard.lanonasis.com
   http://localhost:5173/auth/callback
   http://localhost:5173
   ```

---

### Step 3: Verify Configuration

#### 3.1 Check Apple Developer Console

- [ ] App ID created with Sign in with Apple enabled
- [ ] Services ID created with identifier `com.lanonasis.sub-pro`
- [ ] Services ID configured with correct domain and return URL
- [ ] Key created and downloaded
- [ ] Team ID noted

#### 3.2 Check Supabase

- [ ] Apple provider enabled
- [ ] Client ID set to `com.lanonasis.sub-pro`
- [ ] Team ID, Key ID, and Private Key configured
- [ ] Redirect URLs include dashboard domains

#### 3.3 Test the Flow

1. Navigate to: `https://dashboard.lanonasis.com`
2. Click **Login** → **Sign in with Apple**
3. You should see Apple's login page (not an error page)
4. After successful login, you should be redirected back to the dashboard

---

## 🔍 Troubleshooting

### Error: "Invalid client error"

**Cause**: Service ID not configured or mismatch in configuration

**Solutions**:
1. Verify Service ID in Apple Developer Console matches `com.lanonasis.sub-pro`
2. Verify the redirect URL in Apple Developer Console is exactly: `https://lanonasis.supabase.co/auth/v1/callback`
3. Ensure Sign in with Apple is enabled for the Service ID
4. Wait 5-10 minutes after making changes (Apple can take time to propagate)

### Error: "Client authentication failed"

**Cause**: Invalid private key, key ID, or team ID

**Solutions**:
1. Verify the private key is correctly copied (including BEGIN/END markers)
2. Verify Key ID matches the one shown in Apple Developer Console
3. Verify Team ID is correct
4. Try regenerating the key if the issue persists

### Error: "Redirect URI mismatch"

**Cause**: The redirect URL doesn't match Apple's configuration

**Solutions**:
1. Verify redirect URL in Apple Developer Console: `https://lanonasis.supabase.co/auth/v1/callback`
2. Ensure there are no extra spaces or characters
3. Verify the domain `lanonasis.supabase.co` is added to Domains and Subdomains

### Apple login page doesn't appear

**Cause**: Frontend or Supabase configuration issue

**Solutions**:
1. Check browser console for errors
2. Verify Supabase Apple provider is enabled
3. Verify environment variables are set correctly
4. Clear browser cache and cookies

---

## 🎯 Configuration Summary

### Required in Apple Developer Console:
- **App ID**: `com.lanonasis.dashboard` with Sign in with Apple
- **Services ID**: `com.lanonasis.sub-pro`
- **Domain**: `lanonasis.supabase.co`, `dashboard.lanonasis.com`
- **Return URL**: `https://lanonasis.supabase.co/auth/v1/callback`
- **Key**: Created with Sign in with Apple capability

### Required in Supabase:
- **Client ID**: `com.lanonasis.sub-pro`
- **Team ID**: Your Apple Team ID
- **Key ID**: Your Apple Key ID
- **Private Key**: Content from .p8 file
- **Redirect URLs**: Include dashboard URLs

---

## 📚 Additional Resources

- [Apple Sign in with Apple Documentation](https://developer.apple.com/sign-in-with-apple/)
- [Supabase Apple OAuth Documentation](https://supabase.com/docs/guides/auth/social-login/auth-apple)
- [Apple Developer Console](https://developer.apple.com/account)

---

## ⚠️ Important Notes

1. **Private Key Security**: Never commit the .p8 private key to version control
2. **Propagation Time**: Apple configuration changes can take 5-10 minutes to propagate
3. **Service ID Uniqueness**: The Service ID must be unique across your Apple Developer account
4. **Multiple Environments**: For local development, you may need to add `http://localhost:5173/auth/callback` to the return URLs in testing configurations

---

**Last Updated**: 2025-11-18
**Configuration Owner**: LanOnasis DevOps Team
