# Role-Based Access Control (RBAC) & Fine-Grained Permissions

**Priority:** High  
**Category:** Security - Access Control  
**Labels:** `security`, `permissions`, `enterprise`

## Problem
Current access control is binary (user owns resource or doesn't). No roles, no fine-grained permissions, no delegation.

## Current State
- User-level ownership only
- No roles or permissions
- Cannot delegate access
- No read-only access
- No admin roles

## Proposed Solution

### Database Schema
```sql
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  permissions TEXT[] NOT NULL,
  is_system_role BOOLEAN DEFAULT false, -- Built-in vs custom
  organization_id UUID REFERENCES organizations(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  role_id UUID NOT NULL REFERENCES roles(id),
  scope_type VARCHAR(50) DEFAULT 'organization', -- organization, project, resource
  scope_id UUID, -- ID of org/project/resource
  granted_by UUID REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role_id, scope_type, scope_id)
);

CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(100) UNIQUE NOT NULL, -- e.g., 'memory.read', 'mcp.stripe.execute'
  description TEXT,
  category VARCHAR(50), -- memory, mcp, api_keys, billing
  is_dangerous BOOLEAN DEFAULT false -- Requires additional confirmation
);
```

### Permission Structure
```
Format: resource.action

Examples:
- memory.read
- memory.write
- memory.delete
- memory.share
- mcp.*.execute (wildcard for all MCP services)
- mcp.stripe.execute
- mcp.github.execute
- api_key.create
- api_key.revoke
- billing.view
- billing.manage
- organization.admin
```

### Built-in Roles
```sql
INSERT INTO roles (name, description, permissions, is_system_role) VALUES
('owner', 'Full access to everything', ['*'], true),
('admin', 'Manage users and settings', [
  'memory.*', 'mcp.*', 'api_key.*', 'organization.manage', 'billing.view'
], true),
('developer', 'Create and manage resources', [
  'memory.read', 'memory.write', 'mcp.*.execute', 'api_key.create'
], true),
('viewer', 'Read-only access', [
  'memory.read', 'mcp.*.view', 'api_key.view', 'billing.view'
], true);
```

### Permission Checking
```typescript
async function checkPermission(
  userId: string,
  permission: string,
  resourceId?: string
): Promise<boolean> {
  
  // Get user's roles
  const userRoles = await getUserRoles(userId, resourceId);
  
  // Get all permissions from those roles
  const allPermissions = new Set<string>();
  for (const role of userRoles) {
    role.permissions.forEach(p => allPermissions.add(p));
  }
  
  // Check for exact match or wildcard
  if (allPermissions.has('*')) return true;
  if (allPermissions.has(permission)) return true;
  
  // Check for wildcard patterns (e.g., 'mcp.*')
  const parts = permission.split('.');
  for (let i = parts.length - 1; i > 0; i--) {
    const pattern = parts.slice(0, i).join('.') + '.*';
    if (allPermissions.has(pattern)) return true;
  }
  
  return false;
}
```

### Features
1. **Role Management** - Create custom roles
2. **Permission Assignment** - Assign roles to users
3. **Scope-Based Permissions** - Permissions at org/project/resource level
4. **Time-Limited Access** - Temporary permission grants
5. **Audit Trail** - Track all permission changes
6. **Permission Inheritance** - Child resources inherit parent permissions

### UI Components
- Role management page
- Permission matrix editor
- User role assignment
- Permission audit log
- "Request Access" workflow

### API Endpoints
```
POST /api/v1/roles
GET /api/v1/roles
PUT /api/v1/roles/:id
POST /api/v1/users/:userId/roles
DELETE /api/v1/users/:userId/roles/:roleId
GET /api/v1/permissions/check?permission=memory.write
```

## Success Criteria
- [ ] Built-in roles functional
- [ ] Custom role creation works
- [ ] Permission checking enforced on all API endpoints
- [ ] Audit trail tracks changes
- [ ] Users can request access
- [ ] Granular permissions work correctly

## Enterprise Value
- Multi-tenant support
- Delegation without full access
- Compliance requirements
- Security principle of least privilege

