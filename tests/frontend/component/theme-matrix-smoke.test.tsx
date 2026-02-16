import { describe, it, expect, vi, afterEach } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import App from '@renderer/App'
import { ThemeProvider } from '@renderer/components/theme-provider'
import { createTestQueryClient } from '../helpers/render'

vi.mock('@renderer/components/dependency-graph', () => ({
  DependencyGraph: () => <div data-testid="dependency-graph">Dependency Graph Mock</div>
}))

function createMatchMedia(matches: boolean): typeof window.matchMedia {
  return vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  }))
}

function renderApp(): void {
  const queryClient = createTestQueryClient()

  render(
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem storageKey="prt-ui-theme">
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </ThemeProvider>
  )
}

describe.each([
  ['light', false],
  ['dark', true]
] as const)('theme smoke tests (%s)', (theme, expectsDarkClass) => {
  afterEach(() => {
    cleanup()
  })

  it('renders welcome, dashboard, and tasks views without regressions', async () => {
    localStorage.setItem('prt-ui-theme', theme)
    window.matchMedia = createMatchMedia(expectsDarkClass)

    renderApp()

    await screen.findByText('Welcome to PRT')

    await waitFor(() => {
      expect(document.documentElement.classList.contains('dark')).toBe(expectsDarkClass)
    })

    fireEvent.click(screen.getByRole('button', { name: 'Dashboard' }))
    await screen.findByText('Quick Actions')
    expect(screen.getByTestId('dependency-graph')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Tasks' }))
    await screen.findByPlaceholderText('Search tasks by title or description...')

    fireEvent.click(screen.getByRole('button', { name: 'Add Task' }))
    await screen.findByText('Create New Task')
  })
})
