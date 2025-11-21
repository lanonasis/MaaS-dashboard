# Comprehensive Audit Logging for Compliance

**Priority:** High  
**Category:** Security - Compliance  
**Labels:** `security`, `compliance`, `audit`

## Problem
Limited audit trail. Cannot track who accessed what data when. Insufficient for SOC 2/ISO 27001 compliance.

## Current State
- Basic usage logging for MCP
- No access logging for memories
- No admin action logging
- No tamper-proof audit trail

## Proposed Solution

### Database Schema
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  actor_type VARCHAR(50) DEFAULT 'user', -- user, system, api_key
  actor_id VARCHAR(200), -- user_id or api_key
  
  -- Action details
  action VARCHAR(100) NOT NULL, -- created, read, updated, deleted, shared
  resource_type VARCHAR(100) NOT NULL, -- memory, api_key, mcp_service, user
  resource_id VARCHAR(200),
  
  -- Context
  ip_address INET,
  user_agent TEXT,
  session_id VARCHAR(200),
  
  -- Changes
  changes_before JSONB, -- State before action
  changes_after JSONB, -- State after action
  
  -- Metadata
  metadata JSONB, -- Additional context
  severity VARCHAR(20) DEFAULT 'info', -- debug, info, warning, critical
  
  -- Tamper-proof
  checksum VARCHAR(64), -- SHA256 of log entry
  previous_checksum VARCHAR(64), -- Chain to previous log
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action, created_at DESC);
CREATE INDEX idx_audit_logs_severity ON audit_logs(severity) WHERE severity IN ('warning', 'critical');
```

### Audit Event Types

**Memory Events:**
- `memory.created` - New memory created
- `memory.read` - Memory accessed
- `memory.updated` - Memory modified
- `memory.deleted` - Memory deleted
- `memory.shared` - Memory shared with user/org
- `memory.exported` - Memory exported

**MCP Events:**
- `mcp.service.configured` - Service credentials added
- `mcp.service.enabled` - Service activated
- `mcp.service.disabled` - Service deactivated
- `mcp.service.executed` - MCP action executed
- `mcp.credentials.rotated` - Credentials rotated

**API Key Events:**
- `api_key.created` - New API key generated
- `api_key.used` - API key authenticated request
- `api_key.revoked` - API key deleted

**User Events:**
- `user.login` - User logged in
- `user.logout` - User logged out
- `user.password_changed` - Password updated
- `user.role_changed` - User role modified

**Admin Events:**
- `admin.user_deleted` - Admin deleted user
- `admin.permission_granted` - Admin granted permission
- `admin.service_disabled` - Admin disabled service

### Tamper-Proof Chain
```typescript
function createAuditLog(event: AuditEvent): AuditLog {
  const previousLog = getLatestAuditLog();
  const previousChecksum = previousLog?.checksum || '0';
  
  const log = {
    ...event,
    previous_checksum: previousChecksum,
    created_at: new Date()
  };
  
  // Calculate checksum of this log entry
  const checksum = crypto
    .createHash('sha256')
    .update(JSON.stringify(log))
    .digest('hex');
  
  log.checksum = checksum;
  
  return log;
}

function verifyAuditChain(logs: AuditLog[]): boolean {
  for (let i = 1; i < logs.length; i++) {
    if (logs[i].previous_checksum !== logs[i - 1].checksum) {
      return false; // Chain broken - logs tampered with
    }
  }
  return true;
}
```

### Features
1. **Automatic Logging** - All sensitive actions logged
2. **Tamper-Proof Chain** - Cryptographic verification
3. **Retention Policies** - Configurable retention (7 years default)
4. **Export for Compliance** - CSV/JSON export for auditors
5. **Real-Time Alerts** - Notify on suspicious activity
6. **Audit Dashboard** - Search and filter logs

### Compliance Features
- **SOC 2 Type II** - Access logging, change tracking
- **ISO 27001** - Information security logging
- **GDPR** - Data access logging, consent tracking
- **HIPAA** - PHI access logging (if applicable)

### UI Components
- Audit log viewer with filters
- Timeline visualization
- Export audit logs button
- Suspicious activity alerts
- Chain verification status

### API Endpoints
```
GET /api/v1/audit/logs
GET /api/v1/audit/logs/resource/:type/:id
POST /api/v1/audit/export
GET /api/v1/audit/verify-chain
GET /api/v1/audit/stats
```

### Suspicious Activity Detection
```typescript
// Flag suspicious patterns
const suspiciousPatterns = [
  {
    name: 'Bulk data export',
    condition: (logs) => {
      const exports = logs.filter(l => l.action === 'memory.exported');
      return exports.length > 100; // in last hour
    }
  },
  {
    name: 'After-hours access',
    condition: (logs) => {
      const hour = new Date().getHours();
      return hour < 6 || hour > 22; // Outside 6am-10pm
    }
  },
  {
    name: 'Geographic anomaly',
    condition: (logs) => {
      // IP address from unusual country
    }
  }
];
```

## Success Criteria
- [ ] All data access logged
- [ ] Audit chain verifiable
- [ ] Logs retained for 7 years
- [ ] Export to CSV functional
- [ ] Suspicious activity alerts working
- [ ] Compliance audit passes

## Compliance Benefits
- SOC 2 audit readiness
- ISO 27001 certification
- GDPR compliance
- Legal discovery support

