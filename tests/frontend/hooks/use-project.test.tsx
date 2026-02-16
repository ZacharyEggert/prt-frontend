import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  useProjectStats,
  useProjectValidation,
  useProjectMetadata,
  useSaveProject,
  useSelectDirectory
} from '@renderer/hooks/use-project'
import { queryKeys } from '@renderer/lib/query-keys'
import { mockApi } from '../mocks/mock-api'
import {
  createStats,
  createValidationResult,
  createMetadata,
  createSaveResult,
  createRoadmap,
  createDirectorySelectResult
} from '../mocks/factories'

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

describe('useProjectStats', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls window.api.project.stats and returns stats', async () => {
    const stats = createStats({ totalTasks: 10 })
    mockApi.project.stats.mockResolvedValueOnce(stats)
    const { wrapper } = createWrapper()

    const { result } = renderHook(() => useProjectStats(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(stats)
    expect(mockApi.project.stats).toHaveBeenCalled()
  })
})

describe('useProjectValidation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls window.api.project.validate and returns result', async () => {
    const validationResult = createValidationResult({ success: true })
    mockApi.project.validate.mockResolvedValueOnce(validationResult)
    const { wrapper } = createWrapper()

    const { result } = renderHook(() => useProjectValidation(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(validationResult)
    expect(mockApi.project.validate).toHaveBeenCalled()
  })
})

describe('useProjectMetadata', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls window.api.project.metadata and returns metadata', async () => {
    const metadata = createMetadata({ name: 'My Project' })
    mockApi.project.metadata.mockResolvedValueOnce(metadata)
    const { wrapper } = createWrapper()

    const { result } = renderHook(() => useProjectMetadata(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(metadata)
    expect(mockApi.project.metadata).toHaveBeenCalled()
  })
})

describe('useSaveProject', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls window.api.project.save and invalidates caches on success', async () => {
    const saveResult = createSaveResult({ path: '/test/prt.json' })
    mockApi.project.save.mockResolvedValueOnce(saveResult)
    const { wrapper, queryClient } = createWrapper()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useSaveProject(), { wrapper })

    const roadmap = createRoadmap()
    result.current.mutate(roadmap)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockApi.project.save).toHaveBeenCalledWith(roadmap)
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.project.stats() })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.project.validation() })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.project.metadata() })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.tasks.root })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.deps.root })
    expect(toast.success).toHaveBeenCalledWith('Project saved', `Saved to /test/prt.json`)
  })

  it('shows error toast on failure', async () => {
    mockApi.project.save.mockRejectedValueOnce(new Error('Save failed'))
    const { wrapper } = createWrapper()

    const { result } = renderHook(() => useSaveProject(), { wrapper })

    result.current.mutate(createRoadmap())

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(toast.error).toHaveBeenCalledWith('Failed to save project', 'Save failed')
  })
})

describe('useSelectDirectory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls window.api.project.selectDirectory', async () => {
    const dirResult = createDirectorySelectResult({ path: '/chosen/dir' })
    mockApi.project.selectDirectory.mockResolvedValueOnce(dirResult)
    const { wrapper } = createWrapper()

    const { result } = renderHook(() => useSelectDirectory(), { wrapper })

    result.current.mutate()

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(dirResult)
    expect(mockApi.project.selectDirectory).toHaveBeenCalled()
  })
})
