import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TaskDetail } from '@renderer/components/task-detail'
import { mockApi } from '../mocks/mock-api'
import { createDependencyInfo, createTask } from '../mocks/factories'

function createWrapper(): {
  wrapper: ({ children }: { children: React.ReactNode }) => React.JSX.Element
} {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity, staleTime: 0 }
    }
  })

  const wrapper = ({ children }: { children: React.ReactNode }): React.JSX.Element => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  return { wrapper }
}

describe('TaskDetail accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('exposes accessible labels for icon-only dependency remove controls', async () => {
    mockApi.task.get.mockResolvedValue(createTask({ id: 'F-001', title: 'Main Task' }))
    mockApi.deps.get.mockResolvedValue(
      createDependencyInfo({
        dependsOn: [createTask({ id: 'F-002', title: 'Dependency Task' })],
        blocks: [createTask({ id: 'F-003', title: 'Blocked Task' })]
      })
    )

    const { wrapper: Wrapper } = createWrapper()

    render(
      <Wrapper>
        <TaskDetail taskId="F-001" open={true} onOpenChange={vi.fn()} />
      </Wrapper>
    )

    expect(
      await screen.findByRole('button', { name: 'Remove dependency on F-002: Dependency Task' })
    ).toBeInTheDocument()
    expect(
      await screen.findByRole('button', { name: 'Remove blocked task F-003: Blocked Task' })
    ).toBeInTheDocument()
  })

  it('opens dependency removal confirmation dialog with keyboard activation', async () => {
    const user = userEvent.setup()
    mockApi.task.get.mockResolvedValue(createTask({ id: 'F-001', title: 'Main Task' }))
    mockApi.deps.get.mockResolvedValue(
      createDependencyInfo({
        dependsOn: [createTask({ id: 'F-002', title: 'Dependency Task' })],
        blocks: []
      })
    )

    const { wrapper: Wrapper } = createWrapper()

    render(
      <Wrapper>
        <TaskDetail taskId="F-001" open={true} onOpenChange={vi.fn()} />
      </Wrapper>
    )

    const removeButton = await screen.findByRole('button', {
      name: 'Remove dependency on F-002: Dependency Task'
    })

    removeButton.focus()
    await user.keyboard('{Enter}')

    expect(await screen.findByRole('button', { name: 'Remove Dependency' })).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Cancel' })).toBeInTheDocument()
  })

  it('shows friendly task-load error state and supports retry', async () => {
    const user = userEvent.setup()
    mockApi.task.get
      .mockRejectedValueOnce(new Error('Sensitive backend task error'))
      .mockResolvedValueOnce(createTask({ id: 'F-001', title: 'Recovered Task' }))
    mockApi.deps.get.mockResolvedValue(createDependencyInfo())

    const { wrapper: Wrapper } = createWrapper()

    render(
      <Wrapper>
        <TaskDetail taskId="F-001" open={true} onOpenChange={vi.fn()} />
      </Wrapper>
    )

    expect(await screen.findByText('Unable to load task details')).toBeInTheDocument()
    expect(screen.getByText('Task details are temporarily unavailable.')).toBeInTheDocument()
    expect(screen.queryByText('Sensitive backend task error')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('F-001: Recovered Task')).toBeInTheDocument()
  })

  it('shows dependency section loading state while dependency query is pending', async () => {
    mockApi.task.get.mockResolvedValue(createTask({ id: 'F-001', title: 'Main Task' }))
    mockApi.deps.get.mockImplementation(() => new Promise(() => {}))

    const { wrapper: Wrapper } = createWrapper()
    render(
      <Wrapper>
        <TaskDetail taskId="F-001" open={true} onOpenChange={vi.fn()} />
      </Wrapper>
    )

    expect(await screen.findByText('F-001: Main Task')).toBeInTheDocument()
    expect(screen.getByText('Dependencies (...)')).toBeInTheDocument()
    expect(screen.getByText('Blocks (...)')).toBeInTheDocument()
  })

  it('shows friendly dependency error state and retries dependency query', async () => {
    const user = userEvent.setup()
    mockApi.task.get.mockResolvedValue(createTask({ id: 'F-001', title: 'Main Task' }))
    mockApi.deps.get
      .mockRejectedValueOnce(new Error('Raw dependency failure'))
      .mockResolvedValueOnce(createDependencyInfo({ dependsOn: [], blocks: [] }))

    const { wrapper: Wrapper } = createWrapper()

    render(
      <Wrapper>
        <TaskDetail taskId="F-001" open={true} onOpenChange={vi.fn()} />
      </Wrapper>
    )

    expect((await screen.findAllByText('Unable to load dependencies')).length).toBeGreaterThan(0)
    expect(
      screen.getAllByText('Dependency details are temporarily unavailable.').length
    ).toBeGreaterThan(0)
    expect(screen.queryByText('Raw dependency failure')).not.toBeInTheDocument()

    await user.click(screen.getAllByRole('button', { name: 'Try again' })[0])

    await waitFor(() => {
      expect(mockApi.deps.get).toHaveBeenCalledTimes(2)
    })
  })
})
