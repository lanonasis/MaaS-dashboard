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

