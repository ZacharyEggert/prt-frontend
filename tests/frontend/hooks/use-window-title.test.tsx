import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useWindowTitle } from '@renderer/hooks/use-window-title'
import { mockApi } from '../mocks/mock-api'
import { createMetadata } from '../mocks/factories'
import type { ViewType } from '@renderer/hooks/use-navigation'

let currentView: ViewType = 'welcome'

vi.mock('@renderer/hooks/use-navigation', () => ({
  useNavigation: () => ({ currentView, navigate: vi.fn() }),
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

describe('useWindowTitle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.title = 'Initial'
    currentView = 'welcome'
  })

  it('uses default title on welcome view', async () => {
    const { wrapper } = createWrapper()
    renderHook(() => useWindowTitle(), { wrapper })

    await waitFor(() => {
      expect(document.title).toBe('PRT')
    })
  })

  it('updates title with project name on project views', async () => {
    currentView = 'dashboard'
    mockApi.project.metadata.mockResolvedValueOnce(createMetadata({ name: 'Title Project' }))
    const { wrapper } = createWrapper()
    renderHook(() => useWindowTitle(), { wrapper })

    await waitFor(() => {
      expect(document.title).toBe('PRT - Title Project')
    })
  })

  it('resets title to default when returning to welcome view', async () => {
    currentView = 'dashboard'
    mockApi.project.metadata.mockResolvedValueOnce(createMetadata({ name: 'Temporary Title' }))
    const { wrapper } = createWrapper()
    const { rerender } = renderHook(() => useWindowTitle(), { wrapper })

    await waitFor(() => {
      expect(document.title).toBe('PRT - Temporary Title')
    })

    currentView = 'welcome'
    rerender()

    await waitFor(() => {
      expect(document.title).toBe('PRT')
    })
  })
})
