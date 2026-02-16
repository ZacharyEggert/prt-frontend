import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DependencyGraph } from '@renderer/components/dependency-graph'

const mockUseDependencyGraph = vi.fn()
const mockUseTasks = vi.fn()
const mockUseViewBox = vi.fn()
const mockComputeDagreLayout = vi.fn()

vi.mock('@renderer/hooks/use-deps', () => ({
  useDependencyGraph: () => mockUseDependencyGraph()
}))

vi.mock('@renderer/hooks/use-tasks', () => ({
  useTasks: () => mockUseTasks()
}))

vi.mock('@renderer/hooks/use-view-box', () => ({
  useViewBox: () => mockUseViewBox()
}))

vi.mock('@renderer/lib/graph-utils', () => ({
  computeDagreLayout: (...args: unknown[]) => mockComputeDagreLayout(...args)
}))

vi.mock('@renderer/components/dependency-graph/node', () => ({
  Node: () => <g data-testid="node" />
}))

vi.mock('@renderer/components/dependency-graph/edge', () => ({
  Edge: () => <g data-testid="edge" />
}))

vi.mock('@renderer/components/dependency-graph/zoom-controls', () => ({
  ZoomControls: () => <div data-testid="zoom-controls" />
}))

describe('DependencyGraph', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockUseViewBox.mockReturnValue({
      containerRef: { current: null },
      viewBox: '0 0 100 100',
      zoom: 1,
      isPanning: false,
      didPanRef: { current: false },
      resetView: vi.fn(),
      zoomIn: vi.fn(),
      zoomOut: vi.fn()
    })
  })

  it('renders loading skeleton while graph data is loading', () => {
    mockUseDependencyGraph.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: vi.fn()
    })
    mockUseTasks.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
      refetch: vi.fn()
    })

    const { container } = render(<DependencyGraph />)

    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0)
  })

  it('renders friendly error state and retries both graph + task queries', async () => {
    const user = userEvent.setup()
    const refetchGraph = vi.fn()
    const refetchTasks = vi.fn()

    mockUseDependencyGraph.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Sensitive graph failure'),
      refetch: refetchGraph
    })
    mockUseTasks.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: refetchTasks
    })

    render(<DependencyGraph />)

    expect(screen.getByText('Unable to load dependency graph')).toBeInTheDocument()
    expect(screen.getByText('Graph data is temporarily unavailable.')).toBeInTheDocument()
    expect(screen.queryByText('Sensitive graph failure')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Try again' }))

    expect(refetchGraph).toHaveBeenCalledOnce()
    expect(refetchTasks).toHaveBeenCalledOnce()
  })

  it('renders empty state with Create Task CTA when graph has no nodes', async () => {
    const user = userEvent.setup()
    const onCreateTask = vi.fn()

    mockUseDependencyGraph.mockReturnValue({
      data: { dependsOn: {}, blocks: {} },
      isLoading: false,
      error: null,
      refetch: vi.fn()
    })
    mockUseTasks.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: vi.fn()
    })
    mockComputeDagreLayout.mockReturnValue({
      nodes: [],
      edges: [],
      width: 0,
      height: 0
    })

    render(<DependencyGraph onCreateTask={onCreateTask} />)

    expect(screen.getByText('No dependencies to visualize')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Create Task' }))

    expect(onCreateTask).toHaveBeenCalledOnce()
  })
})
