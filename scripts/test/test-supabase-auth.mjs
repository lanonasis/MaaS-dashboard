#!/usr/bin/env node

// Test Supabase auth configuration
const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const TEST_EMAIL = "test@example.com";
const TEST_PASS = "TestPassword123!";

console.log("🔍 Testing Supabase Auth Configuration...\n");
console.log(`Supabase URL: ${SUPABASE_URL}`);
console.log(`Test Email: ${TEST_EMAIL}\n`);

try {
  // Test 1: Check if Supabase is reachable
  console.log("1️⃣ Testing Supabase connectivity...");
  const healthCheck = await fetch(`${SUPABASE_URL}/auth/v1/settings`);
  console.log(`   Status: ${healthCheck.status} ${healthCheck.statusText}`);
  
  if (healthCheck.ok) {
    console.log("   ✅ Supabase is reachable\n");
  } else {
    console.log("   ❌ Supabase health check failed\n");
  }

  // Test 2: Try password grant (will fail without real credentials, but shows the error)
  console.log("2️⃣ Testing password grant endpoint...");
  console.log("   (This will fail without valid credentials, but shows us the error type)\n");
  
  const authTest = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": "fake-key-for-testing"
    },
    body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASS })
  });

  console.log(`   Response Status: ${authTest.status} ${authTest.statusText}`);
  const errorBody = await authTest.text();
  console.log(`   Response Body: ${errorBody}\n`);

  // Diagnose the error
  if (authTest.status === 400) {
    if (errorBody.includes("invalid_grant") || errorBody.includes("Invalid")) {
      console.log("📋 Diagnosis: Invalid credentials (expected with test data)");
    } else if (errorBody.includes("Email signups not allowed")) {
      console.log("📋 Diagnosis: Email/password auth is DISABLED in Supabase");
      console.log("   ⚠️  ACTION REQUIRED: Enable email auth in Supabase Dashboard");
    } else if (errorBody.includes("apikey")) {
      console.log("📋 Diagnosis: Invalid or missing API key");
      console.log("   ⚠️  ACTION REQUIRED: Check VITE_SUPABASE_ANON_KEY");
    } else {
      console.log("📋 Diagnosis: Unknown 400 error");
      console.log("   Response details above ☝️");
    }
  }

  console.log("\n✅ Diagnostic complete!");

} catch (error) {
  console.error("❌ Error:", error.message);
  process.exit(1);
}
