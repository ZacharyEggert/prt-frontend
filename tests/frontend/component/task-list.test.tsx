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

  it('renders create-task CTA in empty state when onCreateTask is provided', async () => {
    const user = userEvent.setup()
    const onCreateTask = vi.fn()
    render(<TaskList tasks={[]} onCreateTask={onCreateTask} />)

    const createButton = screen.getByRole('button', { name: 'Create Task' })
    expect(createButton).toBeInTheDocument()

    await user.click(createButton)
    expect(onCreateTask).toHaveBeenCalledOnce()
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

    render(<TaskList tasks={tasks} onSortChange={onSortChange} sortBy="priority" sortOrder="asc" />)

    expect(screen.getByRole('button', { name: 'Sort by Priority' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sort by ID' })).toBeInTheDocument()
  })

  it('applies aria-sort state to sortable columns', () => {
    const tasks = [createTask()]
    const onSortChange = vi.fn()

    render(<TaskList tasks={tasks} onSortChange={onSortChange} sortBy="priority" sortOrder="asc" />)

    const priorityHeader = screen.getByRole('button', { name: 'Sort by Priority' }).closest('th')
    const idHeader = screen.getByRole('button', { name: 'Sort by ID' }).closest('th')

    expect(priorityHeader).toHaveAttribute('aria-sort', 'ascending')
    expect(idHeader).toHaveAttribute('aria-sort', 'none')
  })

  it('calls onSortChange with field name when sortable header is activated', async () => {
    const user = userEvent.setup()
    const onSortChange = vi.fn()
    const tasks = [createTask()]

    render(<TaskList tasks={tasks} onSortChange={onSortChange} />)

    await user.click(screen.getByRole('button', { name: 'Sort by Priority' }))
    expect(onSortChange).toHaveBeenCalledWith('priority')

    await user.keyboard('{Tab}')
    await user.keyboard('{Enter}')

    await user.click(screen.getByRole('button', { name: 'Sort by ID' }))
    expect(onSortChange).toHaveBeenCalledWith('id')
  })

  it('shows dependency count for tasks with dependencies', () => {
    const tasks = [createTask({ id: 'F-001', 'depends-on': ['F-002', 'F-003'] })]

    render(<TaskList tasks={tasks} />)

    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('supports keyboard row navigation with Arrow, Home, and End keys', async () => {
    const user = userEvent.setup()
    const tasks = [
      createTask({ id: 'F-001', title: 'First Task' }),
      createTask({ id: 'F-002', title: 'Second Task' }),
      createTask({ id: 'F-003', title: 'Third Task' })
    ]

    render(<TaskList tasks={tasks} onTaskClick={vi.fn()} />)

    const firstRow = screen.getByLabelText('Open task F-001: First Task')
    const secondRow = screen.getByLabelText('Open task F-002: Second Task')
    const thirdRow = screen.getByLabelText('Open task F-003: Third Task')

    expect(firstRow).toHaveAttribute('tabindex', '0')
    expect(secondRow).toHaveAttribute('tabindex', '-1')
    expect(thirdRow).toHaveAttribute('tabindex', '-1')

    firstRow.focus()
    await user.keyboard('{ArrowDown}')
    expect(secondRow).toHaveFocus()

    await user.keyboard('{ArrowDown}')
    expect(thirdRow).toHaveFocus()

    await user.keyboard('{Home}')
    expect(firstRow).toHaveFocus()

    await user.keyboard('{End}')
    expect(thirdRow).toHaveFocus()
  })

  it('activates the focused row with Enter and Space', async () => {
    const user = userEvent.setup()
    const onTaskClick = vi.fn()
    const tasks = [createTask({ id: 'F-010', title: 'Keyboard Task' })]

    render(<TaskList tasks={tasks} onTaskClick={onTaskClick} />)

    const row = screen.getByLabelText('Open task F-010: Keyboard Task')
    row.focus()

    await user.keyboard('{Enter}')
    await user.keyboard('{Space}')

    expect(onTaskClick).toHaveBeenNthCalledWith(1, 'F-010')
    expect(onTaskClick).toHaveBeenNthCalledWith(2, 'F-010')
  })
})
