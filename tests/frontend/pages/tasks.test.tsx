import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, cleanup, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TasksView } from '@renderer/pages/tasks'
import { mockApi } from '../mocks/mock-api'
import { createTask } from '../mocks/factories'
import { STATUS, TASK_TYPE, PRIORITY } from 'project-roadmap-tracking/dist/util/types'

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
vi.mock('@renderer/hooks/use-navigation', () => ({
  useNavigation: () => ({ currentView: 'tasks', navigate: vi.fn() }),
  NavigationProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>
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

describe('TasksView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders Tasks heading and Add Task button', async () => {
    mockApi.task.list.mockResolvedValue([])

    const { wrapper: Wrapper } = createWrapper()

    render(
      <Wrapper>
        <TasksView />
      </Wrapper>
    )

    expect(screen.getByText('Tasks')).toBeInTheDocument()
    expect(screen.getByText('Add Task')).toBeInTheDocument()
  })

  it('renders task list with mock tasks', async () => {
    const tasks = [
      createTask({
        id: 'F-001',
        title: 'My Feature',
        type: TASK_TYPE.Feature,
        status: STATUS.NotStarted,
        priority: PRIORITY.High
      }),
      createTask({
        id: 'B-001',
        title: 'Fix Something',
        type: TASK_TYPE.Bug,
        status: STATUS.InProgress,
        priority: PRIORITY.Medium
      })
    ]
    mockApi.task.list.mockResolvedValue(tasks)

    const { wrapper: Wrapper } = createWrapper()

    render(
      <Wrapper>
        <TasksView />
      </Wrapper>
    )

    const title1 = await screen.findByText('My Feature')
    expect(title1).toBeInTheDocument()
    expect(screen.getByText('Fix Something')).toBeInTheDocument()
    expect(screen.getByText('F-001')).toBeInTheDocument()
    expect(screen.getByText('B-001')).toBeInTheDocument()
  })

  it('renders search bar placeholder', () => {
    mockApi.task.list.mockResolvedValue([])

    const { wrapper: Wrapper } = createWrapper()

    render(
      <Wrapper>
        <TasksView />
      </Wrapper>
    )

    expect(
      screen.getByPlaceholderText('Search tasks by title or description...')
    ).toBeInTheDocument()
  })

  it('renders filter bar with status toggles', () => {
    mockApi.task.list.mockResolvedValue([])

    const { wrapper: Wrapper } = createWrapper()

    render(
      <Wrapper>
        <TasksView />
      </Wrapper>
    )

    expect(screen.getByText('Not Started')).toBeInTheDocument()
    expect(screen.getByText('In Progress')).toBeInTheDocument()
    expect(screen.getByText('Completed')).toBeInTheDocument()
  })

  it('shows error message when task loading fails', async () => {
    mockApi.task.list.mockRejectedValue(new Error('Failed to load'))

    const { wrapper: Wrapper } = createWrapper()

    render(
      <Wrapper>
        <TasksView />
      </Wrapper>
    )

    const errorMsg = await screen.findByText(/Failed to load tasks/)
    expect(errorMsg).toBeInTheDocument()
  })

  it('closes create dialog with Escape and returns focus to Add Task trigger', async () => {
    const user = userEvent.setup()
    mockApi.task.list.mockResolvedValue([])

    const { wrapper: Wrapper } = createWrapper()

    render(
      <Wrapper>
        <TasksView />
      </Wrapper>
    )

    const addTaskButton = screen.getByRole('button', { name: 'Add Task' })
    addTaskButton.focus()
    await user.keyboard('{Enter}')

    expect(await screen.findByRole('heading', { name: 'Create New Task' })).toBeInTheDocument()

    await user.keyboard('{Escape}')

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'Create New Task' })).not.toBeInTheDocument()
      expect(addTaskButton).toHaveFocus()
    })
  })

  it('closes task detail sheet with Escape and returns focus to the originating row', async () => {
    const user = userEvent.setup()
    const task = createTask({
      id: 'F-001',
      title: 'Focus Task',
      type: TASK_TYPE.Feature,
      status: STATUS.NotStarted,
      priority: PRIORITY.High
    })
    mockApi.task.list.mockResolvedValue([task])
    mockApi.task.get.mockResolvedValue(task)

    const { wrapper: Wrapper } = createWrapper()

    render(
      <Wrapper>
        <TasksView />
      </Wrapper>
    )

    const taskRow = await screen.findByLabelText('Open task F-001: Focus Task')
    taskRow.focus()
    await user.keyboard('{Enter}')

    expect(await screen.findByText('F-001: Focus Task')).toBeInTheDocument()

    await user.keyboard('{Escape}')

    await waitFor(() => {
      expect(screen.queryByText('F-001: Focus Task')).not.toBeInTheDocument()
      expect(taskRow).toHaveFocus()
    })
  })

  it('maintains logical tab order through task controls', async () => {
    const user = userEvent.setup()
    const task = createTask({
      id: 'F-010',
      title: 'Tab Order Task',
      type: TASK_TYPE.Feature,
      status: STATUS.NotStarted,
      priority: PRIORITY.Medium
    })
    mockApi.task.list.mockResolvedValue([task])
    mockApi.task.get.mockResolvedValue(task)

    const { wrapper: Wrapper } = createWrapper()

    render(
      <Wrapper>
        <TasksView />
      </Wrapper>
    )

    const addTaskButton = screen.getByRole('button', { name: 'Add Task' })
    const searchInput = screen.getByRole('textbox', {
      name: 'Search tasks by title or description'
    })
    const taskRow = await screen.findByLabelText('Open task F-010: Tab Order Task')

    await user.tab()
    expect(addTaskButton).toHaveFocus()

    await user.tab()
    expect(searchInput).toHaveFocus()

    for (let i = 0; i < 8; i += 1) {
      await user.tab()
      if (taskRow === document.activeElement) break
    }

    expect(taskRow).toHaveFocus()
  })
})
