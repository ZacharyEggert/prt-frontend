import { ipcMain } from 'electron'
import { wrapHandler } from './utils'
import { currentProjectPath } from './project.ipc'
import { TaskService } from 'project-roadmap-tracking/dist/services/task.service.js'
import { TaskQueryService } from 'project-roadmap-tracking/dist/services/task-query.service.js'
import { SortOrder } from 'project-roadmap-tracking/dist/services/task-query.service.js'
import type {
  FilterCriteria,
  SortField
} from 'project-roadmap-tracking/dist/services/task-query.service.js'
import { readRoadmapFile } from 'project-roadmap-tracking/dist/util/read-roadmap.js'
import { writeRoadmapFile } from 'project-roadmap-tracking/dist/util/write-roadmap.js'
import type {
  Task,
  Roadmap,
  STATUS,
  TASK_TYPE,
  PRIORITY
} from 'project-roadmap-tracking/dist/util/types.js'

/**
 * Maps ListOptions sortBy field to TaskQueryService SortField
 */
function mapToSortField(sortBy: 'created' | 'updated' | 'priority' | 'status' | 'id'): SortField {
  const mapping: Record<string, SortField> = {
    created: 'createdAt',
    updated: 'updatedAt',
    priority: 'priority',
    status: 'status',
    id: 'title'
  }
  return mapping[sortBy] || 'title'
}

/**
 * Registers all task-related IPC handlers
 */
export function registerTaskHandlers(): void {
  /**
   * Handler: prt:task:list
   * Retrieves tasks from the current roadmap with optional filtering, search, sorting, and pagination
   */
  ipcMain.handle(
    'prt:task:list',
    wrapHandler(async (...args: unknown[]) => {
      const options = args[1] as
        | {
            status?: STATUS | STATUS[]
            type?: TASK_TYPE | TASK_TYPE[]
            priority?: PRIORITY | PRIORITY[]
            tags?: string | string[]
            assignedTo?: string
            search?: string
            sortBy?: 'created' | 'updated' | 'priority' | 'status' | 'id'
            sortOrder?: 'asc' | 'desc'
            limit?: number
            offset?: number
          }
        | undefined

      if (!currentProjectPath) {
        throw new Error('No project is currently open. Please open a project first.')
      }

      const roadmap = await readRoadmapFile(currentProjectPath)
      let tasks = roadmap.tasks
      const taskQueryService = new TaskQueryService()

      // Apply filters if any filter criteria is provided
      if (
        options?.status ||
        options?.type ||
        options?.priority ||
        options?.tags ||
        options?.assignedTo
      ) {
        // Handle multiple types with OR logic (since FilterCriteria only supports single type)
        if (options.type && Array.isArray(options.type) && options.type.length > 1) {
          // Filter for each type and combine results
          const typeResults = new Set<Task>()
          for (const type of options.type) {
            const criteria: FilterCriteria = {
              status: options.status,
              type,
              priority: Array.isArray(options.priority) ? options.priority[0] : options.priority,
              tags: typeof options.tags === 'string' ? [options.tags] : options.tags,
              assignedTo: options.assignedTo
            }
            const filtered = taskQueryService.filter(tasks, criteria)
            filtered.forEach((task) => typeResults.add(task))
          }
          tasks = Array.from(typeResults)
        } else {
          // Single filter criteria
          const criteria: FilterCriteria = {}

          if (options.status) criteria.status = options.status
          if (options.type)
            criteria.type = Array.isArray(options.type) ? options.type[0] : options.type
          if (options.priority)
            criteria.priority = Array.isArray(options.priority)
              ? options.priority[0]
              : options.priority
          if (options.tags)
            criteria.tags = typeof options.tags === 'string' ? [options.tags] : options.tags
          if (options.assignedTo) criteria.assignedTo = options.assignedTo

          tasks = taskQueryService.filter(tasks, criteria)
        }
      }

      // Apply search if query provided
      if (options?.search && options.search.trim()) {
        tasks = taskQueryService.search(tasks, options.search)
      }

      // Apply sorting
      if (options?.sortBy) {
        const sortField = mapToSortField(options.sortBy)
        const sortOrder = options.sortOrder === 'desc' ? SortOrder.Descending : SortOrder.Ascending
        tasks = taskQueryService.sort(tasks, sortField, sortOrder)
      }

      // Apply pagination
      if (options?.offset !== undefined || options?.limit !== undefined) {
        const start = options.offset || 0
        const end = options.limit ? start + options.limit : undefined
        tasks = tasks.slice(start, end)
      }

      return tasks
    })
  )

  /**
   * Handler: prt:task:get
   * Gets a specific task by ID
   */
  ipcMain.handle(
    'prt:task:get',
    wrapHandler(async (...args: unknown[]) => {
      const taskId = args[1] as string

      if (!currentProjectPath) {
        throw new Error('No project is currently open. Please open a project first.')
      }

      const roadmap = await readRoadmapFile(currentProjectPath)
      const taskService = new TaskService()
      const task = taskService.findTask(roadmap, taskId)

      if (!task) {
        throw new Error(`Task with ID '${taskId}' not found.`)
      }

      return task
    })
  )

  /**
   * Handler: prt:task:add
   * Adds a new task to the roadmap with auto-generated ID
   */
  ipcMain.handle(
    'prt:task:add',
    wrapHandler(async (...args: unknown[]) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const taskData = args[1] as any

      if (!currentProjectPath) {
        throw new Error('No project is currently open. Please open a project first.')
      }

      const roadmap = await readRoadmapFile(currentProjectPath)
      const taskService = new TaskService()

      // Generate next ID for the task type
      const taskId = taskService.generateNextId(roadmap, taskData.type)

      // Create the task with generated ID
      const newTask = taskService.createTask({
        id: taskId,
        title: taskData.title,
        details: taskData.details,
        type: taskData.type,
        priority: taskData.priority,
        status: taskData.status,
        'depends-on': taskData['depends-on'],
        blocks: taskData.blocks,
        tags: taskData.tags,
        notes: taskData.notes,
        'passes-tests': false
      })

      // Add task to roadmap
      const updatedRoadmap = taskService.addTask(roadmap, newTask)

      // Write back to disk
      await writeRoadmapFile(currentProjectPath, updatedRoadmap)

      return newTask
    })
  )

  /**
   * Handler: prt:task:update
   * Updates an existing task with partial data
   * Handles type changes which require ID reassignment
   */
  ipcMain.handle(
    'prt:task:update',
    wrapHandler(async (...args: unknown[]) => {
      const taskId = args[1] as string
      const updates = args[2] as Partial<Task>

      if (!currentProjectPath) {
        throw new Error('No project is currently open. Please open a project first.')
      }

      const roadmap = await readRoadmapFile(currentProjectPath)
      const taskService = new TaskService()

      // Special handling if type is being changed (requires ID reassignment)
      if (updates.type) {
        const { roadmap: updatedRoadmap, newTaskId } = taskService.updateTaskType(
          roadmap,
          taskId,
          updates.type
        )

        // Apply remaining updates to the new task ID
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { type, ...remainingUpdates } = updates
        const finalRoadmap =
          Object.keys(remainingUpdates).length > 0
            ? taskService.updateTask(updatedRoadmap, newTaskId, remainingUpdates)
            : updatedRoadmap

        await writeRoadmapFile(currentProjectPath, finalRoadmap)

        const updatedTask = taskService.findTask(finalRoadmap, newTaskId)
        return updatedTask
      }

      // Standard update
      const updatedRoadmap = taskService.updateTask(roadmap, taskId, updates)
      await writeRoadmapFile(currentProjectPath, updatedRoadmap)

      const updatedTask = taskService.findTask(updatedRoadmap, taskId)
      return updatedTask
    })
  )

  /**
   * Handler: prt:task:complete
   * Marks a task as completed
   */
  ipcMain.handle(
    'prt:task:complete',
    wrapHandler(async (...args: unknown[]) => {
      const taskId = args[1] as string

      if (!currentProjectPath) {
        throw new Error('No project is currently open. Please open a project first.')
      }

      const roadmap = await readRoadmapFile(currentProjectPath)
      const taskService = new TaskService()

      // Update status to completed
      const updatedRoadmap = taskService.updateTask(roadmap, taskId, {
        status: 'completed' as STATUS
      })

      await writeRoadmapFile(currentProjectPath, updatedRoadmap)

      const updatedTask = taskService.findTask(updatedRoadmap, taskId)
      return updatedTask
    })
  )

  /**
   * Handler: prt:task:pass-test
   * Marks task's passes-tests flag as true
   */
  ipcMain.handle(
    'prt:task:pass-test',
    wrapHandler(async (...args: unknown[]) => {
      const taskId = args[1] as string

      if (!currentProjectPath) {
        throw new Error('No project is currently open. Please open a project first.')
      }

      const roadmap = await readRoadmapFile(currentProjectPath)
      const taskService = new TaskService()

      // Update passes-tests flag
      const updatedRoadmap = taskService.updateTask(roadmap, taskId, {
        'passes-tests': true
      })

      await writeRoadmapFile(currentProjectPath, updatedRoadmap)

      const updatedTask = taskService.findTask(updatedRoadmap, taskId)
      return updatedTask
    })
  )

  /**
   * Handler: prt:task:delete
   * Deletes a task from the roadmap and cleans up references
   */
  ipcMain.handle(
    'prt:task:delete',
    wrapHandler(async (...args: unknown[]) => {
      const taskId = args[1] as string

      if (!currentProjectPath) {
        throw new Error('No project is currently open. Please open a project first.')
      }

      const roadmap = await readRoadmapFile(currentProjectPath)
      const taskService = new TaskService()

      // Verify task exists before deleting
      const task = taskService.findTask(roadmap, taskId)
      if (!task) {
        throw new Error(`Task with ID '${taskId}' not found.`)
      }

      // Filter out the task and clean up references
      const updatedRoadmap: Roadmap = {
        ...roadmap,
        tasks: roadmap.tasks
          .filter((t) => t.id !== taskId)
          .map((t) => ({
            ...t,
            'depends-on': t['depends-on'].filter((id) => id !== taskId),
            blocks: t.blocks.filter((id) => id !== taskId)
          }))
      }

      await writeRoadmapFile(currentProjectPath, updatedRoadmap)

      return {
        success: true,
        deletedTaskId: taskId
      }
    })
  )
}
