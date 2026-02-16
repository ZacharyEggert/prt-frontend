import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SearchBar } from '@renderer/components/search-bar'

describe('SearchBar', () => {
  afterEach(() => {
    cleanup()
  })

  it('exposes the search input by accessible label', () => {
    render(<SearchBar onChange={vi.fn()} label="Search tasks by title or description" value="" />)

    expect(
      screen.getByRole('textbox', { name: 'Search tasks by title or description' })
    ).toBeInTheDocument()
  })

  it('allows keyboard users to clear the current search text', async () => {
    const user = userEvent.setup()
    render(<SearchBar onChange={vi.fn()} label="Search tasks" value="needs clearing" />)

    const input = screen.getByRole('textbox', { name: 'Search tasks' }) as HTMLInputElement
    const clearButton = screen.getByRole('button', { name: 'Clear search' })

    expect(input.value).toBe('needs clearing')

    clearButton.focus()
    await user.keyboard('{Enter}')

    expect(input.value).toBe('')
  })
})
