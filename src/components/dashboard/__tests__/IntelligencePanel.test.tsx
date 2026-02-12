/**
 * Tests for IntelligencePanel component
 * Tests health score display, duplicate detection, and tab navigation
 */

import type { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IntelligencePanel } from "../IntelligencePanel";

// Mock useSupabaseAuth
const mockUser = { id: "user-123", email: "test@example.com" };
vi.mock("@/hooks/useSupabaseAuth", () => ({
  useSupabaseAuth: () => ({
    user: mockUser,
    session: { access_token: "test-token" },
    isLoading: false,
  }),
}));

// Mock useMemoryIntelligence
const mockGetHealthCheck = vi.fn();
const mockDetectDuplicates = vi.fn();

vi.mock("@/hooks/useMemoryIntelligence", () => ({
  useMemoryIntelligence: () => ({
    getHealthCheck: mockGetHealthCheck,
    detectDuplicates: mockDetectDuplicates,
    isReady: true,
    isKeyLoading: false,
  }),
}));

const createHealthCheckResult = (
  score: number,
  status: "healthy" | "needs_attention" | "critical"
) => ({
  overall_score: score,
  metrics: {
    embedding_coverage: 80,
    tagging_consistency: 70,
    type_balance: 60,
    freshness: 50,
  },
  recommendations: ["Add more tags", "Improve embedding coverage"],
  status,
});

const createDuplicatePairs = () => [
  {
    memory_1: {
      id: "1",
      title: "First Memory",
      created_at: "2024-01-01T00:00:00Z",
    },
    memory_2: {
      id: "2",
      title: "Second Memory",
      created_at: "2024-01-02T00:00:00Z",
    },
    similarity_score: 0.92,
    recommendation: "merge" as const,
  },
];

describe("IntelligencePanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetHealthCheck.mockResolvedValue(
      createHealthCheckResult(85, "healthy")
    );
    mockDetectDuplicates.mockResolvedValue([]);
  });

  describe("Full Panel Mode", () => {
    it("renders the intelligence panel with title", async () => {
      render(<IntelligencePanel />);

      expect(screen.getByText("Memory Intelligence")).toBeInTheDocument();
      expect(
        screen.getByText("AI-powered insights and recommendations")
      ).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText("Health Score")).toBeInTheDocument();
      });
    });

    it("displays health tab by default", async () => {
      render(<IntelligencePanel />);

      await waitFor(() => {
        expect(screen.getByRole("tab", { name: /health/i })).toHaveAttribute(
          "data-state",
          "active"
        );
      });
    });

    it("shows health score when data loads", async () => {
      render(<IntelligencePanel />);

      await waitFor(() => {
        expect(screen.getByText("Health Score")).toBeInTheDocument();
      });

      // The score appears in both the badge and main display; use getAllByText
      const scoreElements = screen.getAllByText("85");
      expect(scoreElements.length).toBeGreaterThanOrEqual(1);
    });

    it("shows metrics breakdown", async () => {
      render(<IntelligencePanel />);

      await waitFor(() => {
        expect(screen.getByText("embedding coverage")).toBeInTheDocument();
        expect(screen.getByText("tagging consistency")).toBeInTheDocument();
        expect(screen.getByText("type balance")).toBeInTheDocument();
        expect(screen.getByText("freshness")).toBeInTheDocument();
      });
    });

    it("shows recommendations", async () => {
      render(<IntelligencePanel />);

      await waitFor(() => {
        expect(screen.getByText("Recommendations")).toBeInTheDocument();
        expect(screen.getByText("Add more tags")).toBeInTheDocument();
      });
    });

    it("shows healthy status badge", async () => {
      render(<IntelligencePanel />);

      await waitFor(() => {
        expect(screen.getByText("HEALTHY")).toBeInTheDocument();
      });
    });

    it("shows needs_attention status for medium scores", async () => {
      mockGetHealthCheck.mockResolvedValue(
        createHealthCheckResult(55, "needs_attention")
      );

      render(<IntelligencePanel />);

      await waitFor(() => {
        expect(screen.getByText("NEEDS ATTENTION")).toBeInTheDocument();
      });
    });

    it("switches to duplicates tab when clicked", async () => {
      const user = userEvent.setup();

      render(<IntelligencePanel />);

      await waitFor(() => {
        expect(
          screen.getByRole("tab", { name: /duplicates/i })
        ).toBeInTheDocument();
      });

      await user.click(screen.getByRole("tab", { name: /duplicates/i }));

      expect(screen.getByRole("tab", { name: /duplicates/i })).toHaveAttribute(
        "data-state",
        "active"
      );
    });

    it("shows no duplicates message when empty", async () => {
      const user = userEvent.setup();

      render(<IntelligencePanel />);

      await user.click(screen.getByRole("tab", { name: /duplicates/i }));

      await waitFor(() => {
        expect(screen.getByText("No duplicates found")).toBeInTheDocument();
        expect(
          screen.getByText("Your memory bank is well organized")
        ).toBeInTheDocument();
      });
    });

    it("shows duplicate pairs when found", async () => {
      mockDetectDuplicates.mockResolvedValue(createDuplicatePairs());
      const user = userEvent.setup();

      render(<IntelligencePanel />);

      await user.click(screen.getByRole("tab", { name: /duplicates/i }));

      await waitFor(() => {
        expect(
          screen.getByText("Found 1 potential duplicate pairs")
        ).toBeInTheDocument();
        expect(screen.getByText("First Memory")).toBeInTheDocument();
        expect(screen.getByText("Second Memory")).toBeInTheDocument();
        expect(screen.getByText("92% match")).toBeInTheDocument();
      });
    });

    it("shows duplicate count badge on tab", async () => {
      mockDetectDuplicates.mockResolvedValue(createDuplicatePairs());

      render(<IntelligencePanel />);

      await waitFor(() => {
        // Badge with count 1 should appear
        const duplicatesTab = screen.getByRole("tab", { name: /duplicates/i });
        expect(duplicatesTab).toContainHTML("1");
      });
    });

    it("calls refresh when button clicked", async () => {
      const user = userEvent.setup();

      render(<IntelligencePanel />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /refresh/i })
        ).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /refresh/i }));

      // Functions should be called again
      await waitFor(() => {
        expect(mockGetHealthCheck).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe("Compact Mode", () => {
    it("renders compact view when compact prop is true", async () => {
      render(<IntelligencePanel compact />);

      expect(screen.getByText("Memory Health")).toBeInTheDocument();
      // Should not have tabs in compact mode
      expect(screen.queryByRole("tablist")).not.toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText("85/100")).toBeInTheDocument();
      });
    });

    it("shows health score in compact mode", async () => {
      render(<IntelligencePanel compact />);

      await waitFor(() => {
        expect(screen.getByText("85/100")).toBeInTheDocument();
      });
    });

    it("shows duplicate badge in compact mode when duplicates exist", async () => {
      mockDetectDuplicates.mockResolvedValue(createDuplicatePairs());

      render(<IntelligencePanel compact />);

      await waitFor(() => {
        expect(screen.getByText("1 duplicates")).toBeInTheDocument();
      });
    });
  });

  describe("Optional Props", () => {
    it("hides health score when showHealthScore is false", async () => {
      render(<IntelligencePanel showHealthScore={false} />);

      await waitFor(() => {
        expect(mockDetectDuplicates).toHaveBeenCalledTimes(1);
      });

      // Health tab should still exist but data won't be fetched
      expect(mockGetHealthCheck).not.toHaveBeenCalled();
    });

    it("hides duplicates when showDuplicates is false", async () => {
      render(<IntelligencePanel showDuplicates={false} />);

      await waitFor(() => {
        expect(screen.getByText("Health Score")).toBeInTheDocument();
      });

      // Duplicates won't be fetched
      expect(mockDetectDuplicates).not.toHaveBeenCalled();
    });

    it("calls onMergeMemories callback when provided", async () => {
      const mockOnMerge = vi.fn();
      mockDetectDuplicates.mockResolvedValue(createDuplicatePairs());
      const user = userEvent.setup();

      render(<IntelligencePanel onMergeMemories={mockOnMerge} />);

      await user.click(screen.getByRole("tab", { name: /duplicates/i }));

      await waitFor(() => {
        expect(screen.getByTitle("Merge memories")).toBeInTheDocument();
      });

      await user.click(screen.getByTitle("Merge memories"));

      expect(mockOnMerge).toHaveBeenCalledWith("1", ["2"]);
    });
  });

  describe("Loading States", () => {
    it("shows loading state while fetching", async () => {
      // Make the promise never resolve to see loading state
      mockGetHealthCheck.mockImplementation(() => new Promise(() => {}));
      mockDetectDuplicates.mockImplementation(() => new Promise(() => {}));

      render(<IntelligencePanel />);

      // The loading animation should be visible
      // Looking for the Brain icon with animate-pulse class
      const loadingIndicator = document.querySelector(".animate-pulse");
      expect(loadingIndicator).toBeInTheDocument();
    });
  });

  describe("Error Handling", () => {
    it("shows unable to load message on error", async () => {
      mockGetHealthCheck.mockResolvedValue(null);

      render(<IntelligencePanel />);

      await waitFor(() => {
        expect(
          screen.getByText("Unable to load health data")
        ).toBeInTheDocument();
      });
    });
  });

  describe("Color Coding", () => {
    it("shows green color for scores >= 80", async () => {
      mockGetHealthCheck.mockResolvedValue(
        createHealthCheckResult(85, "healthy")
      );

      render(<IntelligencePanel />);

      await waitFor(() => {
        // Score appears in multiple places, use getAllByText
        const scoreElements = screen.getAllByText("85");
        // At least one should have green color class
        const hasGreenElement = scoreElements.some((el) =>
          el.className.includes("text-green-500")
        );
        expect(hasGreenElement).toBe(true);
      });
    });

    it("shows yellow color for scores between 60-79", async () => {
      mockGetHealthCheck.mockResolvedValue(
        createHealthCheckResult(65, "needs_attention")
      );

      render(<IntelligencePanel />);

      await waitFor(() => {
        // Score appears in multiple places, use getAllByText
        const scoreElements = screen.getAllByText("65");
        // At least one should have yellow color class
        const hasYellowElement = scoreElements.some((el) =>
          el.className.includes("text-yellow-500")
        );
        expect(hasYellowElement).toBe(true);
      });
    });

    it("shows red color for scores < 60", async () => {
      mockGetHealthCheck.mockResolvedValue(
        createHealthCheckResult(45, "critical")
      );

      render(<IntelligencePanel />);

      await waitFor(() => {
        // Score appears in multiple places, use getAllByText
        const scoreElements = screen.getAllByText("45");
        // At least one should have red color class
        const hasRedElement = scoreElements.some((el) =>
          el.className.includes("text-red-500")
        );
        expect(hasRedElement).toBe(true);
      });
    });
  });
});
