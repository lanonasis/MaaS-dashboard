import type { ReactNode } from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryAnalytics } from '../MemoryAnalytics';
import {
  usePatternAnalysis,
  useHealthCheck,
  useInsightExtraction,
  useDuplicateDetection
} from '@/hooks/useMemoryIntelligence';

vi.mock('@/hooks/useMemoryIntelligence', () => ({
  usePatternAnalysis: vi.fn(),
  useHealthCheck: vi.fn(),
  useInsightExtraction: vi.fn(),
  useDuplicateDetection: vi.fn(),
}));

vi.mock('recharts', () => {
  const Mock = ({ children }: { children?: ReactNode }) => <div>{children}</div>;
  return {
    ResponsiveContainer: Mock,
    PieChart: Mock,
    Pie: Mock,
    Cell: () => null,
    AreaChart: Mock,
    Area: () => null,
    XAxis: () => null,
    YAxis: () => null,
    CartesianGrid: () => null,
    Tooltip: () => null,
    RadarChart: Mock,
    PolarGrid: () => null,
    PolarAngleAxis: () => null,
    PolarRadiusAxis: () => null,
    Radar: () => null,
  };
});

const mockUsePatternAnalysis = vi.mocked(usePatternAnalysis);
const mockUseHealthCheck = vi.mocked(useHealthCheck);
const mockUseInsightExtraction = vi.mocked(useInsightExtraction);
const mockUseDuplicateDetection = vi.mocked(useDuplicateDetection);

const createPatternData = () => ({
  total_memories: 12,
  memories_by_type: { context: 5, project: 7 },
  memories_by_day_of_week: { Monday: 4, Tuesday: 8 },
  peak_creation_hours: [9, 14, 18],
  average_content_length: 120,
  most_common_tags: [
    { tag: 'alpha', count: 5 },
    { tag: 'beta', count: 3 }
  ],
  creation_velocity: { daily_average: 0.4, trend: 'increasing' as const },
  insights: ['Keep it up']
});

const createHealthData = () => ({
  overall_score: 82,
  metrics: {
    embedding_coverage: 80,
    tagging_consistency: 70,
    type_balance: 50,
    freshness: 60
  },
  recommendations: ['Add more tags'],
  status: 'healthy' as const
});

const createInsights = () => ([
  {
    category: 'pattern' as const,
    title: 'Memory boost',
    description: 'Stable cadence in the last week.',
    confidence: 0.8,
    supporting_memories: []
  }
]);

const createDuplicates = () => ([
  {
    memory_1: { id: '1', title: 'First memory', created_at: '2024-01-01T00:00:00Z' },
    memory_2: { id: '2', title: 'Second memory', created_at: '2024-01-02T00:00:00Z' },
    similarity_score: 0.92,
    recommendation: 'merge' as const
  }
]);

beforeEach(() => {
  mockUsePatternAnalysis.mockReset();
  mockUseHealthCheck.mockReset();
  mockUseInsightExtraction.mockReset();
  mockUseDuplicateDetection.mockReset();
});

it('renders the session not ready state', () => {
  mockUsePatternAnalysis.mockReturnValue({
    data: null,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    isReady: false,
    isKeyLoading: false
  });
  mockUseHealthCheck.mockReturnValue({
    data: null,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    isReady: false,
    isKeyLoading: false
  });
  mockUseInsightExtraction.mockReturnValue({
    data: [],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    isReady: false,
    isKeyLoading: false
  });
  mockUseDuplicateDetection.mockReturnValue({
    data: [],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    isReady: false,
    isKeyLoading: false
  });

  render(<MemoryAnalytics />);

  expect(screen.getByText('Session not ready')).toBeInTheDocument();
  expect(screen.getByText('Memory Intelligence')).toBeInTheDocument();
});

it('shows the empty state when there are no memories', () => {
  mockUsePatternAnalysis.mockReturnValue({
    data: {
      total_memories: 0,
      memories_by_type: {},
      memories_by_day_of_week: {},
      peak_creation_hours: [],
      average_content_length: 0,
      most_common_tags: [],
      creation_velocity: { daily_average: 0, trend: 'stable' as const },
      insights: []
    },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    isReady: true,
    isKeyLoading: false
  });
  mockUseHealthCheck.mockReturnValue({
    data: null,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    isReady: true,
    isKeyLoading: false
  });
  mockUseInsightExtraction.mockReturnValue({
    data: [],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    isReady: true,
    isKeyLoading: false
  });
  mockUseDuplicateDetection.mockReturnValue({
    data: [],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    isReady: true,
    isKeyLoading: false
  });

  render(<MemoryAnalytics />);

  expect(screen.getByText('No memories yet')).toBeInTheDocument();
});

it('renders analytics and refreshes all data sources', async () => {
  const refetchPatterns = vi.fn();
  const refetchHealth = vi.fn();
  const refetchInsights = vi.fn();
  const refetchDuplicates = vi.fn();

  mockUsePatternAnalysis.mockReturnValue({
    data: createPatternData(),
    isLoading: false,
    error: null,
    refetch: refetchPatterns,
    isReady: true,
    isKeyLoading: false
  });
  mockUseHealthCheck.mockReturnValue({
    data: createHealthData(),
    isLoading: false,
    error: null,
    refetch: refetchHealth,
    isReady: true,
    isKeyLoading: false
  });
  mockUseInsightExtraction.mockReturnValue({
    data: createInsights(),
    isLoading: false,
    error: null,
    refetch: refetchInsights,
    isReady: true,
    isKeyLoading: false
  });
  mockUseDuplicateDetection.mockReturnValue({
    data: createDuplicates(),
    isLoading: false,
    error: null,
    refetch: refetchDuplicates,
    isReady: true,
    isKeyLoading: false
  });

  render(<MemoryAnalytics />);

  const totalCard = screen.getByTestId('card-total-memories');
  expect(within(totalCard).getByText('12')).toBeInTheDocument();
  expect(screen.getByTestId('card-duplicates')).toBeInTheDocument();
  expect(screen.getByText('Memory boost')).toBeInTheDocument();

  const refreshButton = screen.getByTestId('button-refresh-analytics');
  await userEvent.click(refreshButton);

  expect(refetchPatterns).toHaveBeenCalledTimes(1);
  expect(refetchHealth).toHaveBeenCalledTimes(1);
  expect(refetchInsights).toHaveBeenCalledTimes(1);
  expect(refetchDuplicates).toHaveBeenCalledTimes(1);
});
