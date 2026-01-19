# Authentication & Routing Architecture

**Date**: 2025-11-25  
**Status**: Current Architecture Documentation

## 🏗️ System Overview

Your platform uses a **dual-database architecture** with clear separation of concerns:

### **1. Auth Gateway (auth.lanonasis.com)**
- **Database**: Neon PostgreSQL
- **Purpose**: Authentication, authorization, rate limiting, user management
- **Services**:
  - User authentication (login, OAuth, sessions)
  - API key management (metadata, permissions, rate limits)
  - Session management
  - Audit logging
  - Multi-platform routing

### **2. API Gateway (api.lanonasis.com)**
- **Platform**: Netlify Functions
- **Database**: Supabase PostgreSQL
- **Purpose**: Business logic, data storage, AI services
- **Services**:
  - Memory management (`/api/v1/memory/*`)
  - MCP services
  - Data operations
  - AI orchestration

### **3. MCP Gateway (mcp.lanonasis.com)**
- **Platform**: VPS (168.231.74.29)
- **Database**: Supabase PostgreSQL
- **Purpose**: MCP protocol, WebSocket, SSE
- **Services**:
  - MCP WebSocket connections
  - Server-Sent Events (SSE)
  - Real-time communication

---

## 🔐 API Key Authentication Flow

### **User API Keys (lano_* format)**

```
┌─────────────────────────────────────────────────────────┐
│ Client Request with API Key                              │
│ Authorization: Bearer lano_9utj6qtt5uikuf53pz7k1nm0... │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ api.lanonasis.com (Netlify Function)                    │
│ - Extract API key from Authorization header              │
│ - Hash key with SHA-256                                  │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ Supabase Database (api_keys table)                      │
│ - Lookup by key_hash (SHA-256)                          │
│ - Check is_active = true                                 │
│ - Check expires_at (if set)                             │
│ - Return user_id, permissions, metadata                  │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ Request Authorized                                      │
│ - Attach user context to request                        │
│ - Execute business logic                                │
│ - Query memory_entries by user_id                       │
└─────────────────────────────────────────────────────────┘
```

### **Key Storage (SHA-256 Implementation)**

**✅ Current Pattern (Correct):**
- API keys are **hashed with SHA-256** before storage
- Stored in `api_keys.key_hash` column (Supabase)
- **Never stored in plaintext**
- Validation: Hash incoming key → Compare with stored hash

**Database Schema:**
```sql
-- Supabase: api_keys table
CREATE TABLE api_keys (
  id UUID PRIMARY KEY,
  key_hash VARCHAR(64) UNIQUE NOT NULL,  -- SHA-256 hash (64 hex chars)
  name TEXT,
  user_id UUID REFERENCES auth.users(id),
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- ... other metadata
);
```

---

## 🗄️ Database Responsibilities

### **Neon Database (auth.lanonasis.com)**
**Purpose**: Authentication & Authorization Layer

**Stores**:
- ✅ User accounts (`users` table)
- ✅ Sessions (`sessions` table)
- ✅ API key metadata (if using Neon for auth)
- ✅ OAuth tokens (`oauth_tokens` table)
- ✅ Rate limiting data
- ✅ Audit logs
- ✅ Organization/project metadata

**Does NOT store**:
- ❌ Business data (memories, content)
- ❌ Application state
- ❌ User-generated content

### **Supabase Database (api.lanonasis.com)**
**Purpose**: Application Data Layer

**Stores**:
- ✅ Memory entries (`memory_entries` table)
- ✅ API keys (`api_keys` table with SHA-256 hashes)
- ✅ User profiles (`profiles` table)
- ✅ Application data
- ✅ Business logic data

**Does NOT handle**:
- ❌ Primary authentication (delegated to auth-gateway)
- ❌ OAuth flows (delegated to auth-gateway)
- ❌ Session management (delegated to auth-gateway)

---

## 🔄 Request Flow Examples

### **Example 1: List Memories with API Key**

```
1. Client → api.lanonasis.com/api/v1/memory
   Headers: Authorization: Bearer lano_9utj6qtt5uikuf53pz7k1nm0ls0xlreh

2. Netlify Function (maas-api.js)
   - Extract API key
   - Hash: SHA256("lano_9utj6qtt5uikuf53pz7k1nm0ls0xlreh")
   - Query Supabase: SELECT * FROM api_keys WHERE key_hash = '...'

3. Supabase Returns:
   - user_id: "c482cb8c-dc40-41dc-986d-daf0bcb078e5"
   - is_active: true
   - expires_at: null

4. Netlify Function:
   - Query: SELECT * FROM memory_entries WHERE user_id = '...'
   - Return memories to client
```

### **Example 2: OAuth Flow (via auth-gateway)**

```
1. Client → auth.lanonasis.com/oauth/authorize
   (OAuth2 PKCE flow)

2. Auth Gateway (Neon DB)
   - Validate OAuth request
   - Store authorization code
   - Issue access token

3. Client → api.lanonasis.com/api/v1/memory
   Headers: Authorization: Bearer <oauth_token>

4. Netlify Function:
   - Introspect token via auth.lanonasis.com/oauth/introspect
   - Get user_id from introspection
   - Query memory_entries
```

---

## 🎯 Your Presumption: ✅ **CORRECT**

> "Neon doesn't create API keys. Neon is meant to be the auth manager, to help with rate limiting, user management, routing functions for multiple platforms, monitoring etc. Leverages Supabase and stores metadata and other user details because all the actions ultimately route to the Supabase database."

**This is exactly correct!**

### **Neon (auth.lanonasis.com)**
- ✅ Auth manager
- ✅ Rate limiting
- ✅ User management
- ✅ Multi-platform routing
- ✅ Monitoring & audit logs
- ✅ OAuth token management

### **Supabase (api.lanonasis.com)**
- ✅ Stores API keys (hashed)
- ✅ Stores business data (memories, etc.)
- ✅ Stores user profiles
- ✅ Application data layer

### **SHA-256 Implementation**
- ✅ **Still the case** - No changes
- ✅ API keys hashed with SHA-256
- ✅ Stored in Supabase `api_keys.key_hash`
- ✅ Validation: Hash incoming key → Compare with stored hash
- ✅ Neon handles auth metadata, Supabase stores the actual hashed keys

---

## 🧪 Testing Your API Key

Use the provided `test-api-key.sh` script:

```bash
cd apps/dashboard
./test-api-key.sh
```

Or test manually:

```bash
# Test 1: List memories
curl -X GET "https://api.lanonasis.com/api/v1/memory" \
  -H "Authorization: Bearer lano_9utj6qtt5uikuf53pz7k1nm0ls0xlreh" \
  -H "Content-Type: application/json"

# Test 2: Create memory
curl -X POST "https://api.lanonasis.com/api/v1/memory" \
  -H "Authorization: Bearer lano_9utj6qtt5uikuf53pz7k1nm0ls0xlreh" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Memory",
    "content": "Testing API key authentication",
    "memory_type": "context"
  }'

# Test 3: MCP endpoint
curl -X GET "https://mcp.lanonasis.com/health" \
  -H "X-API-Key: lano_9utj6qtt5uikuf53pz7k1nm0ls0xlreh"
```

---

## 📋 Summary

| Component | Database | Purpose | API Keys |
|-----------|----------|---------|----------|
| **auth.lanonasis.com** | Neon | Auth manager, rate limiting, routing | Metadata only |
| **api.lanonasis.com** | Supabase | Business logic, data storage | Stores hashed keys |
| **mcp.lanonasis.com** | Supabase | MCP protocol, real-time | Validates via Supabase |

**Key Point**: Neon manages authentication flow, Supabase stores the actual data (including hashed API keys). The SHA-256 implementation is unchanged and working correctly.

