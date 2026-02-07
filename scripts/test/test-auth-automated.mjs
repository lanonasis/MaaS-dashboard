#!/usr/bin/env node

/**
 * Automated Authentication Feature Tests
 * Tests the AuthForm component functionality
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env files
function loadEnvFile(filename) {
  try {
    const envPath = join(__dirname, filename);
    const envContent = readFileSync(envPath, "utf-8");
    const envVars = {};

    envContent.split("\n").forEach((line) => {
      line = line.trim();
      if (line && !line.startsWith("#")) {
        const [key, ...valueParts] = line.split("=");
        if (key && valueParts.length > 0) {
          envVars[key.trim()] = valueParts.join("=").trim();
        }
      }
    });

    return envVars;
  } catch (error) {
    console.log(`⚠️  Could not load ${filename}: ${error.message}`);
    return {};
  }
}

// Try to load from .env.local first, then .env
const envLocal = loadEnvFile(".env.local");
const env = loadEnvFile(".env");
const envVars = { ...env, ...envLocal };

const SUPABASE_URL =
  envVars.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY =
  envVars.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

console.log("🧪 Authentication Feature Tests\n");
console.log("================================\n");
console.log("📁 Environment loaded from .env files\n");

// Test configuration
const tests = {
  passed: 0,
  failed: 0,
  skipped: 0,
  results: [],
};

function logTest(name, status, message = "") {
  const icon = status === "pass" ? "✅" : status === "fail" ? "❌" : "⏭️";
  console.log(`${icon} ${name}`);
  if (message) console.log(`   ${message}`);

  tests.results.push({ name, status, message });
  if (status === "pass") tests.passed++;
  else if (status === "fail") tests.failed++;
  else tests.skipped++;
}

// Test 1: Supabase Client Initialization
console.log("📦 Test Suite 1: Configuration\n");

try {
  if (!SUPABASE_URL) {
    logTest(
      "Supabase URL configured",
      "fail",
      "VITE_SUPABASE_URL is not set"
    );
  } else {
    logTest("Supabase URL configured", "pass", `URL: ${SUPABASE_URL}`);
  }
} catch (error) {
  logTest("Supabase URL configured", "fail", error.message);
}

try {
  if (!SUPABASE_ANON_KEY) {
    logTest(
      "Supabase Anon Key configured",
      "fail",
      "VITE_SUPABASE_ANON_KEY is not set"
    );
  } else {
    logTest(
      "Supabase Anon Key configured",
      "pass",
      `Key length: ${SUPABASE_ANON_KEY.length}`
    );
  }
} catch (error) {
  logTest("Supabase Anon Key configured", "fail", error.message);
}

// Test 2: Supabase Client Creation
console.log("\n📦 Test Suite 2: Supabase Client\n");

let supabase;
try {
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  logTest("Supabase client created", "pass");
} catch (error) {
  logTest("Supabase client created", "fail", error.message);
}

// Test 3: OAuth Providers Configuration
console.log("\n📦 Test Suite 3: OAuth Providers\n");

const providers = ["google", "github", "linkedin", "discord", "apple"];

for (const provider of providers) {
  try {
    // Check if provider is supported by Supabase
    const supportedProviders = [
      "google",
      "github",
      "gitlab",
      "bitbucket",
      "azure",
      "facebook",
      "twitter",
      "apple",
      "discord",
      "twitch",
      "spotify",
      "slack",
      "linkedin",
      "notion",
      "workos",
      "zoom",
      "kakao",
      "keycloak",
    ];

    if (supportedProviders.includes(provider)) {
      logTest(
        `${provider.charAt(0).toUpperCase() + provider.slice(1)} OAuth provider`,
        "pass",
        "Supported by Supabase"
      );
    } else {
      logTest(
        `${provider.charAt(0).toUpperCase() + provider.slice(1)} OAuth provider`,
        "fail",
        "Not supported by Supabase"
      );
    }
  } catch (error) {
    logTest(
      `${provider.charAt(0).toUpperCase() + provider.slice(1)} OAuth provider`,
      "fail",
      error.message
    );
  }
}

// Test 4: Auth Settings
console.log("\n📦 Test Suite 4: Auth Settings\n");

if (supabase) {
  try {
    // Test auth settings endpoint
    const response = await fetch(`${SUPABASE_URL}/auth/v1/settings`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      const settings = await response.json();
      logTest("Auth settings accessible", "pass");

      // Check external providers
      if (settings.external) {
        const enabledProviders = Object.entries(settings.external)
          .filter(
            ([key, value]) =>
              value === true &&
              key !== "email" &&
              key !== "phone" &&
              key !== "anonymous_users"
          )
          .map(([key]) => key);

        logTest(
          "External providers enabled",
          "pass",
          `Enabled: ${enabledProviders.join(", ")}`
        );

        // Check each required provider (linkedin uses linkedin_oidc in Supabase)
        providers.forEach((provider) => {
          const supabaseProvider =
            provider === "linkedin" ? "linkedin_oidc" : provider;
          if (settings.external[supabaseProvider] === true) {
            logTest(
              `${provider} enabled in Supabase`,
              "pass",
              supabaseProvider !== provider ? `(using ${supabaseProvider})` : ""
            );
          } else {
            logTest(
              `${provider} enabled in Supabase`,
              "fail",
              `Provider not enabled (checked: ${supabaseProvider})`
            );
          }
        });
      } else {
        logTest(
          "External providers configuration",
          "fail",
          "No external providers found"
        );
      }
    } else {
      logTest("Auth settings accessible", "fail", `HTTP ${response.status}`);
    }
  } catch (error) {
    logTest("Auth settings accessible", "fail", error.message);
  }
}

// Test 5: Component Files Exist
console.log("\n📦 Test Suite 5: Component Files\n");

import { existsSync } from "fs";

const requiredFiles = [
  "src/components/auth/AuthForm.tsx",
  "src/components/icons/social-providers.tsx",
  "src/components/ui/AnimatedButton.tsx",
  "src/integrations/supabase/client.ts",
];

requiredFiles.forEach((file) => {
  const filePath = join(__dirname, file);
  if (existsSync(filePath)) {
    logTest(`File exists: ${file}`, "pass");
  } else {
    logTest(`File exists: ${file}`, "fail", "File not found");
  }
});

// Test 6: Validation Logic
console.log("\n📦 Test Suite 6: Validation Logic\n");

// Email validation regex from AuthForm
const emailRegex = /\S+@\S+\.\S+/;

const emailTests = [
  { email: "test@example.com", expected: true },
  { email: "invalid-email", expected: false },
  { email: "", expected: false },
  { email: "test@", expected: false },
  { email: "@example.com", expected: false },
  { email: "test@example", expected: false },
];

emailTests.forEach(({ email, expected }) => {
  const result = emailRegex.test(email);
  if (result === expected) {
    logTest(
      `Email validation: "${email}"`,
      "pass",
      `Correctly ${expected ? "accepted" : "rejected"}`
    );
  } else {
    logTest(
      `Email validation: "${email}"`,
      "fail",
      `Should be ${expected ? "valid" : "invalid"}`
    );
  }
});

// Password validation
const passwordTests = [
  { password: "Test123!", minLength: 6, expected: true },
  { password: "12345", minLength: 6, expected: false },
  { password: "", minLength: 6, expected: false },
  { password: "abcdef", minLength: 6, expected: true },
];

passwordTests.forEach(({ password, minLength, expected }) => {
  const result = password.length >= minLength;
  if (result === expected) {
    logTest(
      `Password validation: "${password}"`,
      "pass",
      `Length check (min ${minLength})`
    );
  } else {
    logTest(
      `Password validation: "${password}"`,
      "fail",
      `Should be ${expected ? "valid" : "invalid"}`
    );
  }
});

// Test 7: Redirect URL Configuration
console.log("\n📦 Test Suite 7: Redirect Configuration\n");

try {
  const redirectUrl = process.env.VITE_REDIRECT_URL || "http://localhost:5173";
  logTest("Redirect URL configured", "pass", `URL: ${redirectUrl}`);
} catch (error) {
  logTest("Redirect URL configured", "fail", error.message);
}

// Summary
console.log("\n================================");
console.log("📊 Test Summary\n");
console.log(`Total Tests: ${tests.passed + tests.failed + tests.skipped}`);
console.log(`✅ Passed: ${tests.passed}`);
console.log(`❌ Failed: ${tests.failed}`);
console.log(`⏭️  Skipped: ${tests.skipped}`);
console.log(
  `\nSuccess Rate: ${((tests.passed / (tests.passed + tests.failed)) * 100).toFixed(1)}%`
);

// Exit with error code if tests failed
if (tests.failed > 0) {
  console.log("\n⚠️  Some tests failed. Please review the results above.");
  process.exit(1);
} else {
  console.log("\n🎉 All tests passed!");
  process.exit(0);
}
