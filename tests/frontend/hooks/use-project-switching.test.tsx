import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useOpenProject, useOpenProjectDialog, useInitProject } from '@renderer/hooks/use-project'
import { queryKeys } from '@renderer/lib/query-keys'
import { mockApi } from '../mocks/mock-api'
import { createRoadmap, createTask, createOpenDialogResult } from '../mocks/factories'

vi.mock('@renderer/lib/toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn()
  }
}))

function createWrapper(): {
  wrapper: ({ children }: { children: React.ReactNode }) => React.JSX.Element
  queryClient: QueryClient
} {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity, staleTime: Infinity }
    }
  })

  const wrapper = ({ children }: { children: React.ReactNode }): React.JSX.Element => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  return { wrapper, queryClient }
}

describe('project switching cache cleanup', () => {
  const oldTask = createTask({ id: 'OLD-001', title: 'Old Task' })
  const newRoadmap = createRoadmap({
    metadata: {
      name: 'New Project',
      description: 'New',
      createdBy: 'test',
      createdAt: '2024-06-01T00:00:00Z'
    }
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('useOpenProject', () => {
    it('removes old task data from cache on success', async () => {
      const { wrapper, queryClient } = createWrapper()

      // Pre-populate cache with old project data
      queryClient.setQueryData(queryKeys.tasks.lists(), [oldTask])
      queryClient.setQueryData(queryKeys.deps.graph(), { blocks: {}, dependsOn: {} })

      mockApi.project.open.mockResolvedValue(newRoadmap)

      const { result } = renderHook(() => useOpenProject(), { wrapper })

      result.current.mutate('/new/project/prt.json')

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      // Old data should be removed
      expect(queryClient.getQueryData(queryKeys.tasks.lists())).toBeUndefined()
      expect(queryClient.getQueryData(queryKeys.deps.graph())).toBeUndefined()
    })

    it('sets optimistic metadata for the new project', async () => {
      const { wrapper, queryClient } = createWrapper()

      mockApi.project.open.mockResolvedValue(newRoadmap)

      const { result } = renderHook(() => useOpenProject(), { wrapper })

      result.current.mutate('/new/project/prt.json')

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(queryClient.getQueryData(queryKeys.project.metadata())).toEqual(newRoadmap.metadata)
    })

    it('cancels in-flight queries before removing cache', async () => {
      const { wrapper, queryClient } = createWrapper()
      const cancelSpy = vi.spyOn(queryClient, 'cancelQueries')

      mockApi.project.open.mockResolvedValue(newRoadmap)

      const { result } = renderHook(() => useOpenProject(), { wrapper })

      result.current.mutate('/new/project/prt.json')

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(cancelSpy).toHaveBeenCalledWith({ queryKey: queryKeys.project.root })
      expect(cancelSpy).toHaveBeenCalledWith({ queryKey: queryKeys.tasks.root })
      expect(cancelSpy).toHaveBeenCalledWith({ queryKey: queryKeys.deps.root })
    })

    it('calls removeQueries for all cache domains', async () => {
      const { wrapper, queryClient } = createWrapper()
      const removeSpy = vi.spyOn(queryClient, 'removeQueries')

      mockApi.project.open.mockResolvedValue(newRoadmap)

      const { result } = renderHook(() => useOpenProject(), { wrapper })

      result.current.mutate('/new/project/prt.json')

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(removeSpy).toHaveBeenCalledWith({ queryKey: queryKeys.project.root })
      expect(removeSpy).toHaveBeenCalledWith({ queryKey: queryKeys.tasks.root })
      expect(removeSpy).toHaveBeenCalledWith({ queryKey: queryKeys.deps.root })
    })
  })

  describe('useOpenProjectDialog', () => {
    it('does not clear cache when dialog is canceled', async () => {
      const { wrapper, queryClient } = createWrapper()

      queryClient.setQueryData(queryKeys.tasks.lists(), [oldTask])

      mockApi.project.openDialog.mockResolvedValue(
        createOpenDialogResult({ canceled: true, roadmap: undefined })
      )

      const removeSpy = vi.spyOn(queryClient, 'removeQueries')
      const { result } = renderHook(() => useOpenProjectDialog(), { wrapper })

      result.current.mutate()

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(removeSpy).not.toHaveBeenCalled()
      // Old data should still be in cache
      expect(queryClient.getQueryData(queryKeys.tasks.lists())).toEqual([oldTask])
    })

    it('clears cache and sets metadata when dialog succeeds', async () => {
      const { wrapper, queryClient } = createWrapper()

      queryClient.setQueryData(queryKeys.tasks.lists(), [oldTask])

      mockApi.project.openDialog.mockResolvedValue(
        createOpenDialogResult({ canceled: false, roadmap: newRoadmap })
      )

      const { result } = renderHook(() => useOpenProjectDialog(), { wrapper })

      result.current.mutate()

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      // Old task data should be removed
      expect(queryClient.getQueryData(queryKeys.tasks.lists())).toBeUndefined()
      // New metadata should be set
      expect(queryClient.getQueryData(queryKeys.project.metadata())).toEqual(newRoadmap.metadata)
    })
  })

  describe('useInitProject', () => {
    it('clears previous project cache on init', async () => {
      const { wrapper, queryClient } = createWrapper()

      queryClient.setQueryData(queryKeys.tasks.lists(), [oldTask])
      queryClient.setQueryData(queryKeys.deps.graph(), { blocks: {}, dependsOn: {} })

      mockApi.project.init.mockResolvedValue(newRoadmap)

      const { result } = renderHook(() => useInitProject(), { wrapper })

      result.current.mutate({
        path: '/new/project',
        name: 'New Project',
        description: 'Test'
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      // Old data should be removed
      expect(queryClient.getQueryData(queryKeys.tasks.lists())).toBeUndefined()
      expect(queryClient.getQueryData(queryKeys.deps.graph())).toBeUndefined()
      // New metadata should be set
      expect(queryClient.getQueryData(queryKeys.project.metadata())).toEqual(newRoadmap.metadata)
    })
  })
})
