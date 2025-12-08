# Overview

LanOnasis Dashboard is a React-based web application that serves as the management interface for the LanOnasis Memory as a Service (MaaS) platform. It provides administrators and users with tools for monitoring services, managing API keys, visualizing memory data, orchestrating workflows, and administering system settings. The dashboard integrates with Supabase for authentication and data storage, and communicates with the LanOnasis backend API ecosystem.

## Recent Changes (December 8, 2025)

**AI Orchestrator Migration to Direct Supabase**
- Updated AI orchestrator core (`src/lib/ai-orchestrator/core.ts`) to use Supabase directly instead of external memory API endpoints
- Memory recall now queries `memory_entries` table directly with safe text-based filtering
- Context storage uses direct Supabase inserts for reliability
- Fixed query escaping to handle special characters (commas, quotes) in user input
- Removed dependency on `@lanonasis/memory-client` package which was causing browser compatibility issues

**Button Nesting Fix**
- Resolved React hydration error in Index.tsx caused by nested button elements
- Replaced inner button with styled div to maintain accessibility while fixing DOM structure

**Database Schema Updates**
- Created `workflow_runs` table for workflow execution tracking
- Created `memory_entries` table for user memory storage

## Previous Changes (November 6, 2025)

**Memory Visualizer Implementation**
- Created comprehensive Memory Visualizer component (`src/components/dashboard/MemoryVisualizer.tsx`) that fetches user-specific data from both Supabase and the LanOnasis API
- Displays memories with semantic search, filtering by type, and tag-based organization
- Shows API keys from the user's Supabase database
- Includes stats dashboard showing total memories, unique tags, total access count, and active API keys
- Supports semantic search through the LanOnasis API backend
- Replaced "Coming Soon" placeholder with fully functional component

**Profile Management Enhancements**
- Updated UserProfile component to fetch profile data from Supabase profiles table
- Added loading state during profile fetch
- Implemented graceful handling for empty profiles using `.maybeSingle()` and `upsert` operations
- Added company name and phone fields to profile editing
- Made profile display responsive with grid layout (1 column mobile, 2 columns desktop)

**Mobile Responsiveness**
- Implemented fully adaptive dashboard tabs (2 cols mobile, 3 tablet, 6 desktop)
- Added icon size variations (3x3 mobile, 4x4 desktop)
- Abbreviated labels on mobile devices ("Keys", "Mem", "Orch") with full labels on larger screens
- Fixed chart rendering issues by setting explicit container dimensions

**Chart Rendering Fixes**
- Added explicit pixel heights and minHeights to chart containers to prevent dimension calculation errors
- Fixed ResponsiveContainer parent sizing issues that caused width(-1) and height(-1) warnings

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

**Framework**: React 18.3+ with TypeScript, using functional components and hooks throughout.

**Build System**: Vite 7.0+ configured for single-page application (SPA) deployment. The application uses Bun as the preferred runtime and package manager instead of Node.js or npm (per CLAUDE.md).

**Routing**: React Router DOM handles client-side routing with protected routes wrapping authenticated areas. Main routes include:
- `/` - Landing page
- `/dashboard/*` - Protected dashboard area with nested routes for different features
- `/auth/*` - Authentication callback handlers
- `/api-docs` and `/api-analytics` - Public documentation pages

**State Management**: React Query (TanStack Query) manages server state with 5-minute stale time and single retry on failure. Local component state uses React hooks (useState, useEffect, useContext).

**Styling**: Tailwind CSS 4.1+ with shadcn/ui component library for consistent, accessible UI components. Custom CSS variables enable theming with light/dark mode support.

**Authentication Flow**: The application underwent a significant architectural shift to resolve a 5+ month authentication blocker. Originally designed to authenticate through api.lanonasis.com (central auth gateway), the system now uses **direct Supabase authentication** as the permanent solution. The direct auth implementation (`src/lib/direct-auth.ts`) bypasses the broken central gateway while maintaining backward compatibility with existing interfaces.

## Backend Integration

**Primary Backend**: The dashboard communicates with the LanOnasis unified backend at `api.LanOnasis.com`. All API requests route through this central gateway.

**API Client**: Centralized API client (`src/lib/api-client.ts`) handles all backend communication with proper authentication headers, project scoping, and error handling.

**Authentication Service**: Supabase handles all authentication operations directly, including:
- Email/password login and signup
- OAuth providers (Google, GitHub, Apple)
- Session management and token refresh
- Profile creation and management

**Data Storage**: Supabase PostgreSQL database stores user profiles, API keys, activity logs, and application data. The schema includes:
- `profiles` - User profile information
- `api_keys` - API key management
- `api_logs` - Usage tracking and analytics

## Key Architectural Decisions

**Direct Supabase Auth vs Central Gateway**: After months of OAuth redirect loops and authentication failures with the central auth gateway (api.lanonasis.com), the decision was made to implement direct Supabase authentication. This eliminates the broken intermediary while maintaining the same Supabase project used by other platform components. The implementation preserves backward compatibility by exposing the same interface as the previous central auth module.

**SPA Deployment Strategy**: The application deploys as a static SPA to Netlify with all routes serving the same `index.html` file. This ensures proper client-side routing without server-side route conflicts. All API requests proxy to the backend gateway.

**Component Organization**: Components organize by feature domain rather than technical type:
- `auth/` - Authentication components
- `dashboard/` - Dashboard-specific UI
- `mcp/` - Model Context Protocol server management
- `orchestrator/` - Workflow orchestration
- `ui/` - Reusable shadcn/ui components
- `layout/` - Application layout components

**Protected Routes**: Authentication wraps dashboard routes using a `ProtectedRoute` component that checks for valid user session before rendering. Unauthenticated users redirect to the landing page with auth form.

**Environment Configuration**: The application uses environment variables for all configuration, supporting both development and production deployments. Critical variables include Supabase credentials, API URLs, and feature flags.

# External Dependencies

## Third-Party Services

**Supabase** (`mxtsdgkwzjzlttpotole.supabase.co`)
- Purpose: Authentication, database, real-time subscriptions
- Integration: Direct client connection via `@supabase/supabase-js`
- Configuration: URL and anon key stored in environment variables
- Features Used: Auth (email/password, OAuth), PostgreSQL database, row-level security

**LanOnasis Backend API** (`api.LanOnasis.com`)
- Purpose: Unified backend gateway for MaaS platform
- Endpoints: `/api/v1/maas/*` for memory operations, user management, analytics
- Authentication: Session-based with Supabase tokens
- Project Scoping: Requests include `x-project-scope: dashboard` header

**Netlify**
- Purpose: Static hosting and deployment
- Features: Continuous deployment from git, custom domain, redirects, environment variables
- Configuration: `netlify.toml` in project root defines build settings and redirect rules

## Key NPM Packages

**UI Framework**
- `react` & `react-dom` - Core framework
- `@radix-ui/*` - Accessible UI primitives (20+ packages for dialogs, dropdowns, tooltips, etc.)
- `tailwindcss` - Utility-first CSS framework
- `class-variance-authority` & `clsx` - Dynamic class composition

**State & Data**
- `@tanstack/react-query` - Server state management
- `react-hook-form` - Form state and validation
- `zod` - Schema validation
- `drizzle-orm` - Type-safe database queries

**Routing & Navigation**
- `react-router-dom` - Client-side routing
- `react-i18next` - Internationalization (10+ language support)

**Charts & Visualization**
- `recharts` - Data visualization and analytics charts

**Development Tools**
- `vite` - Build tool and dev server
- `typescript` - Type safety
- `eslint` - Code linting
- `vitest` - Unit testing

## OAuth Providers

The application supports OAuth authentication through Supabase with the following providers configured:
- **Google** - Primary OAuth provider
- **GitHub** - Developer-focused authentication
- **Apple** - iOS/macOS integration
- **LinkedIn**, **Discord** - Additional social providers (UI ready)

Each provider requires configuration in Supabase dashboard with redirect URLs pointing to `dashboard.lanonasis.com/auth/callback`.

## Database Schema

The application uses a PostgreSQL schema managed through Drizzle ORM:
- **profiles** - User information (id, email, full_name, company_name, phone, avatar_url, role)
- **api_keys** - API key management (id, user_id, name, key, service, expires_at, is_active)
- **api_logs** - Usage tracking (id, user_id, endpoint, request_method, service, request_data, response_data, response_status)

All tables include timestamp columns (created_at, updated_at) for audit trails.