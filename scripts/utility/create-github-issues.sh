#!/bin/bash

# LanOnasis Dashboard - Comprehensive Issues Generator
# This script creates markdown files for GitHub issues
# Run: bash create-github-issues.sh
# Then manually create issues from the generated markdown files

ISSUES_DIR="github-issues"
mkdir -p "$ISSUES_DIR"

echo "🔍 Generating comprehensive GitHub issues for LanOnasis Dashboard..."
echo "📁 Issues will be saved to: $ISSUES_DIR/"

# ============================================================================
# MEMORY & CONTEXT ASSISTANT ISSUES
# ============================================================================

cat > "$ISSUES_DIR/001-memory-relationship-graph.md" << 'EOF'
# Memory Relationship Graph & Linking

**Priority:** High  
**Category:** Feature - Memory System  
**Labels:** `enhancement`, `memory`, `ux`

## Problem
Currently, memories exist in isolation with no way to link related memories together. Users cannot visualize connections between different pieces of knowledge or context.

## Current State
- Memories are standalone entities
- No relationship tracking between memories
- No way to link related context
- Cannot visualize memory networks

## Proposed Solution
Implement a memory relationship system:

### Database Schema
```sql
CREATE TABLE memory_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_memory_id UUID NOT NULL REFERENCES memory_entries(id) ON DELETE CASCADE,
  target_memory_id UUID NOT NULL REFERENCES memory_entries(id) ON DELETE CASCADE,
  relationship_type VARCHAR(50) NOT NULL, -- 'related', 'derived-from', 'references', 'depends-on'
  strength DECIMAL(3,2) DEFAULT 1.0, -- 0.0 to 1.0
  created_by_user BOOLEAN DEFAULT true, -- false if AI-generated
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(source_memory_id, target_memory_id, relationship_type)
);

CREATE INDEX idx_memory_rel_source ON memory_relationships(source_memory_id);
CREATE INDEX idx_memory_rel_target ON memory_relationships(target_memory_id);
```

### Features
1. **Manual Linking** - Users can link related memories
2. **AI-Suggested Links** - Automatically suggest related memories based on semantic similarity
3. **Graph Visualization** - Interactive graph showing memory connections
4. **Relationship Types**:
   - `related` - General relationship
   - `derived-from` - Memory created based on another
   - `references` - Explicitly references another memory
   - `depends-on` - Requires another memory for context
   - `contradicts` - Conflicts with another memory
   - `supersedes` - Replaces outdated memory

### UI Components
- Memory graph visualization (using D3.js or React Flow)
- "Related Memories" sidebar in memory detail view
- Quick-link action in memory cards
- Relationship strength indicator
- Bidirectional navigation

### API Endpoints
```
POST /api/v1/memory/:id/relationships
GET /api/v1/memory/:id/relationships
DELETE /api/v1/memory/relationships/:relationshipId
GET /api/v1/memory/:id/graph?depth=2
```

## Success Criteria
- [ ] Users can link memories together
- [ ] Graph visualization renders correctly
- [ ] AI suggests relevant memory links
- [ ] Performance: Graph queries < 200ms for 1000+ memories

## Business Value
- Improved context retrieval
- Better knowledge organization
- Enhanced memory discovery
- Foundation for knowledge graphs

EOF

cat > "$ISSUES_DIR/002-memory-version-history.md" << 'EOF'
# Memory Version History & Change Tracking

**Priority:** High  
**Category:** Feature - Memory System  
**Labels:** `enhancement`, `memory`, `compliance`

## Problem
No tracking of memory changes over time. Cannot see who modified a memory, what changed, or revert to previous versions.

## Current State
- Only `created_at` and `updated_at` timestamps
- No change history
- Cannot revert changes
- No audit trail for compliance

## Proposed Solution

### Database Schema
```sql
CREATE TABLE memory_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id UUID NOT NULL REFERENCES memory_entries(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  content TEXT NOT NULL,
  type TEXT,
  tags JSONB,
  metadata JSONB,
  changed_by UUID REFERENCES auth.users(id),
  change_summary TEXT, -- Optional user description
  changes_diff JSONB, -- Structured diff
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(memory_id, version_number)
);

CREATE INDEX idx_memory_versions_memory ON memory_versions(memory_id, version_number DESC);
CREATE INDEX idx_memory_versions_user ON memory_versions(changed_by);
```

### Features
1. **Automatic Versioning** - Every update creates a new version
2. **Version Comparison** - Diff view between versions
3. **Version Restore** - Revert to any previous version
4. **Change Attribution** - Track who made each change
5. **Version Timeline** - Visual timeline of all changes
6. **Change Summaries** - Optional user-provided change notes

### UI Components
- "History" button in memory detail view
- Version timeline with diff preview
- Side-by-side version comparison
- Restore version confirmation dialog
- Change attribution badges

### API Endpoints
```
GET /api/v1/memory/:id/versions
GET /api/v1/memory/:id/versions/:versionNumber
POST /api/v1/memory/:id/revert/:versionNumber
GET /api/v1/memory/:id/diff?from=v1&to=v2
```

### Implementation Notes
- Use `jsondiffpatch` for structured diffs
- Store only diffs (not full content) for space efficiency
- Configurable retention (e.g., keep versions for 90 days)
- Option to "squash" old versions to save space

## Success Criteria
- [ ] Every memory update creates a version
- [ ] Users can view version history
- [ ] Users can compare any two versions
- [ ] Users can restore previous versions
- [ ] Version storage optimized (< 10% storage overhead)

## Compliance Benefits
- SOC 2 audit trails
- GDPR data lineage
- Regulatory compliance for sensitive data

EOF

cat > "$ISSUES_DIR/003-memory-sharing-collaboration.md" << 'EOF'
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

EOF

cat > "$ISSUES_DIR/004-memory-ttl-expiration.md" << 'EOF'
# Memory TTL, Expiration & Auto-Archive

**Priority:** Low  
**Category:** Feature - Memory System  
**Labels:** `enhancement`, `memory`, `cleanup`

## Problem
Old memories accumulate indefinitely. No way to auto-archive or delete stale context. No temporary memory support.

## Current State
- Memories never expire
- No archiving mechanism
- No automatic cleanup
- Database bloat over time

## Proposed Solution

### Database Schema Updates
```sql
ALTER TABLE memory_entries 
  ADD COLUMN expires_at TIMESTAMPTZ,
  ADD COLUMN importance_score DECIMAL(3,2) DEFAULT 0.5, -- 0.0 to 1.0
  ADD COLUMN auto_archive_after_days INTEGER,
  ADD COLUMN archived_at TIMESTAMPTZ,
  ADD COLUMN archive_reason TEXT;

CREATE INDEX idx_memory_expires ON memory_entries(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_memory_archived ON memory_entries(archived_at) WHERE archived_at IS NOT NULL;
```

### Features
1. **TTL Support** - Set expiration time for temporary memories
2. **Importance Scoring** - AI-based importance calculation
3. **Auto-Archive Rules**:
   - Archive memories not accessed in 90 days
   - Archive low-importance memories after 180 days
   - User-defined archive policies
4. **Manual Archive** - Archive memories manually
5. **Archive Search** - Search through archived memories
6. **Restore from Archive** - Unarchive when needed

### Background Jobs
```typescript
// Scheduled job (runs daily)
async function expireOldMemories() {
  // Delete expired memories
  await db.deleteFrom('memory_entries')
    .where('expires_at', '<', new Date())
    .execute();
    
  // Archive inactive memories
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  await db.update('memory_entries')
    .set({ 
      archived_at: new Date(),
      archive_reason: 'Auto-archived due to inactivity'
    })
    .where('last_accessed_at', '<', ninetyDaysAgo)
    .where('importance_score', '<', 0.3)
    .whereNull('archived_at')
    .execute();
}
```

### UI Components
- "Set Expiration" option in memory creation/edit
- "Archive" action in memory menu
- Archived memories section
- Archive search with filters
- Bulk archive/restore actions

### API Endpoints
```
POST /api/v1/memory/:id/archive
POST /api/v1/memory/:id/restore
GET /api/v1/memory/archived
POST /api/v1/memory/bulk-archive
```

## Success Criteria
- [ ] Memories can have TTL set
- [ ] Expired memories auto-deleted daily
- [ ] Inactive memories auto-archived
- [ ] Archive search functional
- [ ] Restore from archive works

## Storage Benefits
- Reduce active database size
- Improve query performance
- Cost savings on storage
- Better UX (less clutter)

EOF

cat > "$ISSUES_DIR/005-memory-bulk-operations.md" << 'EOF'
# Memory Bulk Operations & Import/Export

**Priority:** Medium  
**Category:** Feature - Memory System  
**Labels:** `enhancement`, `memory`, `import-export`

## Problem
No way to import/export memories in bulk. Cannot manage multiple memories at once. Migration from other systems difficult.

## Current State
- One memory at a time operations
- No import/export functionality
- Cannot bulk delete or update
- No migration tools

## Proposed Solution

### Features
1. **Bulk Selection** - Select multiple memories with checkboxes
2. **Bulk Actions**:
   - Delete selected memories
   - Tag selected memories
   - Archive/unarchive selected
   - Change type for selected
   - Export selected to JSON/CSV
3. **Import Formats**:
   - JSON (structured memories)
   - CSV (simple list with metadata)
   - Markdown (each file becomes a memory)
   - Plain text (auto-chunk into memories)
4. **Export Formats**:
   - JSON (full fidelity with metadata)
   - CSV (simple export for spreadsheets)
   - Markdown (one file per memory)
   - PDF (formatted report)

### Import Schema (JSON)
```json
{
  "memories": [
    {
      "content": "Memory content here",
      "type": "knowledge",
      "tags": ["tag1", "tag2"],
      "metadata": {...},
      "importance": 0.8
    }
  ]
}
```

### UI Components
- Checkbox selection in memory list
- "Bulk Actions" dropdown menu
- Import modal with file upload
- Export modal with format selection
- Progress indicator for bulk operations
- Validation feedback for imports

### API Endpoints
```
POST /api/v1/memory/bulk-delete
POST /api/v1/memory/bulk-update
POST /api/v1/memory/bulk-tag
POST /api/v1/memory/import
GET /api/v1/memory/export?format=json&ids=...
```

### Import Validation
- Validate JSON schema
- Check for duplicate memories (content similarity)
- Validate tags and types
- Size limits (max 1000 memories per import)
- Preview before import

## Success Criteria
- [ ] Users can select multiple memories
- [ ] Bulk delete works correctly
- [ ] Bulk tag addition works
- [ ] Import JSON/CSV functional
- [ ] Export to multiple formats works
- [ ] Import validation prevents bad data

## Use Cases
- Migrate from other knowledge bases
- Backup and restore memories
- Share memory collections
- Bulk management of old memories

EOF

# ============================================================================
# MCP ROUTER PLATFORM ISSUES
# ============================================================================

cat > "$ISSUES_DIR/006-mcp-error-handling-retry.md" << 'EOF'
# MCP Error Handling, Retry Logic & Circuit Breakers

**Priority:** Critical  
**Category:** Infrastructure - MCP Router  
**Labels:** `bug`, `reliability`, `mcp`

## Problem
No robust error handling for MCP service failures. No retry logic or circuit breakers. Cascading failures possible.

## Current State
- Basic try/catch error handling
- No automatic retries
- No circuit breakers
- Single points of failure

## Proposed Solution

### Error Types
```typescript
enum MCPErrorType {
  NETWORK_ERROR = 'network_error',
  TIMEOUT = 'timeout',
  AUTH_ERROR = 'auth_error',
  RATE_LIMIT = 'rate_limit',
  SERVICE_UNAVAILABLE = 'service_unavailable',
  INVALID_CREDENTIALS = 'invalid_credentials',
  MCP_PROCESS_CRASH = 'mcp_process_crash'
}
```

### Retry Strategy
```typescript
const retryConfig = {
  maxRetries: 3,
  backoffMultiplier: 2, // 1s, 2s, 4s
  retryableErrors: [
    MCPErrorType.NETWORK_ERROR,
    MCPErrorType.TIMEOUT,
    MCPErrorType.SERVICE_UNAVAILABLE
  ],
  nonRetryableErrors: [
    MCPErrorType.INVALID_CREDENTIALS,
    MCPErrorType.AUTH_ERROR
  ]
};
```

### Circuit Breaker Implementation
```typescript
class MCPCircuitBreaker {
  private failureCount = 0;
  private lastFailureTime?: Date;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  
  constructor(
    private threshold = 5, // Open after 5 failures
    private timeout = 60000, // Try again after 60s
    private successThreshold = 2 // Close after 2 successes
  ) {}
  
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime! > this.timeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }
    
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private onSuccess() {
    this.failureCount = 0;
    if (this.state === 'HALF_OPEN') {
      this.state = 'CLOSED';
    }
  }
  
  private onFailure() {
    this.failureCount++;
    this.lastFailureTime = new Date();
    if (this.failureCount >= this.threshold) {
      this.state = 'OPEN';
    }
  }
}
```

### Features
1. **Exponential Backoff** - Smart retry timing
2. **Circuit Breakers** - Per-service failure protection
3. **Error Classification** - Distinguish retryable vs fatal errors
4. **Fallback Strategies**:
   - Return cached response
   - Use alternative service
   - Graceful degradation
5. **Error Monitoring** - Track error patterns
6. **Alert System** - Notify on repeated failures

### Database Schema for Monitoring
```sql
CREATE TABLE mcp_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_key VARCHAR(100) NOT NULL,
  error_type VARCHAR(50) NOT NULL,
  error_message TEXT,
  stack_trace TEXT,
  retry_count INTEGER DEFAULT 0,
  user_id UUID,
  api_key_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_mcp_errors_service ON mcp_errors(service_key, created_at DESC);
CREATE INDEX idx_mcp_errors_type ON mcp_errors(error_type);
```

## Success Criteria
- [ ] Network errors retried automatically
- [ ] Circuit breakers prevent cascading failures
- [ ] Error types properly classified
- [ ] Users see helpful error messages
- [ ] Error dashboard shows patterns
- [ ] Alert system notifies ops team

## Testing
- Simulate network failures
- Test retry logic with mock failures
- Verify circuit breaker state transitions
- Load test with high error rates

EOF

cat > "$ISSUES_DIR/007-mcp-observability-metrics.md" << 'EOF'
# MCP Observability: Metrics, Tracing & Health Checks

**Priority:** High  
**Category:** Infrastructure - MCP Router  
**Labels:** `enhancement`, `observability`, `mcp`

## Problem
No visibility into MCP service performance. Cannot debug slow requests. No health monitoring.

## Current State
- Basic usage logs only
- No performance metrics
- No distributed tracing
- No health checks

## Proposed Solution

### Metrics to Track
```typescript
interface MCPMetrics {
  // Request metrics
  requestCount: number;
  requestRate: number; // requests/sec
  errorRate: number;
  
  // Performance metrics
  avgResponseTime: number;
  p50ResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  
  // Resource metrics
  activeProcesses: number;
  memoryUsage: number;
  cpuUsage: number;
  
  // Business metrics
  costPerRequest: number;
  totalCost: number;
  quotaUsage: number;
}
```

### Health Check Endpoint
```
GET /api/v1/mcp/health

Response:
{
  "status": "healthy",
  "services": {
    "stripe": {
      "status": "healthy",
      "last_check": "2025-11-20T18:00:00Z",
      "response_time_ms": 45,
      "error_rate": 0.02
    },
    "github": {
      "status": "degraded",
      "last_check": "2025-11-20T18:00:00Z",
      "response_time_ms": 850,
      "error_rate": 0.15,
      "message": "High response time detected"
    }
  },
  "overall_health": 85
}
```

### Distributed Tracing
```typescript
// Use OpenTelemetry
import { trace } from '@opentelemetry/api';

async function routeMCPRequest(serviceKey: string, action: string) {
  const tracer = trace.getTracer('mcp-router');
  const span = tracer.startSpan('mcp.request', {
    attributes: {
      'mcp.service': serviceKey,
      'mcp.action': action
    }
  });
  
  try {
    // 1. Validate API key
    const validateSpan = tracer.startSpan('mcp.validate_key', { parent: span });
    await validateAPIKey();
    validateSpan.end();
    
    // 2. Decrypt credentials
    const decryptSpan = tracer.startSpan('mcp.decrypt_creds', { parent: span });
    const creds = await decryptCredentials();
    decryptSpan.end();
    
    // 3. Call MCP service
    const callSpan = tracer.startSpan('mcp.call_service', { parent: span });
    const result = await callMCPService(serviceKey, action);
    callSpan.end();
    
    return result;
  } finally {
    span.end();
  }
}
```

### Dashboard Components
1. **Service Health Dashboard**
   - Real-time status indicators
   - Response time charts
   - Error rate graphs
   - Uptime percentage
   
2. **Performance Dashboard**
   - Request latency histogram
   - Throughput charts
   - Error breakdown by type
   - Top slowest endpoints
   
3. **Cost Dashboard**
   - Cost per service
   - Cost trends over time
   - Quota usage
   - Budget alerts

### Integration
- **Prometheus** - Metrics collection
- **Grafana** - Visualization
- **Jaeger/Tempo** - Distributed tracing
- **Sentry** - Error tracking
- **PagerDuty** - Alerting

### API Endpoints
```
GET /api/v1/mcp/health
GET /api/v1/mcp/metrics
GET /api/v1/mcp/metrics/:serviceKey
GET /api/v1/mcp/traces/:traceId
```

## Success Criteria
- [ ] Real-time health dashboard functional
- [ ] Performance metrics tracked
- [ ] Distributed tracing working
- [ ] Alerts configured for anomalies
- [ ] P95 latency < 500ms for 95% of requests

## Business Value
- Proactive issue detection
- Faster debugging
- Better capacity planning
- SLA monitoring

EOF

cat > "$ISSUES_DIR/008-mcp-cost-tracking-billing.md" << 'EOF'
# MCP Cost Tracking & Usage-Based Billing

**Priority:** Medium  
**Category:** Feature - MCP Router  
**Labels:** `enhancement`, `billing`, `mcp`

## Problem
No cost tracking for MCP service usage. Cannot bill users based on actual consumption. No budget controls.

## Current State
- Usage logged but not costed
- No per-service cost tracking
- No billing integration
- No budget limits

## Proposed Solution

### Database Schema
```sql
CREATE TABLE mcp_service_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_key VARCHAR(100) UNIQUE NOT NULL,
  pricing_model VARCHAR(50) NOT NULL, -- 'per_request', 'per_token', 'per_minute'
  base_cost_cents INTEGER NOT NULL,
  variable_cost_cents INTEGER, -- For tiered pricing
  tier_threshold INTEGER, -- Requests before tier change
  currency VARCHAR(3) DEFAULT 'USD',
  effective_from TIMESTAMPTZ NOT NULL,
  effective_to TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE mcp_cost_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usage_log_id UUID NOT NULL REFERENCES mcp_usage_logs(id),
  user_id UUID NOT NULL,
  service_key VARCHAR(100) NOT NULL,
  cost_cents INTEGER NOT NULL,
  tokens_used INTEGER,
  compute_time_ms INTEGER,
  billing_period DATE NOT NULL, -- For monthly aggregation
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  monthly_budget_cents INTEGER,
  current_month_spend_cents INTEGER DEFAULT 0,
  alert_threshold_percent INTEGER DEFAULT 80,
  auto_disable_on_exceed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cost_entries_user_period ON mcp_cost_entries(user_id, billing_period);
CREATE INDEX idx_cost_entries_service ON mcp_cost_entries(service_key, billing_period);
```

### Cost Calculation Logic
```typescript
async function calculateCost(
  serviceKey: string,
  request: MCPRequest,
  response: MCPResponse
): Promise<number> {
  
  const pricing = await getPricing(serviceKey);
  
  switch (pricing.pricing_model) {
    case 'per_request':
      return pricing.base_cost_cents;
      
    case 'per_token':
      const tokens = estimateTokens(request, response);
      return Math.ceil(tokens / 1000) * pricing.base_cost_cents;
      
    case 'per_minute':
      const minutes = Math.ceil(response.duration_ms / 60000);
      return minutes * pricing.base_cost_cents;
      
    case 'tiered':
      const monthlyUsage = await getMonthlyUsage(serviceKey);
      if (monthlyUsage > pricing.tier_threshold) {
        return pricing.variable_cost_cents;
      }
      return pricing.base_cost_cents;
  }
}
```

### Features
1. **Cost Attribution** - Every MCP call tagged with cost
2. **Budget Controls** - Set monthly spending limits
3. **Usage Alerts**:
   - 80% budget threshold warning
   - 100% budget auto-disable (optional)
   - Anomaly detection (sudden spikes)
4. **Cost Dashboard**:
   - Current month spend
   - Cost breakdown by service
   - Cost trends over time
   - Projected monthly cost
5. **Billing Reports**:
   - Monthly invoices
   - Detailed usage breakdown
   - CSV export for accounting

### UI Components
- Budget setting modal
- Cost dashboard with charts
- Real-time spend counter
- Budget alert banner
- Billing history page

### API Endpoints
```
GET /api/v1/mcp/costs/current-month
GET /api/v1/mcp/costs/breakdown?period=2025-11
POST /api/v1/mcp/budgets
GET /api/v1/mcp/invoices/:month
```

### Sample Pricing (Reference)
```
Stripe MCP: $0.01 per request
GitHub MCP: $0.005 per request
OpenAI MCP: $0.02 per 1K tokens
Perplexity MCP: $0.05 per search
```

## Success Criteria
- [ ] All MCP calls have cost tracked
- [ ] Users can set monthly budgets
- [ ] Alerts trigger at 80% budget usage
- [ ] Cost dashboard shows accurate data
- [ ] Monthly invoices generated automatically

## Business Value
- Revenue tracking per feature
- Usage-based pricing model
- Cost transparency for users
- Prevent bill shock

EOF

cat > "$ISSUES_DIR/009-mcp-credential-rotation.md" << 'EOF'
# Automatic MCP Credential Rotation

**Priority:** Medium  
**Category:** Security - MCP Router  
**Labels:** `security`, `mcp`, `automation`

## Problem
Credentials stored indefinitely with no rotation. Security best practice requires periodic key rotation.

## Current State
- Manual credential updates only
- No rotation reminders
- No rotation enforcement
- No rotation audit trail

## Proposed Solution

### Database Schema
```sql
ALTER TABLE user_mcp_services
  ADD COLUMN last_rotated_at TIMESTAMPTZ,
  ADD COLUMN rotation_frequency_days INTEGER DEFAULT 90,
  ADD COLUMN auto_rotate BOOLEAN DEFAULT false,
  ADD COLUMN rotation_warning_sent BOOLEAN DEFAULT false;

CREATE TABLE credential_rotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES user_mcp_services(id),
  rotation_type VARCHAR(50) NOT NULL, -- 'manual', 'auto', 'forced'
  previous_key_hash VARCHAR(64), -- SHA256 of old key
  rotated_by UUID REFERENCES auth.users(id),
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Rotation Strategies

**1. Manual Rotation (Current)**
- User updates credentials via UI
- Old credentials immediately invalid

**2. Automatic Rotation (New)**
```typescript
async function autoRotateCredentials(serviceKey: string) {
  // Only for services that support programmatic rotation
  const supportedServices = ['stripe', 'github', 'aws'];
  
  if (!supportedServices.includes(serviceKey)) {
    // Notify user to manually rotate
    await sendRotationReminder(serviceKey);
    return;
  }
  
  // Call service API to generate new credentials
  const newCreds = await callServiceRotationAPI(serviceKey);
  
  // Update stored credentials
  await updateServiceCredentials(serviceKey, newCreds);
  
  // Log rotation
  await logRotation(serviceKey, 'auto');
}
```

**3. Grace Period Rotation**
- New credentials generated
- Old credentials valid for 24 hours
- Gradual migration to prevent downtime

### Features
1. **Rotation Reminders** - Email users 7 days before rotation needed
2. **Auto-Rotation** - For supported services, rotate automatically
3. **Rotation Dashboard** - See which credentials need rotation
4. **Rotation History** - Audit trail of all rotations
5. **Force Rotation** - Admin can force immediate rotation
6. **Rotation Policies**:
   - 30 days for high-security services (payment, financial)
   - 90 days for standard services
   - 180 days for low-risk services

### UI Components
- "Rotate Credentials" button in service config
- Rotation status indicator (green/yellow/red)
- Rotation history table
- Auto-rotation toggle
- Email notification preferences

### Background Jobs
```typescript
// Daily cron job
async function checkRotationNeeded() {
  const services = await db
    .select()
    .from('user_mcp_services')
    .where('last_rotated_at', '<', 
      new Date(Date.now() - rotation_frequency_days * 24 * 60 * 60 * 1000)
    );
  
  for (const service of services) {
    if (service.auto_rotate) {
      await autoRotateCredentials(service.service_key);
    } else {
      await sendRotationReminder(service.user_id, service.service_key);
    }
  }
}
```

### API Endpoints
```
POST /api/v1/mcp/services/:serviceKey/rotate
GET /api/v1/mcp/services/rotation-status
GET /api/v1/mcp/services/:serviceKey/rotation-history
POST /api/v1/mcp/services/:serviceKey/auto-rotate/enable
```

## Success Criteria
- [ ] Users receive rotation reminders
- [ ] Auto-rotation works for supported services
- [ ] Rotation history tracked
- [ ] Zero-downtime rotation for grace period mode
- [ ] Compliance audit requirements met

## Security Benefits
- Reduced credential theft impact
- Compliance with security policies
- Automatic security hygiene
- Audit trail for compliance

EOF

cat > "$ISSUES_DIR/010-mcp-webhooks-async.md" << 'EOF'
# MCP Webhook Support & Async Callbacks

**Priority:** Low  
**Category:** Feature - MCP Router  
**Labels:** `enhancement`, `mcp`, `async`

## Problem
All MCP requests are synchronous. Long-running operations block connections. No way to get async callbacks.

## Current State
- Synchronous request/response only
- Long operations timeout
- No webhook support
- No event streaming

## Proposed Solution

### Database Schema
```sql
CREATE TABLE webhook_endpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  url TEXT NOT NULL,
  secret VARCHAR(64) NOT NULL, -- For HMAC signing
  events TEXT[] NOT NULL, -- ['mcp.*.completed', 'mcp.stripe.*']
  is_active BOOLEAN DEFAULT true,
  retry_config JSONB DEFAULT '{"max_retries": 3, "backoff": "exponential"}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL REFERENCES webhook_endpoints(id),
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  status VARCHAR(50) NOT NULL, -- pending, delivered, failed
  status_code INTEGER,
  response_body TEXT,
  attempt_count INTEGER DEFAULT 0,
  next_retry_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_webhook_deliveries_status ON webhook_deliveries(status, next_retry_at);
```

### Async MCP Request Flow
```
1. Client makes async MCP request:
   POST /api/v1/mcp/stripe/create-charge?async=true&webhook_url=...
   
2. Server immediately returns:
   {
     "request_id": "req_abc123",
     "status": "processing",
     "estimated_completion": "2025-11-20T18:05:00Z"
   }
   
3. Server processes request in background

4. On completion, server sends webhook:
   POST https://client-webhook.com/mcp-callback
   Headers:
     X-MCP-Signature: sha256=abc123...
     X-MCP-Event: mcp.stripe.charge.completed
   Body:
     {
       "request_id": "req_abc123",
       "status": "completed",
       "result": {...},
       "completed_at": "2025-11-20T18:04:32Z"
     }
```

### Webhook Signature
```typescript
function generateWebhookSignature(payload: object, secret: string): string {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(JSON.stringify(payload));
  return `sha256=${hmac.digest('hex')}`;
}

function verifyWebhookSignature(
  payload: object,
  signature: string,
  secret: string
): boolean {
  const expected = generateWebhookSignature(payload, secret);
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}
```

### Event Types
```
mcp.*.started          - MCP request started processing
mcp.*.completed        - MCP request completed successfully
mcp.*.failed           - MCP request failed
mcp.*.timeout          - MCP request timed out
mcp.stripe.*           - All Stripe MCP events
mcp.github.*           - All GitHub MCP events
mcp.service.enabled    - Service was enabled
mcp.service.disabled   - Service was disabled
mcp.credential.rotated - Credentials were rotated
```

### Features
1. **Webhook Registration** - Register webhook endpoints
2. **Event Filtering** - Subscribe to specific events
3. **Signature Verification** - HMAC-SHA256 signing
4. **Retry Logic** - Exponential backoff for failed deliveries
5. **Webhook Logs** - View delivery history and debug
6. **Test Webhooks** - Send test events to verify setup

### UI Components
- Webhook management page
- "Add Webhook" modal
- Webhook delivery logs
- Test webhook button
- Event type selector

### API Endpoints
```
POST /api/v1/webhooks
GET /api/v1/webhooks
DELETE /api/v1/webhooks/:id
POST /api/v1/webhooks/:id/test
GET /api/v1/webhooks/:id/deliveries
POST /api/v1/mcp/:service/:action?async=true
GET /api/v1/mcp/requests/:requestId
```

## Success Criteria
- [ ] Users can register webhook endpoints
- [ ] Async MCP requests work correctly
- [ ] Webhooks delivered reliably (>99%)
- [ ] Signature verification prevents tampering
- [ ] Retry logic handles transient failures

## Use Cases
- Long-running document processing
- Async payment processing
- Background data synchronization
- Event-driven workflows

EOF

# ============================================================================
# SECURITY & COMPLIANCE ISSUES
# ============================================================================

cat > "$ISSUES_DIR/011-rbac-fine-grained-permissions.md" << 'EOF'
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

EOF

cat > "$ISSUES_DIR/012-audit-logging-compliance.md" << 'EOF'
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

EOF

# ============================================================================
# DEVELOPER EXPERIENCE & TESTING
# ============================================================================

cat > "$ISSUES_DIR/013-mcp-testing-framework.md" << 'EOF'
# MCP Integration Testing Framework & Sandbox

**Priority:** Medium  
**Category:** Developer Experience - Testing  
**Labels:** `testing`, `mcp`, `devex`

## Problem
No way to test MCP integrations before going live. Cannot validate credentials or debug issues safely.

## Current State
- Test in production only
- No sandbox environment
- No mock MCP services
- Difficult to debug

## Proposed Solution

### Test Modes

**1. Sandbox Mode**
- Use test credentials
- Call actual service test APIs
- Limited quota
- No real charges/side effects

**2. Mock Mode**
- Simulated MCP responses
- No external API calls
- Configurable responses
- Fast and deterministic

**3. Replay Mode**
- Record real requests
- Replay for testing
- Validate changes don't break

### Database Schema
```sql
CREATE TABLE mcp_test_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_key VARCHAR(100) NOT NULL,
  scenario_name VARCHAR(200) NOT NULL,
  description TEXT,
  mock_request JSONB NOT NULL,
  mock_response JSONB NOT NULL,
  response_delay_ms INTEGER DEFAULT 0,
  should_fail BOOLEAN DEFAULT false,
  error_type VARCHAR(50),
  is_public BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE mcp_test_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  service_key VARCHAR(100) NOT NULL,
  test_mode VARCHAR(50) NOT NULL, -- sandbox, mock, replay
  total_tests INTEGER,
  passed_tests INTEGER,
  failed_tests INTEGER,
  duration_ms INTEGER,
  results JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Mock Server Implementation
```typescript
class MCPMockServer {
  private scenarios: Map<string, TestScenario> = new Map();
  
  registerScenario(serviceKey: string, scenario: TestScenario) {
    this.scenarios.set(`${serviceKey}:${scenario.name}`, scenario);
  }
  
  async handleRequest(serviceKey: string, action: string, payload: any) {
    const scenario = this.scenarios.get(`${serviceKey}:${action}`);
    
    if (!scenario) {
      return { error: 'No mock scenario found for this action' };
    }
    
    // Simulate delay
    await sleep(scenario.response_delay_ms);
    
    // Simulate failure
    if (scenario.should_fail) {
      throw new Error(scenario.error_type || 'Mock failure');
    }
    
    // Return mock response
    return scenario.mock_response;
  }
}
```

### Pre-Built Test Scenarios

**Stripe Test Scenarios:**
```json
{
  "name": "successful_charge",
  "mock_request": {
    "amount": 1000,
    "currency": "usd",
    "source": "tok_visa"
  },
  "mock_response": {
    "id": "ch_test_123",
    "status": "succeeded",
    "amount": 1000
  }
},
{
  "name": "declined_card",
  "mock_request": {
    "amount": 1000,
    "source": "tok_chargeDeclined"
  },
  "should_fail": true,
  "error_type": "card_declined"
}
```

**GitHub Test Scenarios:**
```json
{
  "name": "create_issue_success",
  "mock_request": {
    "title": "Test issue",
    "body": "Issue description"
  },
  "mock_response": {
    "id": 123,
    "number": 456,
    "state": "open",
    "html_url": "https://github.com/..."
  }
}
```

### Features
1. **Test Credential Validation** - Verify credentials work
2. **Interactive Testing** - Test MCP calls from dashboard
3. **Test Scenario Library** - Pre-built common scenarios
4. **Custom Scenarios** - Create your own test cases
5. **Automated Testing** - Run test suites before deploy
6. **Test Reports** - See pass/fail rates

### UI Components
- "Test Mode" toggle in MCP service config
- Test scenario selector
- Test request builder (like Postman)
- Test response viewer
- Test history table
- Test report dashboard

### API Endpoints
```
POST /api/v1/mcp/test/:serviceKey/:action
GET /api/v1/mcp/test/scenarios/:serviceKey
POST /api/v1/mcp/test/scenarios
GET /api/v1/mcp/test/runs
POST /api/v1/mcp/test/validate-credentials
```

### CLI Tool
```bash
# Test MCP service locally
lanonasis-cli mcp test stripe create-charge \
  --scenario successful_charge \
  --mode mock

# Validate credentials
lanonasis-cli mcp validate github --credentials ./github-creds.json

# Run test suite
lanonasis-cli mcp test-suite --service stripe --report html
```

## Success Criteria
- [ ] Users can test MCP calls in sandbox mode
- [ ] Mock mode works without external calls
- [ ] Pre-built scenarios available for common services
- [ ] Test reports show clear pass/fail
- [ ] Credential validation works

## Developer Benefits
- Faster development cycle
- Catch issues before production
- Safe credential testing
- Better debugging

EOF

cat > "$ISSUES_DIR/014-memory-deduplication.md" << 'EOF'
# Intelligent Memory Deduplication

**Priority:** Low  
**Category:** Feature - Memory System  
**Labels:** `enhancement`, `memory`, `optimization`

## Problem
Users can create duplicate or near-duplicate memories. Wastes storage and reduces search quality.

## Current State
- No duplicate detection
- Same memory can be stored multiple times
- No similarity checking
- Database bloat from duplicates

## Proposed Solution

### Detection Methods

**1. Exact Duplicates**
```sql
-- Find exact content duplicates
SELECT content, COUNT(*) as count
FROM memory_entries
WHERE user_id = 'xxx'
GROUP BY content
HAVING COUNT(*) > 1;
```

**2. Near Duplicates (Semantic Similarity)**
```typescript
async function findSimilarMemories(
  content: string,
  userId: string,
  threshold = 0.95
): Promise<Memory[]> {
  
  // Get embedding for new content
  const embedding = await getEmbedding(content);
  
  // Search for similar memories
  const similar = await vectorDB.search({
    user_id: userId,
    embedding,
    similarity_threshold: threshold,
    limit: 10
  });
  
  return similar;
}
```

**3. Content Fingerprinting**
```typescript
function generateFingerprint(content: string): string {
  // Normalize content
  const normalized = content
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
  
  // SimHash or MinHash for near-duplicate detection
  return simhash(normalized);
}
```

### Features
1. **Pre-Save Detection** - Warn before creating duplicate
2. **Merge Suggestions** - Suggest merging similar memories
3. **Automatic Deduplication** - Background job to find duplicates
4. **Duplicate Dashboard** - UI to review and merge duplicates
5. **Smart Merge** - Combine tags, metadata from duplicates

### UI Flow

**Creating New Memory:**
```
User: Creates memory "Project setup notes"
System: Searches for similar memories
System: "⚠️ Similar memory found: 'Project setup guide' (95% match)"
Options:
  - "View Similar Memory"
  - "Create Anyway"
  - "Merge into Existing"
```

**Duplicate Review:**
```
Dashboard shows:
┌─────────────────────────────────────┐
│ Potential Duplicates Detected       │
├─────────────────────────────────────┤
│ "API Documentation" (3 copies)      │
│ Created: Nov 1, Nov 5, Nov 15       │
│ Similarity: 98%                     │
│ [Review] [Auto-Merge] [Dismiss]     │
└─────────────────────────────────────┘
```

### Merge Strategy
```typescript
async function mergeMemories(memoryIds: string[]): Promise<Memory> {
  const memories = await getMemories(memoryIds);
  
  // Keep most recent content
  const content = memories[0].content;
  
  // Combine all unique tags
  const allTags = new Set();
  memories.forEach(m => m.tags.forEach(t => allTags.add(t)));
  
  // Merge metadata
  const metadata = Object.assign({}, ...memories.map(m => m.metadata));
  
  // Create merged memory
  const merged = await createMemory({
    content,
    tags: Array.from(allTags),
    metadata,
    type: memories[0].type
  });
  
  // Delete old memories
  await deleteMemories(memoryIds);
  
  // Log merge for audit
  await logMerge(memoryIds, merged.id);
  
  return merged;
}
```

### Database Schema
```sql
CREATE TABLE memory_duplicates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id_1 UUID NOT NULL REFERENCES memory_entries(id),
  memory_id_2 UUID NOT NULL REFERENCES memory_entries(id),
  similarity_score DECIMAL(3,2) NOT NULL, -- 0.0 to 1.0
  duplicate_type VARCHAR(50) DEFAULT 'semantic', -- exact, semantic, fingerprint
  status VARCHAR(50) DEFAULT 'pending', -- pending, merged, dismissed
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(memory_id_1, memory_id_2)
);

CREATE INDEX idx_duplicates_status ON memory_duplicates(status);
```

### Background Job
```typescript
// Daily cron job
async function detectDuplicates() {
  const users = await getAllUsers();
  
  for (const user of users) {
    const memories = await getUserMemories(user.id);
    
    // Find duplicates using fingerprinting
    const fingerprints = new Map();
    for (const memory of memories) {
      const fingerprint = generateFingerprint(memory.content);
      
      if (fingerprints.has(fingerprint)) {
        // Potential duplicate found
        await createDuplicateRecord(
          fingerprints.get(fingerprint),
          memory.id,
          'fingerprint'
        );
      } else {
        fingerprints.set(fingerprint, memory.id);
      }
    }
    
    // Find semantic duplicates (more expensive, limit to recent)
    const recentMemories = memories.slice(0, 100);
    for (let i = 0; i < recentMemories.length; i++) {
      const similar = await findSimilarMemories(
        recentMemories[i].content,
        user.id,
        0.95
      );
      
      for (const match of similar) {
        if (match.id !== recentMemories[i].id) {
          await createDuplicateRecord(
            recentMemories[i].id,
            match.id,
            'semantic',
            match.similarity
          );
        }
      }
    }
  }
}
```

## Success Criteria
- [ ] Exact duplicates detected before creation
- [ ] Near-duplicates flagged (>95% similarity)
- [ ] Users can review and merge duplicates
- [ ] Background job finds duplicates daily
- [ ] Auto-merge option for exact duplicates

## Benefits
- Reduced storage costs
- Better search quality
- Improved user experience
- Database optimization

EOF

echo ""
echo "✅ Successfully generated 14 comprehensive GitHub issues!"
echo ""
echo "📊 Issue Summary:"
echo "   Memory/Context Features: 5 issues (#1-5)"
echo "   MCP Router Platform: 5 issues (#6-10)"
echo "   Security & Compliance: 2 issues (#11-12)"
echo "   Developer Experience: 2 issues (#13-14)"
echo ""
echo "📁 All issues saved to: $ISSUES_DIR/"
echo ""
echo "Next steps:"
echo "1. Review the generated markdown files"
echo "2. Create GitHub issues manually from these files"
echo "3. Or use: gh issue create --title 'Title' --body-file issue.md"
echo ""

ls -lh "$ISSUES_DIR"
