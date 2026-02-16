import { describe, it, expect, vi, afterEach } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider } from '@renderer/components/theme-provider'
import { ThemeToggle } from '@renderer/components/theme-toggle'

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

function renderThemeToggle(): void {
  render(
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem storageKey="prt-ui-theme">
      <ThemeToggle />
    </ThemeProvider>
  )
}

describe('ThemeToggle', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('renders Light, Dark, and System controls', async () => {
    window.matchMedia = createMatchMedia(false)
    renderThemeToggle()

    await waitFor(() => {
      expect(screen.getByRole('radio', { name: 'Light theme' })).toBeInTheDocument()
      expect(screen.getByRole('radio', { name: 'Dark theme' })).toBeInTheDocument()
      expect(screen.getByRole('radio', { name: 'System theme' })).toBeInTheDocument()
    })
  })

  it('updates selected mode and persists preference when clicked', async () => {
    window.matchMedia = createMatchMedia(false)
    const user = userEvent.setup()
    renderThemeToggle()

    await user.click(await screen.findByRole('radio', { name: 'Dark theme' }))

    await waitFor(() => {
      expect(localStorage.getItem('prt-ui-theme')).toBe('dark')
      expect(document.documentElement.classList.contains('dark')).toBe(true)
    })
  })

  it('uses persisted preference on initial render', async () => {
    window.matchMedia = createMatchMedia(true)
    localStorage.setItem('prt-ui-theme', 'light')
    renderThemeToggle()

    await waitFor(() => {
      const lightButton = screen.getByRole('radio', { name: 'Light theme' })
      expect(lightButton).toHaveAttribute('data-state', 'on')
      expect(document.documentElement.classList.contains('dark')).toBe(false)
    })
  })
})
