import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FilterBar } from '@renderer/components/filter-bar'
import { STATUS, TASK_TYPE, PRIORITY } from 'project-roadmap-tracking/dist/util/types'

describe('FilterBar', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders status toggle buttons', () => {
    const onChange = vi.fn()

    render(<FilterBar value={{}} onChange={onChange} />)

    expect(screen.getByText('Not Started')).toBeInTheDocument()
    expect(screen.getByText('In Progress')).toBeInTheDocument()
    expect(screen.getByText('Completed')).toBeInTheDocument()
  })

  it('renders type and priority dropdown triggers', () => {
    const onChange = vi.fn()

    render(<FilterBar value={{}} onChange={onChange} />)

    expect(screen.getByText('All types')).toBeInTheDocument()
    expect(screen.getByText('All priorities')).toBeInTheDocument()
  })

  it('calls onChange with status when a status toggle is clicked', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(<FilterBar value={{}} onChange={onChange} />)

    await user.click(screen.getByText('Not Started'))

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ status: [STATUS.NotStarted] }))
  })

  it('shows Clear All button when filters are active', () => {
    const onChange = vi.fn()

    render(<FilterBar value={{ status: STATUS.NotStarted }} onChange={onChange} />)

    expect(screen.getByText('Clear All')).toBeInTheDocument()
  })

  it('does not show Clear All button when no filters are active', () => {
    const onChange = vi.fn()

    render(<FilterBar value={{}} onChange={onChange} />)

    expect(screen.queryByText('Clear All')).not.toBeInTheDocument()
  })

  it('calls onChange with empty object when Clear All is clicked', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(<FilterBar value={{ status: STATUS.NotStarted }} onChange={onChange} />)

    await user.click(screen.getByText('Clear All'))

    expect(onChange).toHaveBeenCalledWith({})
  })

  it('shows active filter badges when filters are set', () => {
    const onChange = vi.fn()

    render(<FilterBar value={{ status: STATUS.NotStarted }} onChange={onChange} />)

    expect(screen.getByText('Active filters:')).toBeInTheDocument()
    expect(screen.getByText(/Status: Not Started/)).toBeInTheDocument()
  })

  it('renders accessible names for remove-filter controls', () => {
    const onChange = vi.fn()

    render(
      <FilterBar
        value={{
          status: STATUS.NotStarted,
          type: TASK_TYPE.Bug,
          priority: PRIORITY.High
        }}
        onChange={onChange}
      />
    )

    expect(
      screen.getByRole('button', { name: 'Remove status filter Not Started' })
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Remove type filter Bug' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Remove priority filter High' })).toBeInTheDocument()
  })

  it('supports keyboard removal from active filter chips', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(<FilterBar value={{ status: STATUS.NotStarted }} onChange={onChange} />)

    const removeButton = screen.getByRole('button', { name: 'Remove status filter Not Started' })
    removeButton.focus()

    await user.keyboard('{Enter}')

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ status: undefined }))
  })
})
