/**
 * Type-safe query key factory for TanStack Query.
 *
 * Hierarchical structure enables granular cache invalidation:
 * - Root keys: Invalidate entire domains (e.g., all project queries)
 * - Scope keys: Invalidate query types (e.g., all task lists)
 * - Detail keys: Invalidate specific queries (e.g., task F-001)
 *
 * Usage:
 * ```ts
 * // In queries
 * useQuery({ queryKey: queryKeys.tasks.list({ status: 'InProgress' }), ... })
 * useQuery({ queryKey: queryKeys.tasks.detail('F-001'), ... })
 *
 * // For invalidation
 * queryClient.invalidateQueries({ queryKey: queryKeys.tasks.root }) // All task queries
 * queryClient.invalidateQueries({ queryKey: queryKeys.tasks.lists() }) // All task lists
 * queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail('F-001') }) // One task
 * ```
 */

import type { ListOptions } from '../../../preload/index'

/**
 * Query key factory following TanStack Query best practices.
 *
 * Structure:
 * - Each domain has a 'root' key for top-level invalidation
 * - Functions return keys with parameters for scoped invalidation
 * - Uses 'as const' for type safety and precise tuple types
 */
export const queryKeys = {
  /**
   * Project-level queries
   * - Roadmap loading, saving, validation
   * - Project statistics
   */
  project: {
    /** Root key for invalidating all project queries */
    root: ['project'] as const,

    /** All project statistics queries */
    stats: () => [...queryKeys.project.root, 'stats'] as const,

    /** All project validation queries */
    validation: () => [...queryKeys.project.root, 'validation'] as const,

    /** Project metadata query */
    metadata: () => [...queryKeys.project.root, 'metadata'] as const,

    /** Specific roadmap data by path */
    roadmap: (path?: string) => [...queryKeys.project.root, 'roadmap', path] as const
  },

  /**
   * Task queries
   * - Task lists with filtering/sorting
   * - Individual task details
   */
  tasks: {
    /** Root key for invalidating all task queries */
    root: ['tasks'] as const,

    /** All task list queries (regardless of filters) */
    lists: () => [...queryKeys.tasks.root, 'list'] as const,

    /**
     * Specific task list with filters
     * @param options - Filtering/sorting options (see ListOptions type)
     *
     * Note: ListOptions include status, type, priority, tags, assignedTo,
     * sortBy, sortOrder, limit, offset. Pass undefined for unfiltered list.
     */
    list: (options?: ListOptions) => [...queryKeys.tasks.lists(), options] as const,

    /** All task detail queries */
    details: () => [...queryKeys.tasks.root, 'detail'] as const,

    /** Specific task by ID */
    detail: (id: string) => [...queryKeys.tasks.details(), id] as const
  },

  /**
   * Dependency queries
   * - Dependency graph
   * - Task-specific dependencies
   * - Validation and circular dependency checks
   */
  deps: {
    /** Root key for invalidating all dependency queries */
    root: ['deps'] as const,

    /** All dependency detail queries */
    details: () => [...queryKeys.deps.root, 'detail'] as const,

    /** Dependencies for a specific task */
    detail: (id: string) => [...queryKeys.deps.details(), id] as const,

    /** Complete dependency graph */
    graph: () => [...queryKeys.deps.root, 'graph'] as const,

    /** Dependency validation results */
    validation: () => [...queryKeys.deps.root, 'validation'] as const,

    /** Circular dependency detection results */
    circular: () => [...queryKeys.deps.root, 'circular'] as const,

    /** Topologically sorted tasks */
    sorted: () => [...queryKeys.deps.root, 'sorted'] as const
  }
} as const

/**
 * Type utilities for extracting query key types
 */
export type ProjectKeys = typeof queryKeys.project
export type TaskKeys = typeof queryKeys.tasks
export type DepsKeys = typeof queryKeys.deps

/**
 * Examples of derived types for hooks:
 *
 * type TaskListKey = ReturnType<typeof queryKeys.tasks.list>
 * // Result: readonly ["tasks", "list", ListOptions | undefined]
 *
 * type TaskDetailKey = ReturnType<typeof queryKeys.tasks.detail>
 * // Result: readonly ["tasks", "detail", string]
 */
