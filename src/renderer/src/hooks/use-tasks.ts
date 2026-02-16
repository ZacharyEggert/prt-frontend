/**
 * Task query hooks for TanStack Query.
 *
 * Provides React hooks for task-level operations with automatic cache management:
 *
 * **Read hooks (useQuery):**
 * - useTasks - Fetch task list with optional filters
 * - useTask - Fetch single task by ID
 *
 * **Mutation hooks (useMutation):**
 * - useAddTask - Create new task with auto-generated ID
 * - useUpdateTask - Update task properties
 * - useCompleteTask - Mark task as completed
 * - usePassTest - Mark task tests as passing
 * - useDeleteTask - Delete task and clean up references
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
import type { Task } from 'project-roadmap-tracking/dist/util/types'
import type {
  CreateTaskData,
  TaskDeleteResult,
  ListOptions
  // @ts-ignore - This type is defined in preload/index.d.ts and should be available globally
} from '../../../preload/index'
import { queryKeys } from '@renderer/lib/query-keys'
import { toast } from '@renderer/lib/toast'
import { getErrorCopy } from '@renderer/lib/error-copy'

// ============================================================================
// Read Hooks (useQuery)
// ============================================================================

/**
 * Fetches the list of tasks for the currently open project.
 *
 * @param options - Optional filters for status, type, priority, tags, etc. (not yet implemented in backend)
 * @param queryOptions - Optional TanStack Query options for customization
 * @returns Query result with task list
 *
 * @example
 * ```tsx
 * function TaskList() {
 *   const { data: tasks, isLoading, error } = useTasks()
 *
 *   if (isLoading) return <div>Loading tasks...</div>
 *   if (error) return <div>Error: {error.message}</div>
 *
 *   return (
 *     <ul>
 *       {tasks?.map(task => (
 *         <li key={task.id}>{task.title}</li>
 *       ))}
 *     </ul>
 *   )
 * }
 * ```
 *
 * @example
 * ```tsx
 * // With filters (once backend implements ListOptions)
 * function InProgressTasks() {
 *   const { data: tasks } = useTasks({ status: 'in-progress' })
 *   return <TaskList tasks={tasks} />
 * }
 * ```
 */
export function useTasks(
  options?: ListOptions,
  queryOptions?: UseQueryOptions<Task[], Error>
): UseQueryResult<Task[], Error> {
  return useQuery({
    queryKey: queryKeys.tasks.list(options),
    queryFn: () => window.api.task.list(options),
    ...queryOptions
  })
}

/**
 * Fetches a single task by ID from the currently open project.
 *
 * @param taskId - The task ID to fetch (e.g., "F-011", "B-003")
 * @param queryOptions - Optional TanStack Query options for customization
 * @returns Query result with task details
 *
 * @example
 * ```tsx
 * function TaskDetail({ taskId }: { taskId: string }) {
 *   const { data: task, isLoading, error } = useTask(taskId)
 *
 *   if (isLoading) return <div>Loading task...</div>
 *   if (error) return <div>Error: {error.message}</div>
 *
 *   return (
 *     <div>
 *       <h2>{task.title}</h2>
 *       <p>{task.details}</p>
 *       <span>Status: {task.status}</span>
 *     </div>
 *   )
 * }
 * ```
 */
export function useTask(
  taskId: string,
  queryOptions?: UseQueryOptions<Task, Error>
): UseQueryResult<Task, Error> {
  return useQuery({
    queryKey: queryKeys.tasks.detail(taskId),
    queryFn: () => window.api.task.get(taskId),
    ...queryOptions
  })
}

// ============================================================================
// Mutation Hooks (useMutation)
// ============================================================================

/**
 * Creates a new task with auto-generated ID based on task type.
 *
 * **Side effects:**
 * - Invalidates all task queries (new task in list)
 * - Invalidates project stats (task count changed)
 * - Sets new task in cache for immediate detail view access
 *
 * @param options - Optional TanStack Query mutation options
 * @returns Mutation result with mutate function
 *
 * @example
 * ```tsx
 * function CreateTaskForm() {
 *   const addTask = useAddTask({
 *     onSuccess: (task) => {
 *       console.log('Created task:', task.id)
 *     },
 *     onError: (error) => {
 *       console.error('Failed to create task:', error.message)
 *     }
 *   })
 *
 *   const handleSubmit = (e: React.FormEvent) => {
 *     e.preventDefault()
 *     addTask.mutate({
 *       title: 'New Feature',
 *       details: 'Detailed description',
 *       type: 'feature',
 *       priority: 'high'
 *     })
 *   }
 *
 *   return (
 *     <form onSubmit={handleSubmit}>
 *       <button type="submit" disabled={addTask.isPending}>
 *         {addTask.isPending ? 'Creating...' : 'Create Task'}
 *       </button>
 *     </form>
 *   )
 * }
 * ```
 */
export function useAddTask(
  options?: UseMutationOptions<Task, Error, CreateTaskData, unknown>
): UseMutationResult<Task, Error, CreateTaskData, unknown> {
  const queryClient = useQueryClient()

  return useMutation({
    ...options,
    mutationFn: (taskData: CreateTaskData) => window.api.task.add(taskData),
    onSuccess: async (task, variables, context, meta) => {
      // Invalidate all task queries - new task should appear in lists
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.root })

      // Invalidate project stats - task count has changed
      queryClient.invalidateQueries({ queryKey: queryKeys.project.stats() })

      // Optimistically cache the new task for detail views
      queryClient.setQueryData(queryKeys.tasks.detail(task.id), task)

      // Show success toast
      toast.success('Task created', `${task.id}: ${task.title}`)

      // Call user's onSuccess if provided
      await options?.onSuccess?.(task, variables, context, meta)
    },
    onError: async (error, variables, context, meta) => {
      // Show error toast
      const copy = getErrorCopy('taskCreateFailed')
      toast.error(copy.title, copy.description)

      // Call user's onError if provided
      await options?.onError?.(error, variables, context, meta)
    }
  })
}

/**
 * Updates an existing task's properties.
 *
 * **Side effects:**
 * - Invalidates task list queries (task data changed)
 * - Sets updated task in cache for immediate UI update
 * - Invalidates dependency queries if dependencies were modified
 *
 * **Note:** If task type changes, backend will generate a new ID. Always use
 * the returned task's ID, not the original taskId.
 *
 * @param options - Optional TanStack Query mutation options
 * @returns Mutation result with mutate function
 *
 * @example
 * ```tsx
 * function EditTaskForm({ taskId }: { taskId: string }) {
 *   const updateTask = useUpdateTask({
 *     onSuccess: (updatedTask) => {
 *       console.log('Updated task:', updatedTask.id)
 *     }
 *   })
 *
 *   const handleSave = (updates: Partial<Task>) => {
 *     updateTask.mutate({ taskId, updates })
 *   }
 *
 *   return (
 *     <button
 *       onClick={() => handleSave({ priority: 'high' })}
 *       disabled={updateTask.isPending}
 *     >
 *       {updateTask.isPending ? 'Saving...' : 'Set High Priority'}
 *     </button>
 *   )
 * }
 * ```
 */
export function useUpdateTask(
  options?: UseMutationOptions<Task, Error, { taskId: string; updates: Partial<Task> }, unknown>
): UseMutationResult<Task, Error, { taskId: string; updates: Partial<Task> }, unknown> {
  const queryClient = useQueryClient()

  return useMutation({
    ...options,
    mutationFn: ({ taskId, updates }) => window.api.task.update(taskId, updates),
    onSuccess: async (task, variables, context, meta) => {
      // Invalidate list queries - task data has changed
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.lists() })

      // Optimistically update the task detail in cache
      queryClient.setQueryData(queryKeys.tasks.detail(task.id), task)

      // If dependencies were modified, invalidate dependency queries
      if (variables.updates['depends-on'] || variables.updates.blocks) {
        queryClient.invalidateQueries({ queryKey: queryKeys.deps.root })
      }

      // Show success toast
      toast.success('Task updated', task.title)

      // Call user's onSuccess if provided
      await options?.onSuccess?.(task, variables, context, meta)
    },
    onError: async (error, variables, context, meta) => {
      // Show error toast
      const copy = getErrorCopy('taskUpdateFailed')
      toast.error(copy.title, copy.description)

      // Call user's onError if provided
      await options?.onError?.(error, variables, context, meta)
    }
  })
}

/**
 * Marks a task as completed.
 *
 * **Side effects:**
 * - Invalidates all task queries (status changed)
 * - Invalidates project stats (completion count changed)
 * - Sets updated task in cache for immediate UI update
 *
 * @param options - Optional TanStack Query mutation options
 * @returns Mutation result with mutate function
 *
 * @example
 * ```tsx
 * function CompleteTaskButton({ taskId }: { taskId: string }) {
 *   const completeTask = useCompleteTask({
 *     onSuccess: (task) => {
 *       console.log('Task completed:', task.id)
 *     }
 *   })
 *
 *   return (
 *     <button
 *       onClick={() => completeTask.mutate(taskId)}
 *       disabled={completeTask.isPending}
 *     >
 *       {completeTask.isPending ? 'Completing...' : 'Mark Complete'}
 *     </button>
 *   )
 * }
 * ```
 */
export function useCompleteTask(
  options?: UseMutationOptions<Task, Error, string, unknown>
): UseMutationResult<Task, Error, string, unknown> {
  const queryClient = useQueryClient()

  return useMutation({
    ...options,
    mutationFn: (taskId: string) => window.api.task.complete(taskId),
    onSuccess: async (task, taskId, context, meta) => {
      // Invalidate all task queries - status has changed
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.root })

      // Invalidate project stats - completion count changed
      queryClient.invalidateQueries({ queryKey: queryKeys.project.stats() })

      // Optimistically update the task in cache
      queryClient.setQueryData(queryKeys.tasks.detail(task.id), task)

      // Show success toast
      toast.success('Task completed', task.title)

      // Call user's onSuccess if provided
      await options?.onSuccess?.(task, taskId, context, meta)
    },
    onError: async (error, taskId, context, meta) => {
      // Show error toast
      const copy = getErrorCopy('taskCompleteFailed')
      toast.error(copy.title, copy.description)

      // Call user's onError if provided
      await options?.onError?.(error, taskId, context, meta)
    }
  })
}

/**
 * Marks a task's tests as passing.
 *
 * **Side effects:**
 * - Invalidates task list queries (test status visible in lists)
 * - Invalidates project stats (test pass stats changed)
 * - Sets updated task in cache for immediate UI update
 *
 * @param options - Optional TanStack Query mutation options
 * @returns Mutation result with mutate function
 *
 * @example
 * ```tsx
 * function PassTestButton({ taskId }: { taskId: string }) {
 *   const passTest = usePassTest({
 *     onSuccess: (task) => {
 *       console.log('Tests marked as passing for:', task.id)
 *     }
 *   })
 *
 *   return (
 *     <button
 *       onClick={() => passTest.mutate(taskId)}
 *       disabled={passTest.isPending}
 *     >
 *       {passTest.isPending ? 'Updating...' : 'Mark Tests Passing'}
 *     </button>
 *   )
 * }
 * ```
 */
export function usePassTest(
  options?: UseMutationOptions<Task, Error, string, unknown>
): UseMutationResult<Task, Error, string, unknown> {
  const queryClient = useQueryClient()

  return useMutation({
    ...options,
    mutationFn: (taskId: string) => window.api.task.passTest(taskId),
    onSuccess: async (task, taskId, context, meta) => {
      // Invalidate list queries - test status is visible in lists
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.lists() })

      // Invalidate project stats - test pass stats have changed
      queryClient.invalidateQueries({ queryKey: queryKeys.project.stats() })

      // Optimistically update the task in cache
      queryClient.setQueryData(queryKeys.tasks.detail(task.id), task)

      // Show success toast
      toast.success('Tests marked as passing', task.title)

      // Call user's onSuccess if provided
      await options?.onSuccess?.(task, taskId, context, meta)
    },
    onError: async (error, taskId, context, meta) => {
      // Show error toast
      const copy = getErrorCopy('taskPassTestFailed')
      toast.error(copy.title, copy.description)

      // Call user's onError if provided
      await options?.onError?.(error, taskId, context, meta)
    }
  })
}

/**
 * Deletes a task and cleans up all dependency references.
 *
 * **Side effects:**
 * - Invalidates all task queries (task removed)
 * - Invalidates project stats (task count changed)
 * - Invalidates dependency queries (references cleaned up)
 * - Removes deleted task from cache
 *
 * @param options - Optional TanStack Query mutation options
 * @returns Mutation result with mutate function
 *
 * @example
 * ```tsx
 * function DeleteTaskButton({ taskId }: { taskId: string }) {
 *   const deleteTask = useDeleteTask({
 *     onSuccess: (result) => {
 *       console.log('Deleted task:', result.deletedTaskId)
 *     },
 *     onError: (error) => {
 *       console.error('Failed to delete:', error.message)
 *     }
 *   })
 *
 *   const handleDelete = () => {
 *     if (confirm('Are you sure you want to delete this task?')) {
 *       deleteTask.mutate(taskId)
 *     }
 *   }
 *
 *   return (
 *     <button
 *       onClick={handleDelete}
 *       disabled={deleteTask.isPending}
 *     >
 *       {deleteTask.isPending ? 'Deleting...' : 'Delete Task'}
 *     </button>
 *   )
 * }
 * ```
 */
export function useDeleteTask(
  options?: UseMutationOptions<TaskDeleteResult, Error, string, unknown>
): UseMutationResult<TaskDeleteResult, Error, string, unknown> {
  const queryClient = useQueryClient()

  return useMutation({
    ...options,
    mutationFn: (taskId: string) => window.api.task.delete(taskId),
    onSuccess: async (result, taskId, context, meta) => {
      // Invalidate all task queries - task has been removed
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.root })

      // Invalidate project stats - task count changed
      queryClient.invalidateQueries({ queryKey: queryKeys.project.stats() })

      // Invalidate dependency queries - references cleaned up
      queryClient.invalidateQueries({ queryKey: queryKeys.deps.root })

      // Remove the deleted task from cache
      queryClient.removeQueries({ queryKey: queryKeys.tasks.detail(taskId) })

      // Show success toast
      toast.success('Task deleted', result.deletedTaskId)

      // Call user's onSuccess if provided
      await options?.onSuccess?.(result, taskId, context, meta)
    },
    onError: async (error, taskId, context, meta) => {
      // Show error toast
      const copy = getErrorCopy('taskDeleteFailed')
      toast.error(copy.title, copy.description)

      // Call user's onError if provided
      await options?.onError?.(error, taskId, context, meta)
    }
  })
}
