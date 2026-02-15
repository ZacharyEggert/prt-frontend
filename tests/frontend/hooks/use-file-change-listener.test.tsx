import { suite, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useFileChangeListener } from '@renderer/hooks/use-file-change-listener'
import { mockApi } from '../mocks/mock-api'
import type { FileChangeEvent } from '../../../src/preload/index.d'

vi.mock('@renderer/lib/toast', () => ({
  toast: {
    info: vi.fn(),
    warning: vi.fn(),
    success: vi.fn(),
    error: vi.fn()
  }
}))

import { toast } from '@renderer/lib/toast'

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

suite('useFileChangeListener', () => {
  let capturedCallback: ((event: FileChangeEvent) => void) | null
  let mockUnsubscribe: ReturnType<typeof vi.fn>

  beforeEach(() => {
    capturedCallback = null
    mockUnsubscribe = vi.fn()
    vi.mocked(toast.info).mockClear()
    vi.mocked(toast.warning).mockClear()

    mockApi.onFileChanged.subscribe.mockImplementation((cb: (event: FileChangeEvent) => void) => {
      capturedCallback = cb
      return mockUnsubscribe
    })
  })

  it('subscribes to file changes on mount', () => {
    const { wrapper } = createWrapper()
    renderHook(() => useFileChangeListener(), { wrapper })

    expect(mockApi.onFileChanged.subscribe).toHaveBeenCalledOnce()
    expect(mockApi.onFileChanged.subscribe).toHaveBeenCalledWith(expect.any(Function))
  })

  it('unsubscribes on unmount', () => {
    const { wrapper } = createWrapper()
    const { unmount } = renderHook(() => useFileChangeListener(), { wrapper })

    expect(mockUnsubscribe).not.toHaveBeenCalled()
    unmount()
    expect(mockUnsubscribe).toHaveBeenCalledOnce()
  })

  it('invalidates all query roots on modified event', () => {
    const { wrapper, queryClient } = createWrapper()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    renderHook(() => useFileChangeListener(), { wrapper })

    act(() => {
      capturedCallback!({
        type: 'modified',
        path: '/project/prt.json',
        timestamp: Date.now()
      })
    })

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['project'] })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['tasks'] })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['deps'] })
  })

  it('invalidates all query roots on deleted event', () => {
    const { wrapper, queryClient } = createWrapper()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    renderHook(() => useFileChangeListener(), { wrapper })

    act(() => {
      capturedCallback!({
        type: 'deleted',
        path: '/project/prt.json',
        timestamp: Date.now()
      })
    })

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['project'] })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['tasks'] })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['deps'] })
  })

  it('shows info toast on modified event', () => {
    const { wrapper } = createWrapper()
    renderHook(() => useFileChangeListener(), { wrapper })

    act(() => {
      capturedCallback!({
        type: 'modified',
        path: '/project/prt.json',
        timestamp: Date.now()
      })
    })

    expect(toast.info).toHaveBeenCalledWith(
      'Project updated',
      'External changes detected and reloaded'
    )
  })

  it('shows warning toast on deleted event', () => {
    const { wrapper } = createWrapper()
    renderHook(() => useFileChangeListener(), { wrapper })

    act(() => {
      capturedCallback!({
        type: 'deleted',
        path: '/project/prt.json',
        timestamp: Date.now()
      })
    })

    expect(toast.warning).toHaveBeenCalledWith(
      'Project file deleted',
      'The prt.json file was removed externally'
    )
  })
})
