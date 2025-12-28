# dashboard Reorganization Plan

**Date**: December 28, 2025  
**Status**: Ready to Execute  
**Based on**: `MONOREPO_REORGANIZATION_PLAN.md`

---

## Overview

This plan provides a systematic approach to reorganizing the `apps/dashboard` codebase. The reorganization will:

1. ✅ Clean up the root directory (currently 57 files)
2. ✅ Group documentation by domain
3. ✅ Archive historical fix summaries
4. ✅ Organize scripts by purpose
5. ✅ Maintain canonical references for active development
6. ✅ Improve discoverability and maintainability
7. ✅ Preserve 100% functionality with easy referencing

---

## Current State Analysis

### Root Directory Issues

- **57 files** in the root directory
- Mix of active docs, historical fixes, and scripts
- Difficult to find relevant documentation
- No clear organization

### File Inventory

**Documentation** (43 MD files):
- AI_TOOLS_SYSTEM.md
- ROUTING_INTEGRATION.md
- REORGANIZATION_PLAN.md
- SECURITY_AUDIT_STATUS.md
- PR30_SAFETY_ASSESSMENT.md
- IMPLEMENTATION_SUMMARY.md
- replit.md
- SECURITY_AUDIT_FIXES.md
- API_KEY_MIGRATION_TIMELINE.md
- MEMORY_VISUALIZER_README.md
- APPLE_OAUTH_README.md
- PRODUCTION_DEPLOYMENT_FIXES.md
- API_KEY_VALIDATION_FIX.md
- ARCHITECTURE_AUTH_ROUTING.md
- API_KEY_FIX_SUMMARY.md
- DASHBOARD_README.md
- README.md
- PR_REVIEW_GUIDE.md
- DASHBOARD-ERRORS-FIX.md
- SUPABASE-CONFIGURATION.md

**Scripts** (14 files):
- fix-dashboard-errors.sh
- test-loading-fix.sh
- netlify-build.sh
- debug-circular-deps.sh
- safe-profile-check.mjs
- test-api-key.sh
- create-github-issues.sh
- create-admin-profile-correct.mjs
- inspect-profiles-table.mjs
- test-auth-automated.mjs
- eslint.config.js
- check-profiles-columns.mjs
- test-supabase-auth.mjs
- postcss.config.js

---

## Reorganization Plan

### Phase 0: Canonical References (DO NOT MOVE)

These locations are the **source of truth** and must remain in root:

| Area | Location | Contents |
|------|----------|----------|
| App Config | Root | `package.json`, `tsconfig.json`, etc. |
| Build Config | Root | `vite.config.ts`, `netlify.toml`, etc. |
| Main Docs | Root | `README.md` |

### Phase 1: New Folder Structure

```
apps/dashboard/
├── docs/                          # All documentation organized by domain
│   ├── architecture/              # Architecture documentation
│   ├── deployment/                # Deployment guides
│   ├── fixes/                     # Historical fixes
│   ├── guides/                    # User/developer guides
│   └── [domain-specific]/         # App-specific domains
│
├── scripts/                       # All scripts organized by purpose
│   ├── test/                      # Test scripts
│   ├── setup/                     # Setup scripts
│   ├── migration/                 # Migration scripts
│   ├── deployment/                # Deployment scripts
│   └── fix/                       # Fix scripts
│
├── config/                        # Non-essential configuration files
│   └── [config-type]/             # Config categories
│
├── .archive/                      # Historical archives
│   ├── fixes/                     # Completed fixes
│   └── status/                    # Status reports
│
└── [Root files]                   # Only essential files remain
    ├── README.md
    ├── package.json
    └── [essential-configs]
```

---

## File Movement Mapping

### Documentation

**Move to `docs/architecture/`**:
- ARCHITECTURE_AUTH_ROUTING.md

**Move to `docs/deployment/`**:
- PRODUCTION_DEPLOYMENT_FIXES.md
- DEPLOYMENT-RESOLUTION-SUMMARY.md

**Move to `docs/fixes/`**:
- SECURITY_AUDIT_FIXES.md
- PRODUCTION_DEPLOYMENT_FIXES.md
- API_KEY_VALIDATION_FIX.md
- API_KEY_FIX_SUMMARY.md
- DASHBOARD-ERRORS-FIX.md
- NETLIFY-CONFIG-FIX.md
- DASHBOARD_LOADING_FIX.md
- AUTHENTICATION-FIX-README.md
- APPLE_OAUTH_FIX_SUMMARY.md
- AUTH-FIX-MIGRATION.md
- SECURITY_FIXES.md

**Move to `docs/guides/`**:
- MEMORY_VISUALIZER_README.md
- APPLE_OAUTH_README.md
- DASHBOARD_README.md
- README.md
- PR_REVIEW_GUIDE.md
- AUTHENTICATION-FIX-README.md
- CENTRAL_AUTH_IMPLEMENTATION_GUIDE.md

**Move to `docs/`** (other documentation):
- AI_TOOLS_SYSTEM.md
- ROUTING_INTEGRATION.md
- REORGANIZATION_PLAN.md
- SECURITY_AUDIT_STATUS.md
- PR30_SAFETY_ASSESSMENT.md
- IMPLEMENTATION_SUMMARY.md
- replit.md
- API_KEY_MIGRATION_TIMELINE.md
- SUPABASE-CONFIGURATION.md
- PROJECT_ANALYSIS.md

### Scripts

**Move to `scripts/test/`**:
- test-loading-fix.sh
- test-api-key.sh
- test-auth-automated.mjs
- test-supabase-auth.mjs

**Move to `scripts/setup/`**:


**Move to `scripts/migration/`**:


**Move to `scripts/deployment/`**:


**Move to `scripts/fix/`**:
- fix-dashboard-errors.sh
- test-loading-fix.sh

**Move to `scripts/`** (other scripts):
- netlify-build.sh
- debug-circular-deps.sh
- safe-profile-check.mjs
- create-github-issues.sh
- create-admin-profile-correct.mjs
- inspect-profiles-table.mjs
- eslint.config.js
- check-profiles-columns.mjs
- postcss.config.js

---

## Execution Strategy

### Option 1: Automated Script (Recommended)

Create `apps/dashboard/REORGANIZE_dashboard.sh` based on this plan.

### Option 2: Manual Execution

Execute in phases following the same pattern as monorepo root.

---

## Post-Reorganization Tasks

1. Update cross-references in documentation
2. Update external references (CI/CD, READMEs)
3. Create README files in each new folder
4. Test all links
5. Verify all tests pass

---

## Success Criteria

The reorganization is successful when:

1. ✅ Root directory has ≤10 essential files
2. ✅ All documentation is in appropriate folders
3. ✅ All scripts are organized by purpose
4. ✅ README files exist in each new folder
5. ✅ No broken links in documentation
6. ✅ Git history is preserved (using `git mv`)
7. ✅ All tests pass
8. ✅ Functionality remains at 100%

---

## Timeline

**Estimated Time**: 30-45 minutes

---

## Related Documents

- `MONOREPO_REORGANIZATION_PLAN.md` - Monorepo root reorganization
- `apps/onasis-core/REORGANIZATION_GUIDE.md` - Onasis-core specific guide

---

**Ready to reorganize?** Review this plan and execute when ready! 🚀
