import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAppMenuCommands } from '@renderer/hooks/use-app-menu-commands'
import { mockApi } from '../mocks/mock-api'
import {
  MENU_NEW_PROJECT_DIRECTORY_EVENT,
  type MenuNewProjectDirectoryEventDetail
} from '@renderer/lib/menu-events'
import { createOpenDialogResult, createRoadmap, createSaveResult } from '../mocks/factories'
import type { MenuCommand } from '../../../src/preload/index.d'

vi.mock('@renderer/lib/toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn()
  }
}))

import { toast } from '@renderer/lib/toast'

const mockNavigate = vi.fn()
vi.mock('@renderer/hooks/use-navigation', () => ({
  useNavigation: () => ({ currentView: 'welcome', navigate: mockNavigate }),
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

describe('useAppMenuCommands', () => {
  let menuCallback: ((command: MenuCommand) => void) | null = null
  const unsubscribe = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    menuCallback = null
    mockApi.menu.subscribe.mockImplementation((callback: (command: MenuCommand) => void) => {
      menuCallback = callback
      return unsubscribe
    })
  })

  it('subscribes to menu events and unsubscribes on unmount', () => {
    const { wrapper } = createWrapper()
    const { unmount } = renderHook(() => useAppMenuCommands(), { wrapper })

    expect(mockApi.menu.subscribe).toHaveBeenCalledOnce()
    unmount()
    expect(unsubscribe).toHaveBeenCalledOnce()
  })

  it('handles open-project by opening dialog and navigating on success', async () => {
    const roadmap = createRoadmap({
      metadata: {
        name: 'Opened Project',
        description: '',
        createdBy: 'test',
        createdAt: '2024-01-01T00:00:00Z'
      }
    })
    mockApi.project.openDialog.mockResolvedValueOnce(
      createOpenDialogResult({ canceled: false, roadmap })
    )
    const { wrapper } = createWrapper()
    renderHook(() => useAppMenuCommands(), { wrapper })

    act(() => {
      menuCallback?.('open-project')
    })

    await waitFor(() => {
      expect(mockApi.project.openDialog).toHaveBeenCalled()
      expect(mockNavigate).toHaveBeenCalledWith('dashboard')
    })
  })

  it('handles new-project by navigating and dispatching selected directory event', async () => {
    mockApi.project.selectDirectory.mockResolvedValueOnce({
      canceled: false,
      path: '/tmp/menu-new-project'
    })
    const { wrapper } = createWrapper()
    renderHook(() => useAppMenuCommands(), { wrapper })

    let selectedPath = ''
    const listener = (event: Event): void => {
      selectedPath = (event as CustomEvent<MenuNewProjectDirectoryEventDetail>).detail.path
    }
    window.addEventListener(MENU_NEW_PROJECT_DIRECTORY_EVENT, listener)

    act(() => {
      menuCallback?.('new-project')
    })

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('welcome')
      expect(mockApi.project.selectDirectory).toHaveBeenCalled()
      expect(selectedPath).toBe('/tmp/menu-new-project')
    })

    window.removeEventListener(MENU_NEW_PROJECT_DIRECTORY_EVENT, listener)
  })

  it('handles save-project by calling saveCurrent and showing success toast', async () => {
    mockApi.project.saveCurrent.mockResolvedValueOnce(
      createSaveResult({ path: '/tmp/menu-save/prt.json' })
    )
    const { wrapper } = createWrapper()
    renderHook(() => useAppMenuCommands(), { wrapper })

    act(() => {
      menuCallback?.('save-project')
    })

    await waitFor(() => {
      expect(mockApi.project.saveCurrent).toHaveBeenCalled()
      expect(toast.success).toHaveBeenCalledWith(
        'Project saved',
        'Saved to /tmp/menu-save/prt.json'
      )
    })
  })
})
