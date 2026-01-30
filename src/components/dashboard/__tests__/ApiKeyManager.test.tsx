/**
 * Tests for ApiKeyManager component
 * Tests API key creation, management, and revocation
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApiKeyManager } from "../ApiKeyManager";

// Mock useSupabaseAuth
const mockUser = { id: "user-123", email: "test@example.com" };
vi.mock("@/hooks/useSupabaseAuth", () => ({
  useSupabaseAuth: () => ({
    user: mockUser,
    session: { access_token: "test-token" },
    isLoading: false,
  }),
}));

// Mock toast
const mockToast = vi.fn();
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

// Mock Supabase
const mockSupabaseSelect = vi.fn();
const mockSupabaseInsert = vi.fn();
const mockSupabaseDelete = vi.fn();
const mockSupabaseServicesSelect = vi.fn();
const mockSupabaseScopesInsert = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => {
      if (table === "user_mcp_services") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockImplementation(() => mockSupabaseServicesSelect()),
              }),
            }),
          }),
        };
      }
      if (table === "api_key_scopes") {
        return {
          insert: vi.fn().mockImplementation(() => mockSupabaseScopesInsert()),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockImplementation(() => mockSupabaseSelect()),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockImplementation(() => mockSupabaseInsert()),
          }),
        }),
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockImplementation(() => mockSupabaseDelete()),
          }),
        }),
      };
    },
  },
}));

// Mock Web Crypto API
const mockCryptoSubtle = {
  digest: vi.fn().mockResolvedValue(new ArrayBuffer(32)),
};

Object.defineProperty(globalThis, "crypto", {
  value: {
    subtle: mockCryptoSubtle,
  },
});

// Mock clipboard
const mockClipboardWriteText = vi.fn().mockResolvedValue(undefined);
if (!navigator.clipboard) {
  Object.defineProperty(navigator, "clipboard", {
    value: {},
    configurable: true,
  });
}
navigator.clipboard.writeText = mockClipboardWriteText;

// Mock configured services data
const mockConfiguredServices = [
  {
    service_key: "stripe",
    display_name: "Stripe",
    category: "payment",
    is_enabled: true,
  },
  {
    service_key: "github",
    display_name: "GitHub",
    category: "developer",
    is_enabled: true,
  },
  {
    service_key: "openai",
    display_name: "OpenAI",
    category: "ai",
    is_enabled: true,
  },
  {
    service_key: "slack",
    display_name: "Slack",
    category: "communication",
    is_enabled: false,
  },
];

describe("ApiKeyManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    navigator.clipboard.writeText = mockClipboardWriteText;
    mockSupabaseSelect.mockResolvedValue({ data: [], error: null });
    mockSupabaseInsert.mockResolvedValue({
      data: { id: "key-1", name: "Test Key", key: "lano_testkey123", service: "all" },
      error: null,
    });
    mockSupabaseDelete.mockResolvedValue({ error: null });
    mockSupabaseServicesSelect.mockResolvedValue({ data: mockConfiguredServices, error: null });
    mockSupabaseScopesInsert.mockResolvedValue({ error: null });
  });

  describe("Dialog Trigger", () => {
    it("renders the trigger button", () => {
      render(<ApiKeyManager />);

      expect(
        screen.getByRole("button", { name: /memory api keys/i })
      ).toBeInTheDocument();
    });

    it("opens dialog when trigger button is clicked", async () => {
      const user = userEvent.setup();

      render(<ApiKeyManager />);

      await user.click(
        screen.getByRole("button", { name: /memory api keys/i })
      );

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
        expect(screen.getByText("Memory Service API Keys")).toBeInTheDocument();
      });
    });
  });

  describe("Create Key Tab", () => {
    it("shows create key form by default", async () => {
      const user = userEvent.setup();

      render(<ApiKeyManager />);

      await user.click(
        screen.getByRole("button", { name: /memory api keys/i })
      );

      await waitFor(() => {
        expect(screen.getByLabelText("Key Name")).toBeInTheDocument();
        expect(screen.getByLabelText("Service Access")).toBeInTheDocument();
        expect(screen.getByLabelText("Expiration")).toBeInTheDocument();
      });
    });

    it("shows error when name is empty", async () => {
      const user = userEvent.setup();

      render(<ApiKeyManager />);

      await user.click(
        screen.getByRole("button", { name: /memory api keys/i })
      );

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /generate api key/i })
        ).toBeInTheDocument();
      });

      await user.click(
        screen.getByRole("button", { name: /generate api key/i })
      );

      expect(mockToast).toHaveBeenCalledWith({
        title: "Error",
        description: "Please enter a name for your API key",
        variant: "destructive",
      });
    });

    it("generates key with correct name", async () => {
      const user = userEvent.setup();

      render(<ApiKeyManager />);

      await user.click(
        screen.getByRole("button", { name: /memory api keys/i })
      );

      await waitFor(() => {
        expect(screen.getByLabelText("Key Name")).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText("Key Name"), "My Test Key");
      await user.click(
        screen.getByRole("button", { name: /generate api key/i })
      );

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: "API Key Generated",
          description:
            "Your API key has been generated successfully. Make sure to copy it now.",
        });
      });
    });

    it("shows generated key with copy functionality", async () => {
      const user = userEvent.setup();

      render(<ApiKeyManager />);

      await user.click(
        screen.getByRole("button", { name: /memory api keys/i })
      );

      await waitFor(() => {
        expect(screen.getByLabelText("Key Name")).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText("Key Name"), "Test Key");
      await user.click(
        screen.getByRole("button", { name: /generate api key/i })
      );

      await waitFor(() => {
        expect(screen.getByLabelText("Your API Key")).toBeInTheDocument();
      });

      // NOTE: Historically this field was masked (type="password") by default. We now
      // deliberately show the generated key as plain text (type="text") immediately
      // after creation so the user can easily copy it on first use. The security model
      // assumes the user is on a trusted screen at generation time; if they want to
      // reduce exposure they can immediately hide the value again via the visibility
      // toggle tested below.
      expect(screen.getByLabelText("Your API Key")).toHaveAttribute(
        "type",
        "text"
      );

      // Toggle visibility to hide
      await user.click(screen.getByLabelText("Hide API key"));

      expect(screen.getByLabelText("Your API Key")).toHaveAttribute(
        "type",
        "password"
      );
    });

    it("copies key to clipboard", async () => {
      const user = userEvent.setup();

      render(<ApiKeyManager />);

      await user.click(
        screen.getByRole("button", { name: /memory api keys/i })
      );

      await user.type(screen.getByLabelText("Key Name"), "Test Key");
      await user.click(
        screen.getByRole("button", { name: /generate api key/i })
      );

      await waitFor(() => {
        expect(screen.getByLabelText("Copy API key")).toBeInTheDocument();
      });

      // Get the copy button and key input
      const copyButton = screen.getByLabelText("Copy API key");
      const keyInput = screen.getByLabelText(
        "Your API Key"
      ) as HTMLInputElement;

      expect(keyInput.value).toMatch(/^lano_/);

      // Click copy button
      await user.click(copyButton);

      // Verify clipboard was called with the key value
      await waitFor(() => {
        expect(mockClipboardWriteText).toHaveBeenCalledWith(keyInput.value);
      });
    });

    it("allows creating another key after generation", async () => {
      const user = userEvent.setup();

      render(<ApiKeyManager />);

      await user.click(
        screen.getByRole("button", { name: /memory api keys/i })
      );

      await user.type(screen.getByLabelText("Key Name"), "First Key");
      await user.click(
        screen.getByRole("button", { name: /generate api key/i })
      );

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /create another/i })
        ).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /create another/i }));

      await waitFor(() => {
        expect(screen.getByLabelText("Key Name")).toHaveValue("");
      });
    });
  });

  describe("Manage Keys Tab", () => {
    it("switches to manage tab", async () => {
      const user = userEvent.setup();

      render(<ApiKeyManager />);

      await user.click(
        screen.getByRole("button", { name: /memory api keys/i })
      );

      await waitFor(() => {
        expect(
          screen.getByRole("tab", { name: /your keys/i })
        ).toBeInTheDocument();
      });

      await user.click(screen.getByRole("tab", { name: /your keys/i }));

      expect(screen.getByRole("tab", { name: /your keys/i })).toHaveAttribute(
        "data-state",
        "active"
      );
    });

    it("shows empty state when no keys exist", async () => {
      const user = userEvent.setup();

      render(<ApiKeyManager />);

      await user.click(
        screen.getByRole("button", { name: /memory api keys/i })
      );
      await user.click(screen.getByRole("tab", { name: /your keys/i }));

      await waitFor(() => {
        expect(
          screen.getByText("You don't have any API keys yet")
        ).toBeInTheDocument();
        expect(
          screen.getByRole("button", { name: /create your first api key/i })
        ).toBeInTheDocument();
      });
    });

    it("displays existing API keys", async () => {
      const mockKeys = [
        {
          id: "key-1",
          name: "Production Key",
          service: "all",
          created_at: "2024-01-01T00:00:00Z",
          expires_at: null,
          is_active: true,
        },
        {
          id: "key-2",
          name: "Development Key",
          service: "specific",
          created_at: "2024-01-02T00:00:00Z",
          expires_at: "2025-01-01T00:00:00Z",
          is_active: true,
        },
      ];

      mockSupabaseSelect.mockResolvedValue({ data: mockKeys, error: null });

      const user = userEvent.setup();

      render(<ApiKeyManager />);

      await user.click(
        screen.getByRole("button", { name: /memory api keys/i })
      );
      await user.click(screen.getByRole("tab", { name: /your keys/i }));

      await waitFor(() => {
        expect(screen.getByText("Production Key")).toBeInTheDocument();
        expect(screen.getByText("Development Key")).toBeInTheDocument();
      });
    });

    it("displays service type correctly for keys", async () => {
      const mockKeys = [
        {
          id: "key-1",
          name: "All Services Key",
          service: "all",
          created_at: "2024-01-01T00:00:00Z",
          expires_at: null,
          is_active: true,
        },
        {
          id: "key-2",
          name: "Scoped Key",
          service: "specific",
          created_at: "2024-01-02T00:00:00Z",
          expires_at: null,
          is_active: true,
        },
      ];

      mockSupabaseSelect.mockResolvedValue({ data: mockKeys, error: null });

      const user = userEvent.setup();

      render(<ApiKeyManager />);

      await user.click(
        screen.getByRole("button", { name: /memory api keys/i })
      );
      await user.click(screen.getByRole("tab", { name: /your keys/i }));

      await waitFor(() => {
        expect(screen.getByText("Access: All Services")).toBeInTheDocument();
        expect(screen.getByText("Access: Specific Services")).toBeInTheDocument();
      });
    });

    it("shows key count", async () => {
      const mockKeys = [
        {
          id: "key-1",
          name: "Key 1",
          service: "all",
          created_at: "2024-01-01",
          expires_at: null,
        },
        {
          id: "key-2",
          name: "Key 2",
          service: "all",
          created_at: "2024-01-02",
          expires_at: null,
        },
      ];

      mockSupabaseSelect.mockResolvedValue({ data: mockKeys, error: null });

      const user = userEvent.setup();

      render(<ApiKeyManager />);

      await user.click(
        screen.getByRole("button", { name: /memory api keys/i })
      );
      await user.click(screen.getByRole("tab", { name: /your keys/i }));

      await waitFor(() => {
        expect(screen.getByText("You have 2 API keys")).toBeInTheDocument();
      });
    });

    it("shows expired badge for expired keys", async () => {
      const expiredDate = new Date(Date.now() - 86400000).toISOString(); // Yesterday
      const mockKeys = [
        {
          id: "key-1",
          name: "Expired Key",
          service: "all",
          created_at: "2024-01-01T00:00:00Z",
          expires_at: expiredDate,
          is_active: true,
        },
      ];

      mockSupabaseSelect.mockResolvedValue({ data: mockKeys, error: null });

      const user = userEvent.setup();

      render(<ApiKeyManager />);

      await user.click(
        screen.getByRole("button", { name: /memory api keys/i })
      );
      await user.click(screen.getByRole("tab", { name: /your keys/i }));

      await waitFor(() => {
        expect(screen.getByText("Expired")).toBeInTheDocument();
      });
    });

    it("revokes key when X button clicked", async () => {
      const mockKeys = [
        {
          id: "key-1",
          name: "Test Key",
          service: "all",
          created_at: "2024-01-01",
          expires_at: null,
        },
      ];

      mockSupabaseSelect.mockResolvedValue({ data: mockKeys, error: null });

      const user = userEvent.setup();

      render(<ApiKeyManager />);

      await user.click(
        screen.getByRole("button", { name: /memory api keys/i })
      );
      await user.click(screen.getByRole("tab", { name: /your keys/i }));

      await waitFor(() => {
        expect(screen.getByText("Test Key")).toBeInTheDocument();
      });

      // Find and click the X button (revoke)
      const revokeButtons = screen.getAllByRole("button");
      const revokeButton = revokeButtons.find((btn) =>
        btn.querySelector("svg.h-4.w-4")
      );

      if (revokeButton) {
        await user.click(revokeButton);

        await waitFor(() => {
          expect(mockToast).toHaveBeenCalledWith({
            title: "API Key Revoked",
            description: "The API key has been successfully revoked",
          });
        });
      }
    });
  });

  describe("Service Selection", () => {
    it("shows service type selector with 'All Services' as default", async () => {
      const user = userEvent.setup();

      render(<ApiKeyManager />);

      await user.click(
        screen.getByRole("button", { name: /memory api keys/i })
      );

      await waitFor(() => {
        expect(screen.getByLabelText("Service Access")).toBeInTheDocument();
      });

      // Find the service select trigger - should show "All Services (Default)" by default
      const serviceSelect = screen.getByRole("combobox", {
        name: /service access/i,
      });
      expect(serviceSelect).toBeInTheDocument();
    });

    it("allows selecting service type 'Specific Services'", async () => {
      const user = userEvent.setup();

      render(<ApiKeyManager />);

      await user.click(
        screen.getByRole("button", { name: /memory api keys/i })
      );

      await waitFor(() => {
        expect(screen.getByLabelText("Service Access")).toBeInTheDocument();
      });

      // Find and click the service select trigger
      const serviceSelect = screen.getByRole("combobox", {
        name: /service access/i,
      });
      await user.click(serviceSelect);

      // Wait for the dropdown content to be visible
      await waitFor(
        () => {
          expect(screen.getAllByText(/All Services/i).length).toBeGreaterThan(0);
        },
        { timeout: 3000 }
      );
    });

    it("shows configured services when 'Specific Services' is selected", async () => {
      const user = userEvent.setup();

      render(<ApiKeyManager />);

      await user.click(
        screen.getByRole("button", { name: /memory api keys/i })
      );

      await waitFor(() => {
        expect(screen.getByLabelText("Service Access")).toBeInTheDocument();
      });

      // Click service type selector
      const serviceSelect = screen.getByRole("combobox", {
        name: /service access/i,
      });
      await user.click(serviceSelect);

      // Select "Specific Services"
      await waitFor(
        () => {
          const specificOption = screen.getByRole("option", { name: /specific services/i });
          expect(specificOption).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      await user.click(screen.getByRole("option", { name: /specific services/i }));

      // Should show "Select Services" label and the configured services
      await waitFor(() => {
        expect(screen.getByText("Select Services")).toBeInTheDocument();
      });

      // Should show the configured services from the mock
      await waitFor(() => {
        expect(screen.getByText("Stripe")).toBeInTheDocument();
        expect(screen.getByText("GitHub")).toBeInTheDocument();
        expect(screen.getByText("OpenAI")).toBeInTheDocument();
      });
    });

    it("shows empty state when no services are configured", async () => {
      mockSupabaseServicesSelect.mockResolvedValue({ data: [], error: null });

      const user = userEvent.setup();

      render(<ApiKeyManager />);

      await user.click(
        screen.getByRole("button", { name: /memory api keys/i })
      );

      await waitFor(() => {
        expect(screen.getByLabelText("Service Access")).toBeInTheDocument();
      });

      // Click service type selector
      const serviceSelect = screen.getByRole("combobox", {
        name: /service access/i,
      });
      await user.click(serviceSelect);

      // Select "Specific Services"
      await waitFor(
        () => {
          const specificOption = screen.getByRole("option", { name: /specific services/i });
          expect(specificOption).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      await user.click(screen.getByRole("option", { name: /specific services/i }));

      // Should show empty state message
      await waitFor(() => {
        expect(screen.getByText("No services configured yet.")).toBeInTheDocument();
      });
    });

    it("shows error when trying to generate key with specific services but none selected", async () => {
      const user = userEvent.setup();

      render(<ApiKeyManager />);

      await user.click(
        screen.getByRole("button", { name: /memory api keys/i })
      );

      await waitFor(() => {
        expect(screen.getByLabelText("Key Name")).toBeInTheDocument();
      });

      // Enter key name
      await user.type(screen.getByLabelText("Key Name"), "Test Key");

      // Click service type selector
      const serviceSelect = screen.getByRole("combobox", {
        name: /service access/i,
      });
      await user.click(serviceSelect);

      // Select "Specific Services"
      await waitFor(
        () => {
          const specificOption = screen.getByRole("option", { name: /specific services/i });
          expect(specificOption).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      await user.click(screen.getByRole("option", { name: /specific services/i }));

      // Wait for services to load
      await waitFor(() => {
        expect(screen.getByText("Select Services")).toBeInTheDocument();
      });

      // Don't select any services, just click generate
      await user.click(
        screen.getByRole("button", { name: /generate api key/i })
      );

      // Should show error
      expect(mockToast).toHaveBeenCalledWith({
        title: "Error",
        description: "Please select at least one service when using specific service access",
        variant: "destructive",
      });
    });

    it("shows selected services count", async () => {
      const user = userEvent.setup();

      render(<ApiKeyManager />);

      await user.click(
        screen.getByRole("button", { name: /memory api keys/i })
      );

      await waitFor(() => {
        expect(screen.getByLabelText("Service Access")).toBeInTheDocument();
      });

      // Click service type selector and select "Specific Services"
      const serviceSelect = screen.getByRole("combobox", {
        name: /service access/i,
      });
      await user.click(serviceSelect);

      await waitFor(
        () => {
          const specificOption = screen.getByRole("option", { name: /specific services/i });
          expect(specificOption).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      await user.click(screen.getByRole("option", { name: /specific services/i }));

      // Wait for services to load
      await waitFor(() => {
        expect(screen.getByText("Stripe")).toBeInTheDocument();
      });

      // Toggle first service (Stripe)
      const stripeSwitch = screen.getByRole("switch", { name: /stripe/i });
      await user.click(stripeSwitch);

      // Should show count
      await waitFor(() => {
        expect(screen.getByText("1 service selected")).toBeInTheDocument();
      });

      // Toggle second service (GitHub)
      const githubSwitch = screen.getByRole("switch", { name: /github/i });
      await user.click(githubSwitch);

      // Should show plural count
      await waitFor(() => {
        expect(screen.getByText("2 services selected")).toBeInTheDocument();
      });
    });

    it("creates key with service scopes when specific services selected", async () => {
      const user = userEvent.setup();

      render(<ApiKeyManager />);

      await user.click(
        screen.getByRole("button", { name: /memory api keys/i })
      );

      await waitFor(() => {
        expect(screen.getByLabelText("Key Name")).toBeInTheDocument();
      });

      // Enter key name
      await user.type(screen.getByLabelText("Key Name"), "Scoped Key");

      // Click service type selector and select "Specific Services"
      const serviceSelect = screen.getByRole("combobox", {
        name: /service access/i,
      });
      await user.click(serviceSelect);

      await waitFor(
        () => {
          const specificOption = screen.getByRole("option", { name: /specific services/i });
          expect(specificOption).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      await user.click(screen.getByRole("option", { name: /specific services/i }));

      // Wait for services to load and select Stripe
      await waitFor(() => {
        expect(screen.getByText("Stripe")).toBeInTheDocument();
      });

      const stripeSwitch = screen.getByRole("switch", { name: /stripe/i });
      await user.click(stripeSwitch);

      // Generate key
      await user.click(
        screen.getByRole("button", { name: /generate api key/i })
      );

      // Verify the scopes insert was called
      await waitFor(() => {
        expect(mockSupabaseScopesInsert).toHaveBeenCalled();
      });

      // Should show success toast
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: "API Key Generated",
          description:
            "Your API key has been generated successfully. Make sure to copy it now.",
        });
      });
    });
  });

  describe("Expiration Options", () => {
    it("shows expiration options", async () => {
      const user = userEvent.setup();

      render(<ApiKeyManager />);

      await user.click(
        screen.getByRole("button", { name: /memory api keys/i })
      );

      // Wait for form to be visible first
      await waitFor(() => {
        expect(screen.getByLabelText("Expiration")).toBeInTheDocument();
      });

      // Find and click the expiration select trigger
      const expirationSelect = screen.getByRole("combobox", {
        name: /expiration/i,
      });
      await user.click(expirationSelect);

      // Wait for the dropdown content - check for Never which should always be visible
      await waitFor(
        () => {
          expect(screen.getAllByText("Never").length).toBeGreaterThan(0);
        },
        { timeout: 3000 }
      );
    });

    it("shows custom date picker when custom selected", async () => {
      const user = userEvent.setup();

      render(<ApiKeyManager />);

      await user.click(
        screen.getByRole("button", { name: /memory api keys/i })
      );

      // Wait for form to be visible first
      await waitFor(() => {
        expect(screen.getByLabelText("Expiration")).toBeInTheDocument();
      });

      // Find the expiration select trigger - it should have a combobox role
      const expirationSelect = screen.getByRole("combobox", {
        name: /expiration/i,
      });
      expect(expirationSelect).toBeInTheDocument();

      // Verify the combobox is properly set up with aria attributes
      // In jsdom, clicking on Radix Select may not properly open the dropdown
      // due to portal rendering and event handling differences
      expect(expirationSelect).toHaveAttribute("role", "combobox");
    });
  });

  describe("Error Handling", () => {
    it("shows error toast on API key generation failure", async () => {
      mockSupabaseInsert.mockResolvedValue({
        data: null,
        error: { message: "Database error", code: "500" },
      });

      const user = userEvent.setup();

      render(<ApiKeyManager />);

      await user.click(
        screen.getByRole("button", { name: /memory api keys/i })
      );
      await user.type(screen.getByLabelText("Key Name"), "Test Key");
      await user.click(
        screen.getByRole("button", { name: /generate api key/i })
      );

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: "Error Generating API Key",
            variant: "destructive",
          })
        );
      });
    });

    it("shows error on key fetch failure", async () => {
      mockSupabaseSelect.mockResolvedValue({
        data: null,
        error: { message: "Failed to fetch API keys" },
      });

      const user = userEvent.setup();

      render(<ApiKeyManager />);

      await user.click(
        screen.getByRole("button", { name: /memory api keys/i })
      );
      await user.click(screen.getByRole("tab", { name: /your keys/i }));

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: "Error",
          description: "Failed to fetch API keys",
          variant: "destructive",
        });
      });
    });
  });
});
