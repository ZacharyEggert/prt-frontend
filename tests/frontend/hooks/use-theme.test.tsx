import { describe, it, expect, vi, afterEach } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { ThemeProvider } from '@renderer/components/theme-provider'
import { useTheme } from '@renderer/hooks/use-theme'

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

function Wrapper({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem storageKey="prt-ui-theme">
      {children}
    </ThemeProvider>
  )
}

describe('useTheme', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('defaults to system and resolves from prefers-color-scheme', async () => {
    window.matchMedia = createMatchMedia(true)

    const { result } = renderHook(() => useTheme(), { wrapper: Wrapper })

    await waitFor(() => {
      expect(result.current.theme).toBe('system')
      expect(result.current.resolvedTheme).toBe('dark')
    })

    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('updates class and localStorage for light, dark, and system', async () => {
    window.matchMedia = createMatchMedia(true)

    const { result } = renderHook(() => useTheme(), { wrapper: Wrapper })

    await waitFor(() => {
      expect(result.current.theme).toBe('system')
    })

    act(() => {
      result.current.setTheme('dark')
    })

    await waitFor(() => {
      expect(result.current.theme).toBe('dark')
      expect(result.current.resolvedTheme).toBe('dark')
      expect(localStorage.getItem('prt-ui-theme')).toBe('dark')
      expect(document.documentElement.classList.contains('dark')).toBe(true)
    })

    act(() => {
      result.current.setTheme('light')
    })

    await waitFor(() => {
      expect(result.current.theme).toBe('light')
      expect(result.current.resolvedTheme).toBe('light')
      expect(localStorage.getItem('prt-ui-theme')).toBe('light')
      expect(document.documentElement.classList.contains('dark')).toBe(false)
    })

    act(() => {
      result.current.setTheme('system')
    })

    await waitFor(() => {
      expect(result.current.theme).toBe('system')
      expect(result.current.resolvedTheme).toBe('dark')
      expect(localStorage.getItem('prt-ui-theme')).toBe('system')
      expect(document.documentElement.classList.contains('dark')).toBe(true)
    })
  })
})
