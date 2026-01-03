# LanOnasis MaaS Dashboard

Enterprise-grade Memory as a Service (MaaS) dashboard with AI-powered memory management, MCP Router integration, and workflow orchestration.

![Version](https://img.shields.io/badge/version-1.2.0-blue)
![React](https://img.shields.io/badge/React-19.2-61dafb)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6)
![Vite](https://img.shields.io/badge/Vite-7.3-646cff)

## Overview

The LanOnasis Dashboard is the central management interface for the Memory as a Service (MaaS) platform. It provides:

- **Memory Management** - Create, search, visualize, and analyze semantic memories
- **MCP Router** - Manage Model Context Protocol services and API keys
- **AI Intelligence** - Health checks, pattern analysis, and duplicate detection
- **Workflow Orchestration** - AI-powered workflow planning and execution
- **Real-time Analytics** - Usage metrics, request tracking, and insights

## Features

### Memory Management

| Feature | Description |
|---------|-------------|
| Memory Visualizer | Browse, filter, and manage memory entries with pagination |
| Semantic Search | Vector-powered search across your memory bank |
| Memory Analytics | Usage patterns, type distribution, and access metrics |
| Memory Workbench | Advanced memory operations and batch processing |

### MCP Router

| Feature | Description |
|---------|-------------|
| Service Catalog | Browse and enable MCP-compatible services |
| Router Keys | Scoped API keys for external service integrations |
| Usage Analytics | Track API calls, latency, and consumption |
| Request Tracking | Real-time monitoring of MCP requests |
| Extensions | Custom MCP extensions and adapters |

### AI & Workflows

| Feature | Description |
|---------|-------------|
| Orchestrator | Goal-driven AI workflow execution |
| AI Tools | Intelligence SDK with health check, pattern analysis, duplicate detection |
| Scheduler | Automated workflow scheduling (Coming Soon) |

### Intelligence SDK

The dashboard integrates the `@lanonasis/mem-intel-sdk` which provides:

- **Offline Processing** - Works locally with cached memory entries
- **Online API** - Falls back to REST API when available
- **Health Check** - Memory bank health scoring and recommendations
- **Pattern Analysis** - Usage patterns, peak hours, tag distribution
- **Duplicate Detection** - Similarity-based duplicate identification

## Tech Stack

| Category | Technologies |
|----------|--------------|
| **Framework** | React 19, TypeScript 5.9, Vite 7 |
| **State Management** | TanStack React Query 5, React Context |
| **UI Components** | Radix UI, Tailwind CSS 4, shadcn/ui |
| **Authentication** | Supabase Auth, Central OAuth Gateway |
| **Database** | Supabase (PostgreSQL), Drizzle ORM |
| **Charts** | Recharts |
| **Internationalization** | i18next |
| **Testing** | Vitest, Testing Library |

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) v1.0+ (recommended) or Node.js 20+
- Supabase project with required tables
- Environment variables configured

### Installation

```bash
# Clone the repository
git clone https://github.com/lanonasis/lan-onasis-monorepo.git
cd lan-onasis-monorepo/apps/dashboard

# Install dependencies
bun install

# Start development server
bun run dev
```

### Environment Variables

Create a `.env` file based on `.env.template`:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# API Configuration
VITE_CORE_API_BASE_URL=https://api.lanonasis.com
VITE_API_URL=https://api.lanonasis.com/v1

# Memory Intelligence (optional)
VITE_MEMORY_API_KEY=your-memory-api-key
VITE_MEM_INTEL_API_KEY=your-intel-key
```

## Project Structure

```
apps/dashboard/
├── src/
│   ├── components/
│   │   ├── ai/              # AI Assistant components
│   │   ├── auth/            # Authentication components
│   │   ├── dashboard/       # Dashboard-specific components
│   │   │   ├── ApiKeyManager.tsx
│   │   │   ├── DashboardOverview.tsx
│   │   │   ├── IntelligencePanel.tsx
│   │   │   ├── MemoryAnalytics.tsx
│   │   │   ├── MemoryVisualizer.tsx
│   │   │   └── MemoryWorkbench.tsx
│   │   ├── layout/          # Layout components (Sidebar, Header)
│   │   ├── mcp/             # MCP Router components
│   │   ├── orchestrator/    # Workflow orchestration
│   │   └── ui/              # Reusable UI components (shadcn/ui)
│   ├── hooks/
│   │   ├── cached/          # React Query cached hooks
│   │   ├── useMemoryIntelligence.tsx
│   │   ├── useSupabaseAuth.tsx
│   │   └── useCentralAuth.tsx
│   ├── lib/
│   │   ├── api-client.ts    # Centralized API client
│   │   ├── mcp-router/      # MCP Router utilities
│   │   └── utils.ts         # Utility functions
│   ├── pages/
│   │   ├── Dashboard.tsx    # Main dashboard with routing
│   │   ├── Index.tsx        # Landing page
│   │   ├── APIKeysPage.tsx  # MCP Router Keys management
│   │   ├── MCPServicesPage.tsx
│   │   └── MCPUsagePage.tsx
│   └── integrations/
│       └── supabase/        # Supabase client and types
├── public/
├── package.json
└── vite.config.ts
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start development server |
| `bun run build` | Build for production |
| `bun run preview` | Preview production build |
| `bun run lint` | Run ESLint |
| `bun run i18n:extract` | Extract translation strings |
| `bun run auth:diagnostic` | Run authentication diagnostics |

## Dashboard Routes

| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/dashboard` | Main dashboard overview |
| `/dashboard/memory-visualizer` | Memory browser and search |
| `/dashboard/memory-analytics` | Memory usage analytics |
| `/dashboard/mcp-services` | MCP service catalog |
| `/dashboard/api-keys` | MCP Router API keys |
| `/dashboard/mcp-usage` | MCP usage analytics |
| `/dashboard/mcp-tracking` | Request tracking |
| `/dashboard/orchestrator` | AI workflow orchestrator |
| `/dashboard/ai-tools` | Intelligence tools |
| `/dashboard/scheduler` | Workflow scheduling |
| `/dashboard/extensions` | MCP extensions |
| `/api-docs` | API documentation |

## Authentication

The dashboard supports multiple authentication methods:

1. **Supabase Auth** - Primary authentication via Supabase
2. **Central OAuth Gateway** - Unified token exchange for API access
3. **API Keys** - Scoped keys for programmatic access

Protected routes require authentication and automatically redirect to login.

## API Integration

### Memory API Client

```typescript
import { apiClient } from '@/lib/api-client';

// Search memories
const results = await apiClient.searchMemories({
  query: 'project requirements',
  limit: 10,
  similarity_threshold: 0.7
});

// Create memory
const memory = await apiClient.createMemory({
  title: 'Meeting Notes',
  content: 'Discussed project timeline...',
  type: 'note',
  tags: ['meetings', 'project-x']
});
```

### Intelligence SDK

```typescript
import { useMemoryIntelligence } from '@/hooks/useMemoryIntelligence';

function MyComponent() {
  const { getHealthCheck, analyzePatterns, detectDuplicates } = useMemoryIntelligence();

  // Get memory health score
  const health = await getHealthCheck();

  // Analyze patterns over 30 days
  const patterns = await analyzePatterns(30);

  // Detect duplicates with 80% threshold
  const duplicates = await detectDuplicates(0.8);
}
```

### React Query Caching

```typescript
import { useCachedMemories, useCachedHealthCheck } from '@/hooks/cached';

function Dashboard() {
  // Cached memory list with automatic refetching
  const { data: memories, isLoading } = useCachedMemories();

  // Cached health check (10 min stale time)
  const { data: health } = useCachedHealthCheck();
}
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Related Packages

| Package | Description |
|---------|-------------|
| `@lanonasis/cli` | CLI tool with MCP server |
| `@lanonasis/memory-client` | TypeScript SDK for memory operations |
| `@lanonasis/mem-intel-sdk` | Memory Intelligence SDK |
| `@lanonasis/oauth-client` | OAuth client for authentication |

## License

This project is proprietary software. All rights reserved.

---

Built with care by [Lan Onasis](https://www.lanonasis.com) - *Change the world, one simple solution at a time.*
