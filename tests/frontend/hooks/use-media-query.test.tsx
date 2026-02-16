import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useMediaQuery } from '@renderer/hooks/use-media-query'

const defaultMatchMedia = window.matchMedia

interface MatchMediaController {
  matchMedia: typeof window.matchMedia
  setMatches: (nextMatches: boolean) => void
  addEventListener: ReturnType<typeof vi.fn>
  removeEventListener: ReturnType<typeof vi.fn>
}

function createMatchMediaController(initialMatches: boolean): MatchMediaController {
  let matches = initialMatches
  const listeners = new Set<(event: MediaQueryListEvent) => void>()

  const addEventListener = vi.fn((event: string, listener: EventListenerOrEventListenerObject) => {
    if (event !== 'change') return
    const callback =
      typeof listener === 'function'
        ? (listener as (event: MediaQueryListEvent) => void)
        : (listener.handleEvent as (event: MediaQueryListEvent) => void)
    listeners.add(callback)
  })

  const removeEventListener = vi.fn(
    (event: string, listener: EventListenerOrEventListenerObject) => {
      if (event !== 'change') return
      const callback =
        typeof listener === 'function'
          ? (listener as (event: MediaQueryListEvent) => void)
          : (listener.handleEvent as (event: MediaQueryListEvent) => void)
      listeners.delete(callback)
    }
  )

  const matchMedia = vi.fn().mockImplementation((query: string) => ({
    get matches() {
      return matches
    },
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener,
    removeEventListener,
    dispatchEvent: vi.fn()
  }))

  const setMatches = (nextMatches: boolean): void => {
    matches = nextMatches
    const event = { matches: nextMatches } as MediaQueryListEvent
    listeners.forEach((listener) => listener(event))
  }

  return {
    matchMedia,
    setMatches,
    addEventListener,
    removeEventListener
  }
}

describe('useMediaQuery', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    window.matchMedia = defaultMatchMedia
  })

  it('returns the current media-query state and reacts to changes', () => {
    const controller = createMatchMediaController(false)
    window.matchMedia = controller.matchMedia

    const { result } = renderHook(() => useMediaQuery('(max-width: 767px)'))

    expect(result.current).toBe(false)

    act(() => {
      controller.setMatches(true)
    })

    expect(result.current).toBe(true)
  })

  it('registers and unregisters listeners for query updates', () => {
    const controller = createMatchMediaController(false)
    window.matchMedia = controller.matchMedia

    const { unmount } = renderHook(() => useMediaQuery('(max-width: 767px)'))
    expect(controller.addEventListener).toHaveBeenCalledWith('change', expect.any(Function))

    unmount()
    expect(controller.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function))
  })
})
