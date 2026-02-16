import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
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
})
