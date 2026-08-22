import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";

const AUTH_GATEWAY_URL = import.meta.env.VITE_AUTH_GATEWAY_URL || "https://auth.lanonasis.com";

export default function ExternalIdentityLink() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { session, isLoading } = useSupabaseAuth();
  const [state, setState] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const provider = searchParams.get("provider");
  const workspaceId = searchParams.get("workspace_id");
  const externalUserId = searchParams.get("external_user_id");
  const validRequest = provider === "slack" || provider === "discord";
  const returnPath = useMemo(() => `/link?${searchParams.toString()}`, [searchParams]);

  const linkIdentity = useCallback(async () => {
    if (!session?.access_token || !validRequest || !workspaceId || !externalUserId) return;

    setState("submitting");
    setMessage("");
    try {
      const response = await fetch(`${AUTH_GATEWAY_URL}/v1/auth/identity/external`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          provider,
          workspace_id: workspaceId,
          external_user_id: externalUserId,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(typeof payload.error === "string" ? payload.error : "Unable to link this account");
      }

      setState("success");
      setMessage(`Your ${provider} identity is linked. You can return to the concierge now.`);
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Unable to link this account");
    }
  }, [externalUserId, provider, session?.access_token, validRequest, workspaceId]);

  useEffect(() => {
    if (!isLoading && !session) {
      localStorage.setItem("redirectAfterLogin", returnPath);
      navigate(`/login?redirect=${encodeURIComponent(returnPath)}`, { replace: true });
    }
  }, [isLoading, navigate, returnPath, session]);

  if (isLoading) {
    return <main className="min-h-screen p-8 text-foreground">Checking your session...</main>;
  }

  if (!session) return null;

  if (!validRequest || !workspaceId || !externalUserId) {
    return (
      <main className="min-h-screen p-8 text-foreground">
        <h1 className="text-2xl font-semibold">Invalid account-link request</h1>
        <p className="mt-3 text-muted-foreground">The provider link is incomplete or expired.</p>
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
            This lets the concierge use your authenticated memory context in the selected workspace.
          </p>
        </div>
        {state === "success" ? (
          <p className="rounded-md border border-green-500/40 p-3 text-green-600">{message}</p>
        ) : (
          <button
            type="button"
            className="w-full rounded-md bg-primary px-4 py-3 text-primary-foreground disabled:opacity-60"
            disabled={state === "submitting"}
            onClick={linkIdentity}
          >
            {state === "submitting" ? "Linking..." : "Link account"}
          </button>
        )}
        {state === "error" && <p className="text-sm text-destructive">{message}</p>}
      </section>
    </main>
  );
}
