# Memory Sharing & Team Collaboration

**Priority:** Medium  
**Category:** Feature - Memory System  
**Labels:** `enhancement`, `memory`, `collaboration`

## Problem
Memories are strictly user-scoped. No way to share knowledge with team members or collaborate on shared context.

## Current State
- RLS policies enforce user_id isolation
- No sharing capabilities
- No team workspaces
- Cannot collaborate on memories

## Proposed Solution

### Database Schema
```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  plan VARCHAR(50) DEFAULT 'free', -- free, team, enterprise
  max_members INTEGER DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'member', -- owner, admin, member, viewer
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

CREATE TABLE memory_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id UUID NOT NULL REFERENCES memory_entries(id) ON DELETE CASCADE,
  shared_with_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_with_org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  permission VARCHAR(20) DEFAULT 'read', -- read, write, admin
  shared_by UUID NOT NULL REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT share_target_check CHECK (
    (shared_with_user_id IS NOT NULL AND shared_with_org_id IS NULL) OR
    (shared_with_user_id IS NULL AND shared_with_org_id IS NOT NULL)
  )
);

CREATE INDEX idx_memory_shares_memory ON memory_shares(memory_id);
CREATE INDEX idx_memory_shares_user ON memory_shares(shared_with_user_id);
CREATE INDEX idx_memory_shares_org ON memory_shares(shared_with_org_id);
```

### Features
1. **Organization Workspaces** - Team-level memory repositories
2. **Granular Sharing** - Share individual memories with users/teams
3. **Permission Levels**:
   - `read` - View only
   - `write` - Edit memory
   - `admin` - Edit + share with others
4. **Share Links** - Generate time-limited share links
5. **Activity Feed** - See team memory changes
6. **Collaborative Editing** - Real-time collaboration on memories (future)

### UI Components
- "Share" button in memory detail view
- Organization switcher in navbar
- Shared memories section
- Permission management modal
- Activity feed for team changes

### API Endpoints
```
POST /api/v1/memory/:id/share
GET /api/v1/memory/shared-with-me
DELETE /api/v1/memory/shares/:shareId
POST /api/v1/organizations
GET /api/v1/organizations/:id/members
```

## Success Criteria
- [ ] Users can create organizations
- [ ] Memories can be shared with individuals or teams
- [ ] Permission levels enforced correctly
- [ ] Shared memory UI clearly indicates shared status

## Business Value
- Enable team collaboration
- Premium feature for paid plans
- Increase user engagement
- Enterprise customer requirement

