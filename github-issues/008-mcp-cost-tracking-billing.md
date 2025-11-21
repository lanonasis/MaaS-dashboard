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

