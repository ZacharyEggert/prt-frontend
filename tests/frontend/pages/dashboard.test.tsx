import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { DashboardView } from '@renderer/pages/dashboard'
import { mockApi } from '../mocks/mock-api'
import {
  createStats,
  createMetadata,
  createValidationResult,
  createDependencyGraph
} from '../mocks/factories'

// Mock toast
vi.mock('@renderer/lib/toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn()
  }
}))

// Mock navigation
const mockNavigate = vi.fn()
vi.mock('@renderer/hooks/use-navigation', () => ({
  useNavigation: () => ({ currentView: 'dashboard', navigate: mockNavigate }),
  NavigationProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>
}))

// Mock DependencyGraph to avoid dagre/SVG complexity in jsdom
vi.mock('@renderer/components/dependency-graph', () => ({
  DependencyGraph: () => <div data-testid="dependency-graph">Dependency Graph Mock</div>
}))

function createWrapper(): {
  wrapper: ({ children }: { children: React.ReactNode }) => React.JSX.Element
  queryClient: QueryClient
} {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity, staleTime: 0 }
    }
  })

  const wrapper = ({ children }: { children: React.ReactNode }): React.JSX.Element => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  return { wrapper, queryClient }
}

describe('DashboardView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders project name and description with stats', async () => {
    const stats = createStats({
      totalTasks: 10,
      byStatus: { completed: 3, 'in-progress': 4, 'not-started': 3 },
      byType: { bug: 2, feature: 4, improvement: 2, planning: 1, research: 1 },
      byPriority: { high: 3, low: 2, medium: 5 }
    })
    const metadata = createMetadata({
      name: 'My Dashboard Project',
      description: 'A great project'
    })

    mockApi.project.stats.mockResolvedValue(stats)
    mockApi.project.metadata.mockResolvedValue(metadata)
    mockApi.project.validate.mockResolvedValue(createValidationResult())
    mockApi.deps.graph.mockResolvedValue(createDependencyGraph())

    const { wrapper: Wrapper } = createWrapper()

    render(
      <Wrapper>
        <DashboardView />
      </Wrapper>
    )

    // Wait for the project name to appear (data loaded)
    const heading = await screen.findByText('My Dashboard Project')
    expect(heading).toBeInTheDocument()
    expect(screen.getByText('A great project')).toBeInTheDocument()
  })

  it('renders progress bar and completion percentage', async () => {
    const stats = createStats({
      totalTasks: 10,
      byStatus: { completed: 5, 'in-progress': 3, 'not-started': 2 },
      byType: { bug: 2, feature: 4, improvement: 2, planning: 1, research: 1 },
      byPriority: { high: 3, low: 2, medium: 5 }
    })
    mockApi.project.stats.mockResolvedValue(stats)
    mockApi.project.metadata.mockResolvedValue(createMetadata())
    mockApi.project.validate.mockResolvedValue(createValidationResult())
    mockApi.deps.graph.mockResolvedValue(createDependencyGraph())

    const { wrapper: Wrapper } = createWrapper()

    render(
      <Wrapper>
        <DashboardView />
      </Wrapper>
    )

    const progressText = await screen.findByText('5 of 10 tasks completed')
    expect(progressText).toBeInTheDocument()
    expect(screen.getByText('50%')).toBeInTheDocument()
  })

  it('renders quick action buttons', async () => {
    mockApi.project.stats.mockResolvedValue(
      createStats({
        totalTasks: 1,
        byStatus: { completed: 0, 'in-progress': 0, 'not-started': 1 },
        byType: { bug: 0, feature: 1, improvement: 0, planning: 0, research: 0 },
        byPriority: { high: 0, low: 0, medium: 1 }
      })
    )
    mockApi.project.metadata.mockResolvedValue(createMetadata())
    mockApi.project.validate.mockResolvedValue(createValidationResult())
    mockApi.deps.graph.mockResolvedValue(createDependencyGraph())

    const { wrapper: Wrapper } = createWrapper()

    render(
      <Wrapper>
        <DashboardView />
      </Wrapper>
    )

    const addTaskBtn = await screen.findByText('Add Task')
    expect(addTaskBtn).toBeInTheDocument()
    expect(screen.getByText('View Tasks')).toBeInTheDocument()
    expect(screen.getByText('Validate')).toBeInTheDocument()
  })

  it('shows error state when stats are unavailable', async () => {
    mockApi.project.stats.mockRejectedValue(new Error('No project'))
    mockApi.project.metadata.mockRejectedValue(new Error('No project'))
    mockApi.project.validate.mockResolvedValue(createValidationResult())

    const { wrapper: Wrapper } = createWrapper()

    render(
      <Wrapper>
        <DashboardView />
      </Wrapper>
    )

    const errorMsg = await screen.findByText('Failed to load project data')
    expect(errorMsg).toBeInTheDocument()
  })
})
