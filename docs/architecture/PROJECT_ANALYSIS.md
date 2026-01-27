# LanOnasis Dashboard - Comprehensive Project Analysis

## 📁 Repository Overview

This is the **LanOnasis Dashboard** repository, a React-based web application that serves as the frontend dashboard for the LanOnasis platform. Based on the issues document provided, this appears to be part of a larger ecosystem that includes **Onasis‑CORE** (unified router and auth) and **LanOnasis‑maas** (orchestrator) components.

## 🏗️ Project Structure

```
LanOnasis-dashboard/
├── src/
│   ├── components/         # React components
│   │   ├── auth/           # Authentication components
│   │   ├── dashboard/      # Dashboard UI components
│   │   ├── feedback/       # User feedback components
│   │   ├── icons/          # Icon components
│   │   ├── layout/         # Layout components
│   │   ├── mcp/            # MCP (Model Context Protocol) components
│   │   ├── orchestrator/   # Workflow orchestration components
│   │   └── ui/             # Reusable UI components (shadcn/ui)
│   ├── config/            # Configuration files
│   │   └── mcp-servers.json  # MCP server configurations
│   ├── hooks/             # Custom React hooks
│   ├── integrations/      # Third-party integrations
│   │   └── supabase/      # Supabase client and types
│   ├── lib/               # Utility libraries
│   │   └── central-auth.ts   # Central authentication client
│   ├── pages/             # Page components
│   │   ├── Dashboard.tsx
│   │   ├── Index.tsx
│   │   ├── ApiDocs.tsx
│   │   ├── ApiAnalytics.tsx
│   │   ├── OAuthAuthorize.tsx
│   │   └── NotFound.tsx
│   ├── utils/             # Utility functions
│   └── archived/          # Archived/legacy code
├── public/               # Static assets
├── scripts/              # Build and utility scripts
├── locales/              # i18n translation files
├── docs/                 # Documentation
└── supabase/            # Supabase configuration

```

## 🔧 Technology Stack

### Core Technologies
- **Frontend Framework**: React 18.3.1 with TypeScript
- **Build Tool**: Vite 7.0.6 (with Bun support per CLAUDE.md)
- **Styling**: Tailwind CSS 4.1.11 with shadcn/ui components
- **State Management**: React Query (TanStack Query) v5.83.0
- **Routing**: React Router DOM v7.7.1
- **Internationalization**: i18next with React bindings

### UI Components
- **Component Library**: Radix UI primitives (@radix-ui/react-*)
- **Icons**: Lucide React
- **Forms**: React Hook Form with Zod validation
- **Charts**: Recharts
- **Notifications**: Sonner + Toast components

### Backend Integration
- **Authentication**: Supabase Auth + Central Auth Gateway
- **Database**: Supabase (PostgreSQL)
- **API Communication**: Fetch API with bearer token authentication

## 🔐 Authentication Architecture

The project implements a **centralized authentication** approach:

### 1. Central Auth Client (`src/lib/central-auth.ts`)
- Manages communication with the onasis-core auth gateway
- Handles OAuth flow and platform-specific authentication
- Provides methods for:
  - OAuth provider login
  - Token refresh
  - API key management
  - Session verification

### 2. Auth Flow
- All auth requests redirect to central auth server at `https://api.lanonasis.com`
- Supports multiple providers (configured via OAuth)
- Implements token refresh mechanism
- Stores tokens in localStorage

### 3. Protected Routes
- Uses `ProtectedRoute` component wrapper
- Validates sessions via central auth
- Redirects unauthenticated users to login

## 🚦 Routing Structure

### Main Routes (from App.tsx):
```typescript
/ → CentralAuthRedirect
/auth/* → CentralAuthRedirect
/login, /register, /signin, /signup → CentralAuthRedirect
/landing → Index page
/dashboard → Protected Dashboard
/dashboard/memory-visualizer → Memory visualizer feature
/dashboard/api-keys → API key management
/dashboard/orchestrator → Workflow orchestration
/dashboard/extensions → Extensions management
/dashboard/upload → File upload feature
/api-docs, /docs → API documentation
/api-analytics → Analytics dashboard
/oauth/authorize → OAuth authorization page
/device → Device authorization
* → NotFound (404)
```

## 🔌 Key Components & Features

### 1. Dashboard Components (`src/components/dashboard/`)
- **ApiDashboard**: Main API management interface
- **ApiKeyManager**: Create, view, and revoke API keys
- **UserProfile**: User profile management
- **Chart/StatCard**: Data visualization components

### 2. Workflow Orchestrator (`src/components/orchestrator/WorkflowOrchestrator.tsx`)
- Real-time workflow execution
- SSE (Server-Sent Events) connection to MCP
- Step-by-step execution tracking
- Progress monitoring and error handling

### 3. MCP Integration
- Configuration for multiple MCP servers
- Support for various AI/API services:
  - Hostinger API
  - Context7
  - Magic API
  - Perplexity
  - GitHub
  - Supabase

### 4. Internationalization
- Multi-language support via i18next
- Translation validation scripts
- Language switcher component

## 🐛 Known Issues (from provided analysis)

### 1. Routing Issues

#### Unified Router Problems:
- Environment variable inconsistencies (SUPABASE_URL=https://<project-ref>.supabase.co
- Service name mismatches between orchestrator and router
- Missing fallback routing when unified router is unavailable

#### Recommended Fixes:
- Align environment variable names across repositories
- Implement proper fallback routing map
- Add service discovery endpoint usage

### 2. Authentication Issues

#### Current Problems:
- Dual authentication system (basic auth vs OAuth)
- Incomplete JWT validation in aligned middleware
- API keys stored in plaintext
- Inconsistent configuration variables

#### Recommended Fixes:
- Choose single authentication flow (centralized OAuth)
- Implement proper JWT validation against Supabase
- Hash API keys with SHA-256
- Consolidate configuration in shared module

### 3. Service Mapping Issues
- Service names inconsistent between orchestrator and unified router
- Missing correlation IDs for request tracing
- Incomplete documentation of environment variables

## 🚀 Development & Deployment

### Development Scripts
```bash
# Development server (Vite)
npm run dev

# Build for production
npm run build

# Build for development
npm run build:dev

# Preview production build
npm run preview

# Linting
npm run lint

# i18n commands
npm run i18n:validate
npm run i18n:translate
npm run i18n:check
```

### Deployment Configuration
- **Netlify**: Single configuration file
  - `netlify.toml`: Main deployment config with Bun support
- **Windsurf**: `windsurf_deployment.yaml` for cloud deployment

### Environment Variables Required
```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
REDACTED_SUPABASE_ANON_KEY=REDACTED_SUPABASE_ANON_KEY
VITE_API_URL=https://api.lanonasis.com
VITE_PROJECT_SCOPE=dashboard
```

## 📊 Project Dependencies Analysis

### Production Dependencies (Key):
- 47 Radix UI components for comprehensive UI
- React ecosystem (Router, Query, Hook Form)
- Supabase client for backend integration
- i18next for internationalization
- Tailwind CSS for styling

### Development Dependencies:
- TypeScript and type definitions
- ESLint for code quality
- Vite for fast builds
- Bun types for Bun runtime support

## 🔄 Integration Points

### 1. With Onasis-CORE:
- Central authentication gateway
- Unified router for service routing
- Rate limiting and vendor authentication

### 2. With LanOnasis-maas:
- Orchestrator for workflow execution
- Service endpoint routing
- API key validation

### 3. With Supabase:
- Database operations
- Edge functions
- Real-time subscriptions

## 🎯 Recommendations for Debug Session

### Priority 1: Fix Authentication Flow
1. Complete the migration to centralized OAuth
2. Remove legacy basic auth endpoints
3. Implement proper JWT validation
4. Hash all API keys in storage

### Priority 2: Resolve Routing Issues
1. Create comprehensive service routing map
2. Implement proper fallback mechanisms
3. Add service discovery integration
4. Standardize service naming conventions

### Priority 3: Configuration Alignment
1. Consolidate environment variables
2. Create shared configuration module
3. Document all required variables
4. Add configuration validation on startup

### Priority 4: Monitoring & Debugging
1. Implement correlation IDs for request tracing
2. Add comprehensive logging with Winston
3. Set up metrics collection
4. Create health check endpoints

### Priority 5: Security Hardening
1. Enable HTTPS everywhere
2. Implement proper CORS headers
3. Add rate limiting to all endpoints
4. Use secure token storage (consider cookies vs localStorage)

## 📝 Next Steps

1. **Immediate Actions**:
   - Review and fix environment variable configuration
   - Test authentication flow end-to-end
   - Verify service routing works correctly
   - Check API key creation and validation

2. **Short-term Goals**:
   - Complete OAuth migration
   - Implement service discovery
   - Add comprehensive error handling
   - Update documentation

3. **Long-term Improvements**:
   - Add automated testing
   - Implement CI/CD pipeline
   - Add performance monitoring
   - Create admin dashboard

## 🔍 Areas Requiring Further Investigation

1. **MCP Server Integration**: The exact role and configuration of MCP servers needs clarification
2. **Memory Visualizer**: Feature implementation details not found in current codebase
3. **Extensions System**: Referenced in routes but implementation unclear
4. **Upload Feature**: File upload handling mechanism needs review
5. **Real-time Features**: SSE/WebSocket implementation for live updates

## 📚 Documentation Gaps

- Missing API documentation for service endpoints
- Incomplete setup guide for local development
- No deployment guide for production
- Missing architecture diagrams
- Lack of troubleshooting guide

## 🔍 Deep Dive Analysis

### API Client Architecture (`src/lib/api-client.ts`)
The project uses a centralized API client that:
- Routes all requests through Onasis-CORE Gateway at `https://api.lanonasis.com`
- Prefixes MaaS endpoints with `/api/v1/maas`
- Handles authentication via Bearer tokens
- Implements automatic redirect to central auth on 401 errors
- Provides methods for:
  - Memory management (CRUD operations)
  - Organization management
  - API key management
  - File uploads
  - Analytics and usage tracking

### Authentication Hook (`src/hooks/useCentralAuth.tsx`)
Complex authentication system with fallback mechanism:
- **Primary**: Central Auth Gateway (if `VITE_USE_CENTRAL_AUTH=true`)
- **Fallback**: Supabase Auth (if `VITE_USE_FALLBACK_AUTH=true`)
- Maintains session state across both systems
- Handles OAuth callbacks
- Profile fetching from Supabase database

### Service Integrations
The dashboard integrates with multiple financial and business services:
- **Payment Gateways**: Comprehensive payment processing UI
- **Bank Statements**: Transaction processing and analysis
- **Fraud Monitoring**: Real-time fraud detection interface
- **Trade Financing**: Trade finance management
- **Utility Payments**: Bill payment processing
- **Verification Services**: Identity and document verification
- **Wallet Services**: Digital wallet management

### Configuration Issues Identified

#### Environment Variable Inconsistencies:
```
Central Auth:
- VITE_API_URL → points to central auth
- VITE_PROJECT_SCOPE → 'dashboard'
- VITE_USE_CENTRAL_AUTH → toggle flag
- VITE_USE_FALLBACK_AUTH → fallback flag

Supabase:
- VITE_SUPABASE_URL=https://<project-ref>.supabase.co
- VITE_SUPABASE_ANON_KEY=REDACTED_SUPABASE_ANON_KEY

API Client:
- VITE_CORE_API_BASE_URL → Onasis-CORE gateway
```

#### Service Endpoint Mapping Issues:
The API client expects endpoints at `/api/v1/maas/*` but the orchestrator and unified router may use different paths. This creates a routing mismatch that needs resolution.

### MCP Server Configuration
The project configures multiple MCP (Model Context Protocol) servers:
- Hostinger API integration
- Context7 for context management
- Magic API (21st.dev)
- Perplexity for AI search
- GitHub for repository management
- Supabase for database operations

Each server requires specific API keys and configuration, stored in `src/config/mcp-servers.json`.

## 🎯 Critical Debug Points

### 1. Authentication Flow Debugging
```javascript
// Check these flows in order:
1. Central Auth health check → /health
2. Session retrieval → /v1/auth/verify
3. Fallback to Supabase → supabase.auth.getSession()
4. OAuth callback handling → handleAuthCallback()
```

### 2. API Request Flow
```javascript
// Trace requests through:
1. Component → apiClient.method()
2. ApiClient → makeRequest()
3. Add auth headers → getAuthHeaders()
4. Route to → ${API_BASE_URL}${MAAS_API_PREFIX}${endpoint}
5. Handle response or redirect on 401
```

### 3. Service Routing Resolution
The mismatch between service names needs mapping:
```javascript
// Dashboard expects:
/api/v1/maas/memories
/api/v1/maas/organizations
/api/v1/maas/api-keys

// Unified router may provide:
/api/memory
/api/organization
/api/keys

// Solution: Update routing map in orchestrator
```

## 🚀 Quick Fix Recommendations

### Immediate Actions:
1. **Set Environment Variables**:
```bash
export VITE_USE_CENTRAL_AUTH=true
export VITE_USE_FALLBACK_AUTH=true
export VITE_API_URL=https://api.lanonasis.com
export VITE_CORE_API_BASE_URL=https://api.lanonasis.com
export VITE_PROJECT_SCOPE=dashboard
```

2. **Update Service Routes** in unified router to match dashboard expectations

3. **Verify Auth Token Storage**:
- Check localStorage for `access_token`, `refresh_token`, `user_data`
- Ensure tokens are properly formatted

4. **Test Health Endpoints**:
```bash
# Test central auth
curl https://api.lanonasis.com/health

# Test MaaS endpoint
curl https://api.lanonasis.com/api/v1/maas/health
```

This analysis provides a comprehensive baseline for debugging the routing and authentication issues. The project shows a well-structured React application with enterprise features, but needs alignment between its various integration points to resolve the current issues.