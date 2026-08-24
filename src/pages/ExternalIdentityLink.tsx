import { useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

const AUTH_GATEWAY_URL = import.meta.env.VITE_AUTH_GATEWAY_URL || "https://auth.lanonasis.com";

const SUPPORTED_PROVIDERS = new Set(["slack", "discord"]);

/**
 * External chat-platform account linking.
 *
 * The concierge (Slack/Discord) sends users to
 * `/link?provider=slack|discord&team_id=...&external_user_id=...` on the
 * dashboard. The actual linking is performed by the auth gateway's deployed
 * GET /link contract (onasis-core auth-gateway, IdentityResolutionService):
 *
 *   - gateway verifies its own `lanonasis_session` cookie;
 *   - unauthenticated browsers are 302'd to `/web/login?return_to=/link?...`
 *     (the gateway login flow establishes the cookie);
 *   - then it writes the `auth_credentials` row for `team_id:external_user_id`.
 *
 * This page is a thin browser redirect to that contract: no bearer-token
 * exchange and no dashboard-side session requirement — the gateway owns
 * authentication. Redirecting the top-level window (not history.pushState)
 * keeps the browser inside the gateway's cookie domain.
 */
export default function ExternalIdentityLink() {
  const [searchParams] = useSearchParams();

  const provider = searchParams.get("provider");
  const teamId = searchParams.get("team_id");
  const externalUserId = searchParams.get("external_user_id");

  const validRequest =
    provider !== null &&
    SUPPORTED_PROVIDERS.has(provider) &&
    Boolean(teamId) &&
    Boolean(externalUserId);

  const gatewayLinkUrl = useMemo(() => {
    if (!validRequest) return null;
    const params = new URLSearchParams();
    params.set("provider", provider as string);
    params.set("team_id", teamId as string);
    params.set("external_user_id", externalUserId as string);
    return `${AUTH_GATEWAY_URL}/link?${params.toString()}`;
  }, [externalUserId, provider, teamId, validRequest]);

  useEffect(() => {
    if (gatewayLinkUrl) {
      window.location.replace(gatewayLinkUrl);
    }
  }, [gatewayLinkUrl]);

  if (!validRequest || !gatewayLinkUrl) {
    return (
      <main className="min-h-screen p-8 text-foreground">
        <h1 className="text-2xl font-semibold">Invalid account-link request</h1>
        <p className="mt-3 text-muted-foreground">
          The provider link is incomplete or expired. Please return to the concierge and try again.
        </p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-8 text-foreground">
      <section className="w-full max-w-lg space-y-5 rounded-lg border border-border p-8">
        <div>
          <p className="text-sm text-muted-foreground">LanOnasis concierge</p>
          <h1 className="mt-2 text-2xl font-semibold">Link your {provider} identity</h1>
          <p className="mt-3 text-muted-foreground">
            Redirecting you to the secure account-linking flow. If you are not redirected
            automatically,{" "}
            <a href={gatewayLinkUrl} className="underline">
              continue here
            </a>
            .
          </p>
        </div>
      </section>
    </main>
  );
}
