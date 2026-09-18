/**
 * Tests for the Documentation button on MCPServicesPage.
 *
 * Regression coverage for the fix that routes the Documentation button
 * through `import.meta.env.VITE_DOCS_URL` (with a fallback to
 * https://docs.lanonasis.com) instead of a relative /docs/mcp-router path.
 *
 * Both behaviors are tested:
 *   1. When VITE_DOCS_URL is not set, clicking the button opens the default
 *      `https://docs.lanonasis.com` URL.
 *   2. When VITE_DOCS_URL IS set, clicking the button opens THAT URL.
 *
 * `vi.stubEnv` is the canonical Vitest API for overriding `import.meta.env`
 * values inside a test — see https://vitest.dev/api/vi.html#vi-stubenv.
 */

import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

const DEFAULT_DOCS_URL = "https://docs.lanonasis.com";
const STUBBED_DOCS_URL = "https://docs.example.com/v2/mcp";

// Mock heavy dependencies so the page renders without touching Supabase,
// the service catalog, or the modal. The Documentation button is rendered
// unconditionally in the header, so none of these need real implementations.
vi.mock("@/hooks/useSupabaseAuth", () => ({
  useSupabaseAuth: () => ({
    user: { id: "user-123", email: "test@example.com" },
    session: { access_token: "test-token" },
    isLoading: false,
  }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/lib/mcp-router", () => {
  class ServiceCatalogManager {
    static getServices = vi.fn().mockResolvedValue([]);
  }
  class UserServicesManager {
    constructor(_masterPassword: string) {
      void _masterPassword;
    }
    getUserServices = vi.fn().mockResolvedValue([]);
  }
  return { ServiceCatalogManager, UserServicesManager };
});

vi.mock("@/components/mcp-router/ServiceConfigureModal", () => ({
  ServiceConfigureModal: () => null,
}));

import { MCPServicesPage } from "../MCPServicesPage";

describe("MCPServicesPage — Documentation button", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    cleanup();
    vi.restoreAllMocks();
  });

  it("opens the default docs URL when VITE_DOCS_URL is not set", async () => {
    // Ensure VITE_DOCS_URL is unset for this case.
    vi.stubEnv("VITE_DOCS_URL", "");

    const openSpy = vi
      .spyOn(window, "open")
      .mockImplementation(() => null as unknown as Window | null);

    render(<MCPServicesPage />);

    const button = await screen.findByRole("button", { name: /documentation/i });
    fireEvent.click(button);

    expect(openSpy).toHaveBeenCalledTimes(1);
    expect(openSpy).toHaveBeenCalledWith(DEFAULT_DOCS_URL, "_blank");
  });

  it("opens VITE_DOCS_URL when the env var is set", async () => {
    vi.stubEnv("VITE_DOCS_URL", STUBBED_DOCS_URL);

    const openSpy = vi
      .spyOn(window, "open")
      .mockImplementation(() => null as unknown as Window | null);

    render(<MCPServicesPage />);

    const button = await screen.findByRole("button", { name: /documentation/i });
    fireEvent.click(button);

    expect(openSpy).toHaveBeenCalledTimes(1);
    expect(openSpy).toHaveBeenCalledWith(STUBBED_DOCS_URL, "_blank");
  });
});

describe("MCPServicesPage — Documentation button snapshot", () => {
  beforeEach(() => {
    // Restore any per-test stub before snapshot cases set their own.
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    cleanup();
    vi.restoreAllMocks();
  });

  it("resolves the Documentation button target to VITE_DOCS_URL when set", async () => {
    vi.stubEnv("VITE_DOCS_URL", STUBBED_DOCS_URL);

    const openSpy = vi
      .spyOn(window, "open")
      .mockImplementation(() => null as unknown as Window | null);

    render(<MCPServicesPage />);

    const button = await screen.findByRole("button", { name: /documentation/i });
    fireEvent.click(button);

    // Capture the resolved URL exactly as the component passes it to window.open.
    const callArgs = openSpy.mock.calls[0];
    expect(callArgs).toBeDefined();
    const [resolvedUrl, target] = callArgs as unknown as [string, string];

    // Snapshot the resolved URL + target. If this fails, either:
    //   - the URL selection logic regressed (most common cause), or
    //   - the button wiring changed and the snapshot needs review.
    expect({ url: resolvedUrl, target }).toMatchSnapshot();

    // Inline hard-coded expectation guards against snapshot blind acceptance.
    expect(resolvedUrl).toBe(STUBBED_DOCS_URL);
    expect(target).toBe("_blank");
  });

  it("falls back to the default docs URL when VITE_DOCS_URL is unset", async () => {
    vi.stubEnv("VITE_DOCS_URL", "");

    const openSpy = vi
      .spyOn(window, "open")
      .mockImplementation(() => null as unknown as Window | null);

    render(<MCPServicesPage />);

    const button = await screen.findByRole("button", { name: /documentation/i });
    fireEvent.click(button);

    const callArgs = openSpy.mock.calls[0];
    expect(callArgs).toBeDefined();
    const [resolvedUrl, target] = callArgs as unknown as [string, string];

    expect({ url: resolvedUrl, target }).toMatchSnapshot();
    expect(resolvedUrl).toBe(DEFAULT_DOCS_URL);
    expect(target).toBe("_blank");
  });
});