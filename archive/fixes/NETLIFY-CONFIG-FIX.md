# 🔧 Netlify Configuration Issue Fix

## Problem

Netlify is reading from the **wrong config file**:

- ❌ Currently using: `/Users/onasis/dev-hub/lan-onasis-monorepo/netlify.toml` (root)
- ✅ Should use: `/Users/onasis/dev-hub/lan-onasis-monorepo/apps/dashboard/netlify.toml`

This causes issues with:

- Wrong function paths
- Wrong build settings
- Wrong CSP headers

---

## Solution 1: Fix via Netlify UI (Recommended)

### Steps:

1. **Go to Netlify Dashboard:**

   - Open: https://app.netlify.com/projects/maas-dashboard

2. **Update Site Settings:**
   - Click on **Site settings** → **Build & deploy** → **Build settings**
3. **Set Base Directory:**

   ```
   Base directory: apps/dashboard
   ```

4. **Verify Build Settings:**

   ```
   Build command: ./netlify-build.sh
   Publish directory: apps/dashboard/dist
   Functions directory: apps/dashboard/.netlify/functions-internal
   ```

5. **Save and Redeploy**

---

## Solution 2: Use CLI with Config Flag

When deploying from CLI, specify the config file:

```bash
cd /Users/onasis/dev-hub/lan-onasis-monorepo/apps/dashboard

# Deploy with explicit config
netlify deploy --prod --config=./netlify.toml
```

Or create an alias:

```bash
# Add to ~/.zshrc
alias netlify-dashboard='cd /Users/onasis/dev-hub/lan-onasis-monorepo/apps/dashboard && netlify deploy --prod --config=./netlify.toml'

# Then use:
netlify-dashboard
```

---

## Solution 3: Move Root Config (Not Recommended)

Rename the root netlify.toml so it doesn't interfere:

```bash
cd /Users/onasis/dev-hub/lan-onasis-monorepo
mv netlify.toml netlify.toml.backup
```

---

## Verify the Fix

After applying Solution 1 or 2, deploy and check:

```bash
cd apps/dashboard
netlify deploy --prod
```

Look for this in the output:

```
❯ Config file
  /Users/onasis/dev-hub/lan-onasis-monorepo/apps/dashboard/netlify.toml  ✅
```

NOT:

```
❯ Config file
  /Users/onasis/dev-hub/lan-onasis-monorepo/netlify.toml  ❌
```

---

## Current Site Info

- **Site ID:** 64a44156-b629-4ec8-834a-349b306df073
- **Project Name:** maas-dashboard
- **Admin URL:** https://app.netlify.com/projects/maas-dashboard
- **Project URL:** https://dashboard.lanonasis.com

---

## Quick Fix Command

```bash
# Deploy with correct config
cd /Users/onasis/dev-hub/lan-onasis-monorepo/apps/dashboard
netlify deploy --prod --config=./netlify.toml
```

---

## What's Different?

### Root netlify.toml:

```toml
[build]
  command = "./netlify-build.sh"
  functions = "netlify/functions"           # ❌ Wrong path
  publish = "dist"

[build.environment]
  NODE_VERSION = "18"                       # ❌ Old version
```

### apps/dashboard/netlify.toml:

```toml
[build]
  command = "./netlify-build.sh"
  publish = "dist"

[build.environment]
  NODE_VERSION = "20"                       # ✅ Correct version

[[redirects]]
  # SPA routing rules                       # ✅ Has redirects

[[headers]]
  # Security headers + CSP                  # ✅ Has CSP config
```

---

## Recommended Action

**Use Solution 1** (Netlify UI) because:

- ✅ Permanent fix
- ✅ Works for all deployments (Git push, CLI, webhooks)
- ✅ No need to remember flags
- ✅ Team members will use correct config

Go here now: https://app.netlify.com/projects/maas-dashboard/settings/deploys
