import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TaskList } from '@renderer/components/task-list'
import { createTask } from '../mocks/factories'
import { STATUS, TASK_TYPE, PRIORITY } from 'project-roadmap-tracking/dist/util/types'

describe('TaskList', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders loading skeleton when isLoading is true', () => {
    const { container } = render(<TaskList tasks={[]} isLoading={true} />)

    const skeletons = container.querySelectorAll('[data-slot="skeleton"]')
    expect(skeletons.length).toBe(5)
  })

  it('renders empty state when tasks is empty', () => {
    render(<TaskList tasks={[]} />)

    expect(screen.getByText('No tasks yet')).toBeInTheDocument()
    expect(screen.getByText('Create your first task to get started')).toBeInTheDocument()
  })

  it('renders task rows with ID, title, and badges', () => {
    const tasks = [
      createTask({
        id: 'F-001',
        title: 'First Feature',
        type: TASK_TYPE.Feature,
        status: STATUS.NotStarted,
        priority: PRIORITY.High
      }),
      createTask({
        id: 'B-001',
        title: 'Fix Bug',
        type: TASK_TYPE.Bug,
        status: STATUS.InProgress,
        priority: PRIORITY.Low
      })
    ]

    render(<TaskList tasks={tasks} />)

    expect(screen.getByText('F-001')).toBeInTheDocument()
    expect(screen.getByText('First Feature')).toBeInTheDocument()
    expect(screen.getByText('B-001')).toBeInTheDocument()
    expect(screen.getByText('Fix Bug')).toBeInTheDocument()
    expect(screen.getByText('High')).toBeInTheDocument()
    expect(screen.getByText('Low')).toBeInTheDocument()
    expect(screen.getByText('Feature')).toBeInTheDocument()
    expect(screen.getByText('Bug')).toBeInTheDocument()
  })

  it('calls onTaskClick with task ID when a row is clicked', async () => {
    const user = userEvent.setup()
    const onTaskClick = vi.fn()
    const tasks = [createTask({ id: 'F-005', title: 'Click Me' })]

    render(<TaskList tasks={tasks} onTaskClick={onTaskClick} />)

    await user.click(screen.getByText('Click Me'))

    expect(onTaskClick).toHaveBeenCalledWith('F-005')
  })

  it('renders sortable headers when onSortChange is provided', () => {
    const tasks = [createTask()]
    const onSortChange = vi.fn()

    const { container } = render(
      <TaskList tasks={tasks} onSortChange={onSortChange} sortBy="priority" sortOrder="asc" />
    )

    // The sortable header wraps label in a div with cursor-pointer class on the th
    const sortableHeaders = container.querySelectorAll('th.cursor-pointer')
    expect(sortableHeaders.length).toBe(2) // Priority and ID
  })

  it('calls onSortChange with field name when sortable header is clicked', async () => {
    const user = userEvent.setup()
    const onSortChange = vi.fn()
    const tasks = [createTask()]

    const { container } = render(<TaskList tasks={tasks} onSortChange={onSortChange} />)

    // Get the sortable headers by their cursor-pointer class
    const sortableHeaders = container.querySelectorAll('th.cursor-pointer')
    // First sortable header is Priority, second is ID
    await user.click(sortableHeaders[0])
    expect(onSortChange).toHaveBeenCalledWith('priority')

    await user.click(sortableHeaders[1])
    expect(onSortChange).toHaveBeenCalledWith('id')
  })

  it('shows dependency count for tasks with dependencies', () => {
    const tasks = [createTask({ id: 'F-001', 'depends-on': ['F-002', 'F-003'] })]

    render(<TaskList tasks={tasks} />)

    expect(screen.getByText('2')).toBeInTheDocument()
  })
})
