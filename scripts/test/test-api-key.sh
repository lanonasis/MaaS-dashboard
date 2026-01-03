#!/bin/bash
# Test script for API key: lano_9utj6qtt5uikuf53pz7k1nm0ls0xlreh
# Tests memory services on api.lanonasis.com and mcp.lanonasis.com

API_KEY="vibe_frontend_key_2024"
API_BASE="https://api.lanonasis.com"
MCP_BASE="https://mcp.lanonasis.com"

echo "🔑 Testing API Key: ${API_KEY:0:20}..."
echo ""

# Test 1: Health Check (no auth required)
echo "1️⃣  Testing Health Check (no auth)..."
curl -s -X GET "${API_BASE}/health" | jq '.' || echo "❌ Health check failed"
echo ""

# Test 2: List Memories (GET /api/v1/memory)
echo "2️⃣  Testing GET /api/v1/memory (List Memories)..."
curl -s -X GET "${API_BASE}/api/v1/memory" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" | jq '.' || echo "❌ Failed"
echo ""

# Test 3: Create Memory (POST /api/v1/memory)
echo "3️⃣  Testing POST /api/v1/memory (Create Memory)..."
curl -s -X POST "${API_BASE}/api/v1/memory" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Memory from curl",
    "content": "This is a test memory created via API key authentication",
    "memory_type": "context",
    "tags": ["test", "curl", "api-key"]
  }' | jq '.' || echo "❌ Failed"
echo ""

# Test 4: Get Memory Count
echo "4️⃣  Testing GET /api/v1/memory/count..."
curl -s -X GET "${API_BASE}/api/v1/memory/count" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" | jq '.' || echo "❌ Failed"
echo ""

# Test 5: Get Memory Stats
echo "5️⃣  Testing GET /api/v1/memory/stats..."
curl -s -X GET "${API_BASE}/api/v1/memory/stats" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" | jq '.' || echo "❌ Failed"
echo ""

# Test 6: Search Memories
echo "6️⃣  Testing POST /api/v1/memory/search..."
curl -s -X POST "${API_BASE}/api/v1/memory/search" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "test",
    "limit": 10
  }' | jq '.' || echo "❌ Failed"
echo ""

# Test 7: MCP Health Check
echo "7️⃣  Testing MCP Health Check..."
curl -s -X GET "${MCP_BASE}/health" \
  -H "X-API-Key: ${API_KEY}" \
  -H "Content-Type: application/json" | jq '.' || echo "❌ Failed"
echo ""

# Test 8: Test with X-API-Key header (alternative format)
echo "8️⃣  Testing GET /api/v1/memory with X-API-Key header..."
curl -s -X GET "${API_BASE}/api/v1/memory?limit=5" \
  -H "X-API-Key: ${API_KEY}" \
  -H "Content-Type: application/json" | jq '.' || echo "❌ Failed"
echo ""

echo "✅ Testing complete!"
echo ""
echo "📝 Notes:"
echo "   - API keys are validated using SHA-256 hash lookup"
echo "   - Keys stored in Supabase api_keys table"
echo "   - Format: lano_* (user API keys)"
echo "   - Auth: Bearer token or X-API-Key header"

