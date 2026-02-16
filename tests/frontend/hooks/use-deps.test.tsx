import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  useTaskDeps,
  useDependencyGraph,
  useAddDependency,
  useRemoveDependency
} from '@renderer/hooks/use-deps'
import { queryKeys } from '@renderer/lib/query-keys'
import { mockApi } from '../mocks/mock-api'
import {
  createDependencyInfo,
  createDependencyGraph,
  createTask,
  createDepUpdateResult
} from '../mocks/factories'

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

describe('useTaskDeps', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls window.api.deps.get with taskId', async () => {
    const deps = createDependencyInfo({
      dependsOn: [createTask({ id: 'F-001' })],
      blocks: [createTask({ id: 'F-003' })]
    })
    mockApi.deps.get.mockResolvedValueOnce(deps)
    const { wrapper } = createWrapper()

    const { result } = renderHook(() => useTaskDeps('F-002'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(deps)
    expect(mockApi.deps.get).toHaveBeenCalledWith('F-002')
  })
})

describe('useDependencyGraph', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls window.api.deps.graph and returns graph', async () => {
    const graph = createDependencyGraph({
      blocks: { 'F-001': ['F-002'] },
      dependsOn: { 'F-002': ['F-001'] }
    })
    mockApi.deps.graph.mockResolvedValueOnce(graph)
    const { wrapper } = createWrapper()

    const { result } = renderHook(() => useDependencyGraph(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(graph)
    expect(mockApi.deps.graph).toHaveBeenCalled()
  })
})

describe('useAddDependency', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls window.api.deps.add and invalidates caches', async () => {
    const task1 = createTask({ id: 'F-001' })
    const task2 = createTask({ id: 'F-002' })
    const depResult = createDepUpdateResult({ updatedTasks: [task1, task2] })
    mockApi.deps.add.mockResolvedValueOnce(depResult)
    const { wrapper, queryClient } = createWrapper()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useAddDependency(), { wrapper })

    result.current.mutate({
      fromTaskId: 'F-002',
      toTaskId: 'F-001',
      type: 'depends-on'
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockApi.deps.add).toHaveBeenCalledWith({
      fromTaskId: 'F-002',
      toTaskId: 'F-001',
      type: 'depends-on'
    })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.deps.root })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.tasks.lists() })
    // Should invalidate detail for each updated task
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.tasks.detail('F-001') })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.tasks.detail('F-002') })
  })
})

describe('useRemoveDependency', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls window.api.deps.remove and invalidates caches', async () => {
    const task1 = createTask({ id: 'F-001' })
    const task2 = createTask({ id: 'F-002' })
    const depResult = createDepUpdateResult({ updatedTasks: [task1, task2] })
    mockApi.deps.remove.mockResolvedValueOnce(depResult)
    const { wrapper, queryClient } = createWrapper()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useRemoveDependency(), { wrapper })

    result.current.mutate({
      fromTaskId: 'F-002',
      toTaskId: 'F-001',
      type: 'depends-on'
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockApi.deps.remove).toHaveBeenCalledWith({
      fromTaskId: 'F-002',
      toTaskId: 'F-001',
      type: 'depends-on'
    })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.deps.root })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.tasks.lists() })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.tasks.detail('F-001') })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.tasks.detail('F-002') })
  })
})
