/**
 * Project query hooks for TanStack Query.
 *
 * Provides React hooks for project-level operations with automatic cache management:
 *
 * **Read hooks (useQuery):**
 * - useProjectStats - Fetch project statistics
 * - useProjectValidation - Validate project structure
 *
 * **Mutation hooks (useMutation):**
 * - useOpenProject - Open project by path
 * - useOpenProjectDialog - Open project via file dialog
 * - useSelectDirectory - Select directory for new project
 * - useInitProject - Initialize new project
 * - useSaveProject - Save roadmap to disk
 *
 * All mutation hooks automatically invalidate related queries to keep the UI
 * synchronized with backend state changes.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  UseQueryOptions,
  UseMutationOptions,
  UseQueryResult,
  UseMutationResult
} from '@tanstack/react-query'
import type { Roadmap } from 'project-roadmap-tracking/dist/util/types'
import type { RoadmapStats } from 'project-roadmap-tracking/dist/services/roadmap.service'
import type {
  InitOptions,
  OpenDialogResult,
  DirectorySelectResult,
  SaveResult,
  ProjectValidationResult
  // @ts-ignore - This type is defined in preload/index.d.ts and should be available globally
} from '../../../preload/index'
import { queryKeys } from '@renderer/lib/query-keys'
import { toast } from '@renderer/lib/toast'

// ============================================================================
// Read Hooks (useQuery)
// ============================================================================

/**
 * Fetches statistics for the currently open project.
 *
 * @param options - Optional TanStack Query options for customization
 * @returns Query result with project statistics
 *
 * @example
 * ```tsx
 * function StatsDisplay() {
 *   const { data, isLoading, error } = useProjectStats()
 *
 *   if (isLoading) return <div>Loading stats...</div>
 *   if (error) return <div>Error: {error.message}</div>
 *
 *   return <div>Total tasks: {data.totalTasks}</div>
 * }
 * ```
 */
export function useProjectStats(
  options?: UseQueryOptions<RoadmapStats, Error>
): UseQueryResult<RoadmapStats, Error> {
  return useQuery({
    queryKey: queryKeys.project.stats(),
    queryFn: () => window.api.project.stats(),
    ...options
  })
}

/**
 * Validates the structure of the currently open project.
 *
 * @param options - Optional TanStack Query options for customization
 * @returns Query result with validation status and errors (if any)
 *
 * @example
 * ```tsx
 * function ValidationStatus() {
 *   const { data, isLoading } = useProjectValidation()
 *
 *   if (isLoading) return <div>Validating...</div>
 *
 *   return (
 *     <div>
 *       {data?.success ? (
 *         <span>✓ Valid</span>
 *       ) : (
 *         <span>✗ Errors: {data?.errors}</span>
 *       )}
 *     </div>
 *   )
 * }
 * ```
 */
export function useProjectValidation(
  options?: UseQueryOptions<ProjectValidationResult, Error>
): UseQueryResult<ProjectValidationResult, Error> {
  return useQuery({
    queryKey: queryKeys.project.validation(),
    queryFn: () => window.api.project.validate(),
    ...options
  })
}

// ============================================================================
// Mutation Hooks (useMutation)
// ============================================================================

/**
 * Opens a project file at the specified path and sets it as the current project.
 *
 * **Side effects:**
 * - Invalidates all project, task, and dependency queries (data from old project)
 * - Sets new roadmap in cache for immediate access
 *
 * @param options - Optional TanStack Query mutation options
 * @returns Mutation result with mutate function
 *
 * @example
 * ```tsx
 * function OpenProjectButton() {
 *   const openProject = useOpenProject({
 *     onSuccess: (roadmap) => {
 *       console.log('Opened project:', roadmap.projectInfo.name)
 *     },
 *     onError: (error) => {
 *       console.error('Failed to open project:', error.message)
 *     }
 *   })
 *
 *   return (
 *     <button
 *       onClick={() => openProject.mutate('/path/to/project/prt.json')}
 *       disabled={openProject.isPending}
 *     >
 *       {openProject.isPending ? 'Opening...' : 'Open Project'}
 *     </button>
 *   )
 * }
 * ```
 */
export function useOpenProject(
  options?: UseMutationOptions<Roadmap, Error, string, unknown>
): UseMutationResult<Roadmap, Error, string, unknown> {
  const queryClient = useQueryClient()

  return useMutation({
    ...options,
    mutationFn: (projectPath: string) => window.api.project.open(projectPath),
    onSuccess: async (roadmap, projectPath, context, meta) => {
      // Invalidate ALL queries from previous project
      queryClient.invalidateQueries({ queryKey: queryKeys.project.root })
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.root })
      queryClient.invalidateQueries({ queryKey: queryKeys.deps.root })

      // Optimistically cache the new roadmap
      queryClient.setQueryData(queryKeys.project.roadmap(projectPath), roadmap)

      // Show success toast
      toast.success('Project opened', roadmap.metadata.name)

      // Call user's onSuccess if provided
      await options?.onSuccess?.(roadmap, projectPath, context, meta)
    },
    onError: async (error, projectPath, context, meta) => {
      // Show error toast
      toast.error('Failed to open project', error.message)

      // Call user's onError if provided
      await options?.onError?.(error, projectPath, context, meta)
    }
  })
}

/**
 * Shows a native file picker dialog to select and open a project.
 *
 * **Side effects (if not canceled):**
 * - Invalidates all project, task, and dependency queries
 * - Sets new roadmap in cache for immediate access
 *
 * @param options - Optional TanStack Query mutation options
 * @returns Mutation result with mutate function
 *
 * @example
 * ```tsx
 * function OpenDialogButton() {
 *   const openDialog = useOpenProjectDialog({
 *     onSuccess: (result) => {
 *       if (!result.canceled && result.roadmap) {
 *         console.log('Opened:', result.roadmap.projectInfo.name)
 *       }
 *     }
 *   })
 *
 *   return (
 *     <button onClick={() => openDialog.mutate()}>
 *       Browse for Project
 *     </button>
 *   )
 * }
 * ```
 */
export function useOpenProjectDialog(
  options?: UseMutationOptions<OpenDialogResult, Error, void, unknown>
): UseMutationResult<OpenDialogResult, Error, void, unknown> {
  const queryClient = useQueryClient()

  return useMutation({
    ...options,
    mutationFn: () => window.api.project.openDialog(),
    onSuccess: async (result, variables, context, meta) => {
      // Only invalidate if user didn't cancel
      if (!result.canceled && result.roadmap) {
        // Invalidate ALL queries from previous project
        queryClient.invalidateQueries({ queryKey: queryKeys.project.root })
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks.root })
        queryClient.invalidateQueries({ queryKey: queryKeys.deps.root })

        // Show success toast
        toast.success('Project opened', result.roadmap.metadata.name)

        // Note: We don't have the path here to cache the roadmap
        // The roadmap will be fetched via other queries as needed
      }

      // Call user's onSuccess if provided
      await options?.onSuccess?.(result, variables, context, meta)
    },
    onError: async (error, variables, context, meta) => {
      // Show error toast
      toast.error('Failed to open project', error.message)

      // Call user's onError if provided
      await options?.onError?.(error, variables, context, meta)
    }
  })
}

/**
 * Shows a native directory picker for selecting where to create a new project.
 *
 * Unlike `useOpenProjectDialog`, this only selects a directory without opening
 * a project. Use this to get a path before calling `useInitProject`.
 *
 * @param options - Optional TanStack Query mutation options
 * @returns Mutation result with directory selection result
 *
 * @example
 * ```tsx
 * function CreateProjectButton() {
 *   const selectDir = useSelectDirectory({
 *     onSuccess: (result) => {
 *       if (!result.canceled && result.path) {
 *         console.log('Selected directory:', result.path)
 *       }
 *     }
 *   })
 *
 *   return (
 *     <button onClick={() => selectDir.mutate()}>
 *       Choose Directory
 *     </button>
 *   )
 * }
 * ```
 */
export function useSelectDirectory(
  options?: UseMutationOptions<DirectorySelectResult, Error, void, unknown>
): UseMutationResult<DirectorySelectResult, Error, void, unknown> {
  return useMutation({
    ...options,
    mutationFn: () => window.api.project.selectDirectory()
  })
}

/**
 * Initializes a new PRT project at the specified location.
 *
 * **Side effects:**
 * - Creates new prt.json file via CLI
 * - Invalidates all project, task, and dependency queries
 * - Sets new roadmap in cache for immediate access
 *
 * @param options - Optional TanStack Query mutation options
 * @returns Mutation result with mutate function
 *
 * @example
 * ```tsx
 * function CreateProjectForm() {
 *   const initProject = useInitProject({
 *     onSuccess: (roadmap) => {
 *       console.log('Created project:', roadmap.metadata.name)
 *     }
 *   })
 *
 *   const handleSubmit = (e: React.FormEvent) => {
 *     e.preventDefault()
 *     initProject.mutate({
 *       path: '/path/to/new/project',
 *       name: 'My Project',
 *       description: 'Project description',
 *       withSampleTasks: true
 *     })
 *   }
 *
 *   return <form onSubmit={handleSubmit}>...</form>
 * }
 * ```
 */
export function useInitProject(
  options?: UseMutationOptions<Roadmap, Error, InitOptions, unknown>
): UseMutationResult<Roadmap, Error, InitOptions, unknown> {
  const queryClient = useQueryClient()

  return useMutation({
    ...options,
    mutationFn: (initOptions: InitOptions) => window.api.project.init(initOptions),
    onSuccess: async (roadmap, initOptions, context, meta) => {
      // Invalidate ALL queries from previous project
      queryClient.invalidateQueries({ queryKey: queryKeys.project.root })
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.root })
      queryClient.invalidateQueries({ queryKey: queryKeys.deps.root })

      // Optimistically cache the new roadmap
      // Path is the directory + prt.json
      const projectPath = `${initOptions.path}/prt.json`
      queryClient.setQueryData(queryKeys.project.roadmap(projectPath), roadmap)

      // Show success toast
      toast.success('Project created', roadmap.metadata.name)

      // Call user's onSuccess if provided
      await options?.onSuccess?.(roadmap, initOptions, context, meta)
    },
    onError: async (error, initOptions, context, meta) => {
      // Show error toast
      toast.error('Failed to create project', error.message)

      // Call user's onError if provided
      await options?.onError?.(error, initOptions, context, meta)
    }
  })
}

/**
 * Saves the roadmap to disk.
 *
 * **Side effects:**
 * - Writes roadmap data to prt.json file
 * - Invalidates stats, validation, tasks, and dependencies (data may have changed)
 *
 * @param options - Optional TanStack Query mutation options
 * @returns Mutation result with mutate function
 *
 * @example
 * ```tsx
 * function SaveButton() {
 *   const saveProject = useSaveProject({
 *     onSuccess: (result) => {
 *       console.log('Saved to:', result.path)
 *     }
 *   })
 *
 *   const handleSave = (roadmap: Roadmap) => {
 *     saveProject.mutate(roadmap)
 *   }
 *
 *   return (
 *     <button
 *       onClick={() => handleSave(currentRoadmap)}
 *       disabled={saveProject.isPending}
 *     >
 *       {saveProject.isPending ? 'Saving...' : 'Save Project'}
 *     </button>
 *   )
 * }
 * ```
 */
export function useSaveProject(
  options?: UseMutationOptions<SaveResult, Error, Roadmap, unknown>
): UseMutationResult<SaveResult, Error, Roadmap, unknown> {
  const queryClient = useQueryClient()

  return useMutation({
    ...options,
    mutationFn: (roadmap: Roadmap) => window.api.project.save(roadmap),
    onSuccess: async (result, roadmap, context, meta) => {
      // Roadmap structure might have changed, invalidate dependent queries
      queryClient.invalidateQueries({ queryKey: queryKeys.project.stats() })
      queryClient.invalidateQueries({ queryKey: queryKeys.project.validation() })
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.root })
      queryClient.invalidateQueries({ queryKey: queryKeys.deps.root })

      // Show success toast
      toast.success('Project saved', `Saved to ${result.path}`)

      // Note: We don't invalidate the roadmap cache itself - we just saved it,
      // so it's the freshest data available (optimistic approach)

      // Call user's onSuccess if provided
      await options?.onSuccess?.(result, roadmap, context, meta)
    },
    onError: async (error, roadmap, context, meta) => {
      // Show error toast
      toast.error('Failed to save project', error.message)

      // Call user's onError if provided
      await options?.onError?.(error, roadmap, context, meta)
    }
  })
}
