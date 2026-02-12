/**
 * Dependency query hooks for TanStack Query.
 *
 * Provides React hooks for dependency management operations with automatic cache management:
 *
 * **Read hooks (useQuery):**
 * - useTaskDeps - Fetch dependencies for a specific task
 * - useDependencyGraph - Fetch complete dependency graph
 *
 * **Mutation hooks (useMutation):**
 * - useAddDependency - Add bidirectional dependency relationship
 * - useRemoveDependency - Remove bidirectional dependency relationship
 *
 * All mutation hooks automatically invalidate related queries to keep the UI
 * synchronized with backend state changes. Dependency mutations affect both
 * dependency queries and task queries (since tasks contain dependency arrays).
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  UseQueryOptions,
  UseMutationOptions,
  UseQueryResult,
  UseMutationResult
} from '@tanstack/react-query'
import type {
  DependencyInfo,
  SerializableDependencyGraph,
  DepUpdate,
  DepUpdateResult
  // @ts-ignore - This type is defined in preload/index.d.ts and should be available globally
} from '../../../preload/index'
import { queryKeys } from '@renderer/lib/query-keys'

// ============================================================================
// Read Hooks (useQuery)
// ============================================================================

/**
 * Fetches dependencies for a specific task.
 *
 * Returns both tasks that this task depends on and tasks that depend on this task.
 *
 * @param taskId - The task ID to get dependencies for (e.g., "F-012", "B-003")
 * @param queryOptions - Optional TanStack Query options for customization
 * @returns Query result with dependency information
 *
 * @example
 * ```tsx
 * function TaskDependencies({ taskId }: { taskId: string }) {
 *   const { data: deps, isLoading, error } = useTaskDeps(taskId)
 *
 *   if (isLoading) return <div>Loading dependencies...</div>
 *   if (error) return <div>Error: {error.message}</div>
 *
 *   return (
 *     <div>
 *       <h3>Depends On:</h3>
 *       <ul>
 *         {deps?.dependsOn.map(task => (
 *           <li key={task.id}>{task.title}</li>
 *         ))}
 *       </ul>
 *       <h3>Blocks:</h3>
 *       <ul>
 *         {deps?.blocks.map(task => (
 *           <li key={task.id}>{task.title}</li>
 *         ))}
 *       </ul>
 *     </div>
 *   )
 * }
 * ```
 */
export function useTaskDeps(
  taskId: string,
  queryOptions?: UseQueryOptions<DependencyInfo, Error>
): UseQueryResult<DependencyInfo, Error> {
  return useQuery({
    queryKey: queryKeys.deps.detail(taskId),
    queryFn: () => window.api.deps.get(taskId),
    ...queryOptions
  })
}

/**
 * Fetches the complete dependency graph for the currently open project.
 *
 * Returns a graph structure mapping task IDs to their dependencies.
 *
 * @param queryOptions - Optional TanStack Query options for customization
 * @returns Query result with dependency graph
 *
 * @example
 * ```tsx
 * function DependencyGraph() {
 *   const { data: graph, isLoading, error } = useDependencyGraph()
 *
 *   if (isLoading) return <div>Loading graph...</div>
 *   if (error) return <div>Error: {error.message}</div>
 *
 *   return (
 *     <div>
 *       <h3>Dependency Graph</h3>
 *       {Object.entries(graph?.dependsOn || {}).map(([taskId, deps]) => (
 *         <div key={taskId}>
 *           <strong>{taskId}</strong> depends on: {deps.join(', ')}
 *         </div>
 *       ))}
 *     </div>
 *   )
 * }
 * ```
 */
export function useDependencyGraph(
  queryOptions?: UseQueryOptions<SerializableDependencyGraph, Error>
): UseQueryResult<SerializableDependencyGraph, Error> {
  return useQuery({
    queryKey: queryKeys.deps.graph(),
    queryFn: () => window.api.deps.graph(),
    ...queryOptions
  })
}

// ============================================================================
// Mutation Hooks (useMutation)
// ============================================================================

/**
 * Adds a bidirectional dependency relationship between two tasks.
 *
 * **Bidirectional Management:**
 * - If type is 'depends-on': fromTask depends on toTask, and toTask blocks fromTask
 * - If type is 'blocks': fromTask blocks toTask, and toTask depends on fromTask
 * - Both tasks are automatically updated in the backend
 *
 * **Circular Dependency Validation:**
 * - Backend validates before persisting
 * - If adding would create a circular dependency, mutation fails with error
 *
 * **Side effects:**
 * - Invalidates all dependency queries (graph, task-specific dependencies)
 * - Invalidates affected task queries (task objects contain dependency arrays)
 * - Invalidates task lists (may display dependency information)
 *
 * **Note:** Operation is idempotent - adding the same dependency twice has no effect.
 *
 * @param options - Optional TanStack Query mutation options
 * @returns Mutation result with mutate function
 *
 * @example
 * ```tsx
 * function AddDependencyButton({ fromTaskId, toTaskId }: { fromTaskId: string; toTaskId: string }) {
 *   const addDependency = useAddDependency({
 *     onSuccess: (result) => {
 *       console.log('Dependency added, updated tasks:', result.updatedTasks.length)
 *     },
 *     onError: (error) => {
 *       // May fail if circular dependency would be created
 *       console.error('Failed to add dependency:', error.message)
 *     }
 *   })
 *
 *   const handleAddDependency = () => {
 *     addDependency.mutate({
 *       fromTaskId,
 *       toTaskId,
 *       type: 'depends-on'
 *     })
 *   }
 *
 *   return (
 *     <button
 *       onClick={handleAddDependency}
 *       disabled={addDependency.isPending}
 *     >
 *       {addDependency.isPending ? 'Adding...' : 'Add Dependency'}
 *     </button>
 *   )
 * }
 * ```
 */
export function useAddDependency(
  options?: UseMutationOptions<DepUpdateResult, Error, DepUpdate, unknown>
): UseMutationResult<DepUpdateResult, Error, DepUpdate, unknown> {
  const queryClient = useQueryClient()

  return useMutation({
    ...options,
    mutationFn: (params: DepUpdate) => window.api.deps.add(params),
    onSuccess: async (result, variables, context, meta) => {
      // Invalidate all dependency queries - graph structure has changed
      queryClient.invalidateQueries({ queryKey: queryKeys.deps.root })

      // Invalidate task lists - they may display dependency information
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.lists() })

      // Invalidate both affected tasks - they contain dependency arrays
      for (const task of result.updatedTasks) {
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(task.id) })
      }

      // Call user's onSuccess if provided
      await options?.onSuccess?.(result, variables, context, meta)
    }
  })
}

/**
 * Removes a bidirectional dependency relationship between two tasks.
 *
 * **Bidirectional Management:**
 * - Removes the dependency from both tasks automatically
 * - If type is 'depends-on': removes fromTask's dependency on toTask AND toTask's blocking of fromTask
 * - If type is 'blocks': removes fromTask's blocking of toTask AND toTask's dependency on fromTask
 *
 * **Side effects:**
 * - Invalidates all dependency queries (graph, task-specific dependencies)
 * - Invalidates affected task queries (task objects contain dependency arrays)
 * - Invalidates task lists (may display dependency information)
 *
 * **Note:** Operation is idempotent - removing a non-existent dependency has no effect.
 *
 * @param options - Optional TanStack Query mutation options
 * @returns Mutation result with mutate function
 *
 * @example
 * ```tsx
 * function RemoveDependencyButton({ fromTaskId, toTaskId }: { fromTaskId: string; toTaskId: string }) {
 *   const removeDependency = useRemoveDependency({
 *     onSuccess: (result) => {
 *       console.log('Dependency removed, updated tasks:', result.updatedTasks.length)
 *     }
 *   })
 *
 *   const handleRemoveDependency = () => {
 *     if (confirm('Remove this dependency?')) {
 *       removeDependency.mutate({
 *         fromTaskId,
 *         toTaskId,
 *         type: 'depends-on'
 *       })
 *     }
 *   }
 *
 *   return (
 *     <button
 *       onClick={handleRemoveDependency}
 *       disabled={removeDependency.isPending}
 *     >
 *       {removeDependency.isPending ? 'Removing...' : 'Remove Dependency'}
 *     </button>
 *   )
 * }
 * ```
 */
export function useRemoveDependency(
  options?: UseMutationOptions<DepUpdateResult, Error, DepUpdate, unknown>
): UseMutationResult<DepUpdateResult, Error, DepUpdate, unknown> {
  const queryClient = useQueryClient()

  return useMutation({
    ...options,
    mutationFn: (params: DepUpdate) => window.api.deps.remove(params),
    onSuccess: async (result, variables, context, meta) => {
      // Invalidate all dependency queries - graph structure has changed
      queryClient.invalidateQueries({ queryKey: queryKeys.deps.root })

      // Invalidate task lists - they may display dependency information
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.lists() })

      // Invalidate both affected tasks - they contain dependency arrays
      for (const task of result.updatedTasks) {
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(task.id) })
      }

      // Call user's onSuccess if provided
      await options?.onSuccess?.(result, variables, context, meta)
    }
  })
}
