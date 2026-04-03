---
description: Dashboard-local development guidance for Vite + React builds and API env contracts.
globs: "*.ts, *.tsx, *.html, *.css, *.js, *.jsx, package.json"
alwaysApply: false
---

This app uses Vite + React (SWC), not Bun's HTML bundler.

## Build Toolchain

- Run dashboard scripts through `package.json` scripts:
  - `bun run dev` -> Vite dev server
  - `bun run build` -> Vite production build
  - `bun run preview` -> Vite preview
  - `bun run lint` -> ESLint
- Keep Vite config authoritative in `vite.config.ts`.
- Do not replace Vite routes/build behavior with `Bun.serve()` patterns.

## API Base URL Contract

`src/lib/api-client.ts` resolves API origin with this precedence:

1. `VITE_CORE_API_BASE_URL` (preferred, explicit core/gateway origin)
2. `VITE_API_URL` fallback (legacy; any trailing `/v1` is stripped)
3. `https://api.lanonasis.com` default

Rules:

- Set origins only (for example `https://api.lanonasis.com`).
- Do not append `/api/v1` to env vars.
- Avoid setting `/v1` on `VITE_CORE_API_BASE_URL`.
- `VITE_CORE_API_BASE_URL` wins when both vars are present.

## Intelligence Routing (#133)

- Dashboard intelligence calls must stay on canonical platform routes:
  - `/api/v1/intelligence/*`
- Do not route browser traffic directly to Supabase Edge Function paths (for example `/functions/v1/intelligence-*`).

## Docs Target

- The MCP Services docs button opens `/docs/mcp-router`.
- Keep the docs target at `public/docs/mcp-router/index.html`.
