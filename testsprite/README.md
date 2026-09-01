# Dashboard TestSprite — E2E Credential Isolation (PR #49 fix)

Status: applied 2026-08-12 · Owner: Derick (L-Zero ops)

## Problem

The TestSprite **forgot-password** test and the **password recovery completion** test
share the same account that the authenticated suite uses as its login credential.
Supabase invalidates the account's current password once the recovery flow touches it
(even when the flow is not completed), so:

- After a forgot-password run, every authenticated test fails with
  `invalid login credentials` (observed: 10 tests blocked).
- The reset-password flow changes the password, but the TestSprite portal
  credential is not updated automatically.

## Design: two dedicated fixture users, never shared

| Fixture | Email (placeholder) | Used by | Password lifecycle |
|---|---|---|---|
| Suite credential | `e2e.auth@lanonasis.com` | All authenticated suite tests | **Never** targeted by recovery tests. Portal credential = this user. |
| Recovery fixture | `e2e.recovery@lanonasis.com` | Forgot-password + reset-completion tests only | Drift is harmless: these tests request a fresh reset link each run and never log in with the current password. |

Rules enforced in the test plans:

1. Forgot-password / reset-completion tests **must** fill `e2e.recovery@lanonasis.com`.
2. The portal frontend credential for project `LanOnasis Dashboard`
   (`9db06d2e-0386-4e18-a194-9dbe2e91de12`) must be set to the suite user
   (`e2e.auth@lanonasis.com`) — never the recovery fixture.
3. The recovery-completion test still needs a **recovery-link source**
   (test email inbox for the fixture, or Supabase admin `generate_link` with a
   scoped service-role key). Without one, step 6 of the plan stays blocked.

## Portal-only actions (not exposed via CLI)

- Set project frontend credential → suite user (`e2e.auth@lanonasis.com`).
- Add the amended/new tests to the **Dashboard Full Suite** list:
  - `76df39be-f006-4ce3-8609-5562c6f94f3a` — Forgot password (amended, recovery fixture)
  - `0f57ef63-4dac-480b-9ee8-0cddc39126ce` — Password recovery completion (amended)

## Supabase project facts (read-only check 2026-08-12)

- Project ref: `mxtsdgkwzjzlttpotole`
- `mailer_autoconfirm: true`, `mailer_allow_unverified_email_sign_ins: false`
- Public signup currently fails with `Database error saving new user`
  (likely the Neon user-sync trigger) — verify before creating new fixture users.

## ⚠️ P0 security finding

The live dashboard bundle (`assets/index-*.js` served by dashboard.lanonasis.com)
contains a **Supabase service_role JWT** for `mxtsdgkwzjzlttpotole` in addition to
the anon key. A service_role key must never be shipped to the browser — anyone can
use it to read/write the database. Action: rotate the key in the Supabase dashboard
and remove it from the client bundle (use anon key only; move admin calls behind a
backend/edge function).
