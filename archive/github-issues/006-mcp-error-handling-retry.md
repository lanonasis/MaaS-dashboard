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

