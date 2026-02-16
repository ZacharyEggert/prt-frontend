import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  useTasks,
  useTask,
  useAddTask,
  useUpdateTask,
  useCompleteTask,
  usePassTest,
  useDeleteTask
} from '@renderer/hooks/use-tasks'
import { queryKeys } from '@renderer/lib/query-keys'
import { mockApi } from '../mocks/mock-api'
import { createTask, createDeleteResult } from '../mocks/factories'
import { STATUS } from 'project-roadmap-tracking/dist/util/types'

vi.mock('@renderer/lib/toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn()
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

describe('useTasks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls window.api.task.list and returns tasks', async () => {
    const tasks = [createTask({ id: 'F-001' }), createTask({ id: 'F-002' })]
    mockApi.task.list.mockResolvedValueOnce(tasks)
    const { wrapper } = createWrapper()

    const { result } = renderHook(() => useTasks(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(tasks)
    expect(mockApi.task.list).toHaveBeenCalledWith(undefined)
  })

  it('passes options to window.api.task.list', async () => {
    mockApi.task.list.mockResolvedValueOnce([])
    const { wrapper } = createWrapper()
    const options = { status: STATUS.NotStarted as const }

    const { result } = renderHook(() => useTasks(options), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockApi.task.list).toHaveBeenCalledWith(options)
  })
})

describe('useTask', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls window.api.task.get with taskId', async () => {
    const task = createTask({ id: 'F-005', title: 'Specific Task' })
    mockApi.task.get.mockResolvedValueOnce(task)
    const { wrapper } = createWrapper()

    const { result } = renderHook(() => useTask('F-005'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(task)
    expect(mockApi.task.get).toHaveBeenCalledWith('F-005')
  })
})

describe('useAddTask', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls window.api.task.add and invalidates caches on success', async () => {
    const newTask = createTask({ id: 'F-010', title: 'New Task' })
    mockApi.task.add.mockResolvedValueOnce(newTask)
    const { wrapper, queryClient } = createWrapper()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useAddTask(), { wrapper })

    result.current.mutate({ title: 'New Task', details: 'Details', type: 'feature' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockApi.task.add).toHaveBeenCalledWith({
      title: 'New Task',
      details: 'Details',
      type: 'feature'
    })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.tasks.root })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.project.stats() })
    expect(queryClient.getQueryData(queryKeys.tasks.detail('F-010'))).toEqual(newTask)
    expect(toast.success).toHaveBeenCalledWith('Task created', 'F-010: New Task')
  })

  it('shows error toast on failure', async () => {
    mockApi.task.add.mockRejectedValueOnce(new Error('Failed to create'))
    const { wrapper } = createWrapper()

    const { result } = renderHook(() => useAddTask(), { wrapper })

    result.current.mutate({ title: 'Fail', details: '', type: 'feature' })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(toast.error).toHaveBeenCalledWith('Failed to create task', 'Failed to create')
  })
})

describe('useUpdateTask', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls window.api.task.update and invalidates caches', async () => {
    const updatedTask = createTask({ id: 'F-001', title: 'Updated' })
    mockApi.task.update.mockResolvedValueOnce(updatedTask)
    const { wrapper, queryClient } = createWrapper()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useUpdateTask(), { wrapper })

    result.current.mutate({ taskId: 'F-001', updates: { title: 'Updated' } })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockApi.task.update).toHaveBeenCalledWith('F-001', { title: 'Updated' })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.tasks.lists() })
    expect(queryClient.getQueryData(queryKeys.tasks.detail('F-001'))).toEqual(updatedTask)
    expect(toast.success).toHaveBeenCalledWith('Task updated', 'Updated')
  })

  it('invalidates deps when depends-on is updated', async () => {
    const updatedTask = createTask({ id: 'F-001', 'depends-on': ['F-002'] })
    mockApi.task.update.mockResolvedValueOnce(updatedTask)
    const { wrapper, queryClient } = createWrapper()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useUpdateTask(), { wrapper })

    result.current.mutate({ taskId: 'F-001', updates: { 'depends-on': ['F-002'] } })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.deps.root })
  })

  it('invalidates deps when blocks is updated', async () => {
    const updatedTask = createTask({ id: 'F-001', blocks: ['F-003'] })
    mockApi.task.update.mockResolvedValueOnce(updatedTask)
    const { wrapper, queryClient } = createWrapper()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useUpdateTask(), { wrapper })

    result.current.mutate({ taskId: 'F-001', updates: { blocks: ['F-003'] } })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.deps.root })
  })

  it('does not invalidate deps for non-dependency updates', async () => {
    const updatedTask = createTask({ id: 'F-001', title: 'No deps change' })
    mockApi.task.update.mockResolvedValueOnce(updatedTask)
    const { wrapper, queryClient } = createWrapper()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useUpdateTask(), { wrapper })

    result.current.mutate({ taskId: 'F-001', updates: { title: 'No deps change' } })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(invalidateSpy).not.toHaveBeenCalledWith({ queryKey: queryKeys.deps.root })
  })

  it('shows error toast on failure', async () => {
    mockApi.task.update.mockRejectedValueOnce(new Error('Update failed'))
    const { wrapper } = createWrapper()

    const { result } = renderHook(() => useUpdateTask(), { wrapper })

    result.current.mutate({ taskId: 'F-001', updates: { title: 'Fail' } })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(toast.error).toHaveBeenCalledWith('Failed to update task', 'Update failed')
  })
})

describe('useCompleteTask', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls window.api.task.complete and invalidates caches', async () => {
    const completedTask = createTask({ id: 'F-001', status: STATUS.Completed })
    mockApi.task.complete.mockResolvedValueOnce(completedTask)
    const { wrapper, queryClient } = createWrapper()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useCompleteTask(), { wrapper })

    result.current.mutate('F-001')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockApi.task.complete).toHaveBeenCalledWith('F-001')
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.tasks.root })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.project.stats() })
    expect(queryClient.getQueryData(queryKeys.tasks.detail('F-001'))).toEqual(completedTask)
    expect(toast.success).toHaveBeenCalledWith('Task completed', completedTask.title)
  })

  it('shows error toast on failure', async () => {
    mockApi.task.complete.mockRejectedValueOnce(new Error('Complete failed'))
    const { wrapper } = createWrapper()

    const { result } = renderHook(() => useCompleteTask(), { wrapper })

    result.current.mutate('F-001')

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(toast.error).toHaveBeenCalledWith('Failed to complete task', 'Complete failed')
  })
})

describe('usePassTest', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls window.api.task.passTest and invalidates caches', async () => {
    const passedTask = createTask({ id: 'F-001', 'passes-tests': true })
    mockApi.task.passTest.mockResolvedValueOnce(passedTask)
    const { wrapper, queryClient } = createWrapper()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => usePassTest(), { wrapper })

    result.current.mutate('F-001')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockApi.task.passTest).toHaveBeenCalledWith('F-001')
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.tasks.lists() })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.project.stats() })
    expect(queryClient.getQueryData(queryKeys.tasks.detail('F-001'))).toEqual(passedTask)
    expect(toast.success).toHaveBeenCalledWith('Tests marked as passing', passedTask.title)
  })

  it('shows error toast on failure', async () => {
    mockApi.task.passTest.mockRejectedValueOnce(new Error('Pass test failed'))
    const { wrapper } = createWrapper()

    const { result } = renderHook(() => usePassTest(), { wrapper })

    result.current.mutate('F-001')

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(toast.error).toHaveBeenCalledWith('Failed to mark tests as passing', 'Pass test failed')
  })
})

describe('useDeleteTask', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls window.api.task.delete and invalidates caches', async () => {
    const deleteResult = createDeleteResult({ deletedTaskId: 'F-001' })
    mockApi.task.delete.mockResolvedValueOnce(deleteResult)
    const { wrapper, queryClient } = createWrapper()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const removeSpy = vi.spyOn(queryClient, 'removeQueries')

    const { result } = renderHook(() => useDeleteTask(), { wrapper })

    result.current.mutate('F-001')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockApi.task.delete).toHaveBeenCalledWith('F-001')
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.tasks.root })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.project.stats() })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.deps.root })
    expect(removeSpy).toHaveBeenCalledWith({ queryKey: queryKeys.tasks.detail('F-001') })
    expect(toast.success).toHaveBeenCalledWith('Task deleted', 'F-001')
  })

  it('shows error toast on failure', async () => {
    mockApi.task.delete.mockRejectedValueOnce(new Error('Delete failed'))
    const { wrapper } = createWrapper()

    const { result } = renderHook(() => useDeleteTask(), { wrapper })

    result.current.mutate('F-001')

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(toast.error).toHaveBeenCalledWith('Failed to delete task', 'Delete failed')
  })
})
