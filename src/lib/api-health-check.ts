// API Health Check Utility
// Validates connection to unified backend system

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  backend: string;
  latency: number;
  timestamp: string;
  errors?: string[];
}

interface ServiceEndpoints {
  core: string;
  auth: string;
  api: string;
}

class ApiHealthChecker {
  private endpoints: ServiceEndpoints;
  
  constructor() {
    const baseUrl = import.meta.env.VITE_API_URL?.replace('/v1', '') || 'https://api.lanonasis.com';
    this.endpoints = {
      core: baseUrl,
      auth: `${baseUrl}/auth`,
      api: `${baseUrl}/v1`
    };
  }

  async checkCoreHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    
    try {
      // Test core health endpoint
      const healthResponse = await fetch(`${this.endpoints.core}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Project-Scope': 'dashboard',
        },
      });

      if (!healthResponse.ok) {
        errors.push(`Core health check failed: ${healthResponse.status}`);
      }

      // Test auth endpoint availability
      const authResponse = await fetch(`${this.endpoints.auth}/login?test=true`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!authResponse.ok && authResponse.status !== 400) {
        errors.push(`Auth endpoint unreachable: ${authResponse.status}`);
      }

      // Test API v1 endpoint
      const apiResponse = await fetch(`${this.endpoints.api}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!apiResponse.ok && apiResponse.status !== 401) {
        errors.push(`API v1 endpoint failed: ${apiResponse.status}`);
      }

      const latency = Date.now() - startTime;
      
      let status: 'healthy' | 'degraded' | 'unhealthy';
      if (errors.length === 0) {
        status = latency < 1000 ? 'healthy' : 'degraded';
      } else if (errors.length < 2) {
        status = 'degraded';
      } else {
        status = 'unhealthy';
      }

      return {
        status,
        backend: this.endpoints.core,
        latency,
        timestamp: new Date().toISOString(),
        errors: errors.length > 0 ? errors : undefined
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        backend: this.endpoints.core,
        latency: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        errors: [`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  async validateUnifiedRouting(): Promise<{ 
    dashboard: boolean;
    cli: boolean; 
    mcp: boolean;
    unified: boolean;
  }> {
    try {
      // Check if all components point to same backend
      const expectedBackend = 'api.lanonasis.com';
      
      const dashboardBackend = this.endpoints.core.includes(expectedBackend);
      
      // These would typically be checked via service discovery
      // For now, we assume they're correctly configured if dashboard is
      const cliBackend = dashboardBackend; // CLI uses same config
      const mcpBackend = dashboardBackend; // MCP routes through Core
      
      return {
        dashboard: dashboardBackend,
        cli: cliBackend,
        mcp: mcpBackend,
        unified: dashboardBackend && cliBackend && mcpBackend
      };
      
    } catch (error) {
      console.error('Unified routing validation failed:', error);
      return {
        dashboard: false,
        cli: false,
        mcp: false,
        unified: false
      };
    }
  }
}

// Singleton instance
export const apiHealthChecker = new ApiHealthChecker();

// Convenience functions
export async function checkBackendHealth(): Promise<HealthCheckResult> {
  return apiHealthChecker.checkCoreHealth();
}

export async function validateSystemIntegration() {
  const [health, routing] = await Promise.all([
    apiHealthChecker.checkCoreHealth(),
    apiHealthChecker.validateUnifiedRouting()
  ]);

  return {
    health,
    routing,
    integrated: health.status !== 'unhealthy' && routing.unified
  };
}