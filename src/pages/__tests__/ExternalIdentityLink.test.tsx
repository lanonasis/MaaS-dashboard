import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import ExternalIdentityLink from "../ExternalIdentityLink";

const replaceMock = vi.fn();

// jsdom does not implement navigation — stub window.location.replace so the
// redirect under test is observable without actually changing pages.
const stubLocation = () => {
  Object.defineProperty(window, "location", {
    configurable: true,
    writable: true,
    value: { replace: replaceMock, href: "http://localhost/" },
  });
};

const renderAt = (search: string) =>
  render(
    <MemoryRouter initialEntries={[`/link${search}`]}>
      <ExternalIdentityLink />
    </MemoryRouter>
  );

describe("ExternalIdentityLink", () => {
  afterEach(() => {
    replaceMock.mockReset();
  });

  it("redirects the browser to the gateway /link contract (slack)", () => {
    stubLocation();
    renderAt("?provider=slack&team_id=T123&external_user_id=U456");

    expect(replaceMock).toHaveBeenCalledTimes(1);
    expect(replaceMock).toHaveBeenCalledWith(
      "https://auth.lanonasis.com/link?provider=slack&team_id=T123&external_user_id=U456"
    );
  });

  it("redirects the browser to the gateway /link contract (discord)", () => {
    stubLocation();
    renderAt("?provider=discord&team_id=G123&external_user_id=U456");

    expect(replaceMock).toHaveBeenCalledWith(
      "https://auth.lanonasis.com/link?provider=discord&team_id=G123&external_user_id=U456"
    );
  });

  it("does not redirect when team_id is missing and shows an invalid-request page", () => {
    stubLocation();
    renderAt("?provider=slack&external_user_id=U456");

    expect(replaceMock).not.toHaveBeenCalled();
    expect(screen.getByText("Invalid account-link request")).toBeInTheDocument();
  });

  it("rejects unsupported providers", () => {
    stubLocation();
    renderAt("?provider=telegram&team_id=T123&external_user_id=U456");

    expect(replaceMock).not.toHaveBeenCalled();
    expect(screen.getByText("Invalid account-link request")).toBeInTheDocument();
  });
});
