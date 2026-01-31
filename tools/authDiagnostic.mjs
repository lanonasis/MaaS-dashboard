#!/usr/bin/env node

// Simple Supabase auth diagnostic using Node 20+ global fetch
// Usage:
// VITE_SUPABASE_URL=https://<project-ref>.supabase.co

const url =
  process.env.VITE_SUPABASE_URL || "https://<project-ref>.supabase.co";
const anon =
  process.env.VITE_SUPABASE_ANON_KEY || "REDACTED_SUPABASE_ANON_KEY";
const email = process.env.DIAG_EMAIL;
const phone = process.env.DIAG_PHONE;
const pass = process.env.DIAG_PASSWORD;

if (!url || !anon) {
  console.error(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables."
  );
  process.exit(1);
}

if (!pass || (!email && !phone)) {
  console.error("Missing DIAG_PASSWORD and either DIAG_EMAIL or DIAG_PHONE");
  process.exit(1);
}

(async () => {
  try {
    console.log("Checking /auth/v1/token password grant...");
    const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        "apikey": anon,
        "Authorization": `Bearer ${anon}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ...(email ? { email } : { phone }), password: pass }),
    });

    console.log("Status:", res.status, res.statusText);
    const body = await res.text();
    console.log("Body:", body.slice(0, 500));
    process.exit(res.ok ? 0 : 2);
  } catch (e) {
    console.error("Diagnostic failed:", e);
    process.exit(2);
  }
})();
