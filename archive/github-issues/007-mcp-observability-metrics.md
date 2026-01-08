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

