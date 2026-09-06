import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { centralAuth } from '../central-auth';

/**
 * Regression guard for the production CORS failure on
 * POST /v1/auth/token/exchange.
 *
 * The request was sent with `Content-Type: application/json` and NO body. The
 * gateway's JSON parser rejects that with a 400 emitted before its CORS
 * middleware runs, so the response carries no Access-Control-Allow-Origin.
 * The browser surfaces it as "blocked by CORS policy" / "Failed to fetch" and
 * the real 400 is never visible — which is why this read as an infrastructure
 * problem rather than a client bug.
 *
 * Verified against the live gateway:
 *   no body                          -> 400, no ACAO   (browser blocks)
 *   {project_scope, platform} body   -> 401, ACAO present
 *
 * These tests assert on the *request* the client builds, not on any response,
 * so they stay meaningful regardless of gateway behaviour.
 */
describe('centralAuth.exchangeSupabaseToken request shape', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const getRequestInit = (): RequestInit => {
    expect(fetchMock).toHaveBeenCalledTimes(1);
    return fetchMock.mock.calls[0][1] as RequestInit;
  };

  it('sends a non-empty JSON body (the actual production bug)', async () => {
    await centralAuth.exchangeSupabaseToken('supabase-access-token');

    const init = getRequestInit();
    expect(init.body).toBeDefined();
    expect(typeof init.body).toBe('string');
    expect((init.body as string).length).toBeGreaterThan(0);
  });

  it('sends a body parseable as a JSON object, never a bare literal', async () => {
    await centralAuth.exchangeSupabaseToken('supabase-access-token');

    const parsed = JSON.parse(getRequestInit().body as string);
    expect(parsed).toBeTypeOf('object');
    expect(parsed).not.toBeNull();
    expect(Array.isArray(parsed)).toBe(false);
  });

  it('includes the fields the gateway handler reads', async () => {
    // Deployed handler: req.body.project_scope || req.headers['x-project-scope']
    await centralAuth.exchangeSupabaseToken('supabase-access-token');

    const parsed = JSON.parse(getRequestInit().body as string);
    expect(parsed).toHaveProperty('project_scope');
    expect(parsed).toHaveProperty('platform');
    expect(parsed.project_scope).toBeTruthy();
    expect(parsed.platform).toBeTruthy();
  });

  it('never declares a JSON content type without a body', async () => {
    await centralAuth.exchangeSupabaseToken('supabase-access-token');

    const init = getRequestInit();
    const headers = init.headers as Record<string, string>;
    if (headers?.['Content-Type']?.includes('application/json')) {
      expect(init.body).toBeTruthy();
    }
  });

  it('still forwards the bearer token and cross-domain credentials', async () => {
    await centralAuth.exchangeSupabaseToken('supabase-access-token');

    const init = getRequestInit();
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer supabase-access-token');
    // SSO cookies are set on .lanonasis.com; without this the exchange is pointless.
    expect(init.credentials).toBe('include');
    expect(init.method).toBe('POST');
  });
});
