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

