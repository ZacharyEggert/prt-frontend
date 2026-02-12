import { ipcMain } from 'electron'
import { wrapHandler } from './utils'
import { currentProjectPath } from './project.ipc'
import { TaskDependencyService } from 'project-roadmap-tracking/dist/services/task-dependency.service.js'
import { TaskService } from 'project-roadmap-tracking/dist/services/task.service.js'
import { readRoadmapFile } from 'project-roadmap-tracking/dist/util/read-roadmap.js'
import { writeRoadmapFile } from 'project-roadmap-tracking/dist/util/write-roadmap.js'
import type { Task, Roadmap } from 'project-roadmap-tracking/dist/util/types.js'

/**
 * Registers all dependency-related IPC handlers
 */
export function registerDepsHandlers(): void {
  /**
   * Handler: prt:deps:graph
   * Builds and returns the complete dependency graph
   * Note: Maps are converted to plain objects for IPC serialization
   */
  ipcMain.handle(
    'prt:deps:graph',
    wrapHandler(async () => {
      if (!currentProjectPath) {
        throw new Error('No project is currently open. Please open a project first.')
      }

      const roadmap = await readRoadmapFile(currentProjectPath)
      const taskDependencyService = new TaskDependencyService()

      const graph = taskDependencyService.buildGraph(roadmap.tasks)

      // Convert Maps to plain objects for IPC serialization
      return {
        blocks: Object.fromEntries(graph.blocks),
        dependsOn: Object.fromEntries(graph.dependsOn)
      }
    })
  )

  /**
   * Handler: prt:deps:get
   * Gets all dependencies for a specific task (both depends-on and blocks)
   */
  ipcMain.handle(
    'prt:deps:get',
    wrapHandler(async (...args: unknown[]) => {
      const taskId = args[1] as string

      if (!currentProjectPath) {
        throw new Error('No project is currently open. Please open a project first.')
      }

      const roadmap = await readRoadmapFile(currentProjectPath)
      const taskService = new TaskService()
      const taskDependencyService = new TaskDependencyService()

      const task = taskService.findTask(roadmap, taskId)
      if (!task) {
        throw new Error(`Task with ID '${taskId}' not found.`)
      }

      const dependsOn = taskDependencyService.getDependsOnTasks(task, roadmap.tasks)
      const blocks = taskDependencyService.getBlockedTasks(task, roadmap.tasks)

      return {
        dependsOn,
        blocks
      }
    })
  )

  /**
   * Handler: prt:deps:add
   * Adds a dependency relationship between two tasks
   * Maintains bidirectional consistency (depends-on ↔ blocks)
   */
  ipcMain.handle(
    'prt:deps:add',
    wrapHandler(async (...args: unknown[]) => {
      const params = args[1] as {
        fromTaskId: string
        toTaskId: string
        type: 'depends-on' | 'blocks'
      }

      const { fromTaskId, toTaskId, type } = params

      if (!currentProjectPath) {
        throw new Error('No project is currently open. Please open a project first.')
      }

      // Validate type parameter
      if (type !== 'depends-on' && type !== 'blocks') {
        throw new Error("Invalid dependency type. Must be 'depends-on' or 'blocks'.")
      }

      const roadmap = await readRoadmapFile(currentProjectPath)
      const taskService = new TaskService()
      const taskDependencyService = new TaskDependencyService()

      // Verify both tasks exist
      const fromTask = taskService.findTask(roadmap, fromTaskId)
      const toTask = taskService.findTask(roadmap, toTaskId)

      if (!fromTask) {
        throw new Error(`Task with ID '${fromTaskId}' not found.`)
      }
      if (!toTask) {
        throw new Error(`Task with ID '${toTaskId}' not found.`)
      }

      // Update tasks with bidirectional dependency
      const updatedTasks = roadmap.tasks.map((task) => {
        if (task.id === fromTaskId) {
          // Add to the specified field
          const field = type === 'depends-on' ? 'depends-on' : 'blocks'
          const currentDeps = task[field] || []
          // Use Set to avoid duplicates (idempotent operation)
          return {
            ...task,
            [field]: [...new Set([...currentDeps, toTaskId])]
          }
        }
        if (task.id === toTaskId) {
          // Add to the reverse field
          const reverseField = type === 'depends-on' ? 'blocks' : 'depends-on'
          const currentDeps = task[reverseField] || []
          return {
            ...task,
            [reverseField]: [...new Set([...currentDeps, fromTaskId])]
          }
        }
        return task
      })

      const tempRoadmap: Roadmap = { ...roadmap, tasks: updatedTasks }

      // Validate no circular dependencies were created
      const circular = taskDependencyService.detectCircular(tempRoadmap.tasks)
      if (circular) {
        throw new Error(
          `Cannot add dependency: would create circular dependency. ${circular.message}`
        )
      }

      // Write updated roadmap
      await writeRoadmapFile(currentProjectPath, tempRoadmap)

      // Return updated tasks
      const updatedFromTask = taskService.findTask(tempRoadmap, fromTaskId)
      const updatedToTask = taskService.findTask(tempRoadmap, toTaskId)

      return {
        success: true,
        updatedTasks: [updatedFromTask, updatedToTask].filter((t): t is Task => t !== null)
      }
    })
  )

  /**
   * Handler: prt:deps:remove
   * Removes a dependency relationship between two tasks
   * Maintains bidirectional consistency (depends-on ↔ blocks)
   */
  ipcMain.handle(
    'prt:deps:remove',
    wrapHandler(async (...args: unknown[]) => {
      const params = args[1] as {
        fromTaskId: string
        toTaskId: string
        type: 'depends-on' | 'blocks'
      }

      const { fromTaskId, toTaskId, type } = params

      if (!currentProjectPath) {
        throw new Error('No project is currently open. Please open a project first.')
      }

      // Validate type parameter
      if (type !== 'depends-on' && type !== 'blocks') {
        throw new Error("Invalid dependency type. Must be 'depends-on' or 'blocks'.")
      }

      const roadmap = await readRoadmapFile(currentProjectPath)
      const taskService = new TaskService()

      // Verify both tasks exist
      const fromTask = taskService.findTask(roadmap, fromTaskId)
      const toTask = taskService.findTask(roadmap, toTaskId)

      if (!fromTask) {
        throw new Error(`Task with ID '${fromTaskId}' not found.`)
      }
      if (!toTask) {
        throw new Error(`Task with ID '${toTaskId}' not found.`)
      }

      // Update tasks by removing bidirectional dependency
      const updatedTasks = roadmap.tasks.map((task) => {
        if (task.id === fromTaskId) {
          // Remove from the specified field
          const field = type === 'depends-on' ? 'depends-on' : 'blocks'
          return {
            ...task,
            [field]: task[field].filter((id) => id !== toTaskId)
          }
        }
        if (task.id === toTaskId) {
          // Remove from the reverse field
          const reverseField = type === 'depends-on' ? 'blocks' : 'depends-on'
          return {
            ...task,
            [reverseField]: task[reverseField].filter((id) => id !== fromTaskId)
          }
        }
        return task
      })

      const updatedRoadmap: Roadmap = { ...roadmap, tasks: updatedTasks }

      // Write updated roadmap
      await writeRoadmapFile(currentProjectPath, updatedRoadmap)

      // Return updated tasks
      const updatedFromTask = taskService.findTask(updatedRoadmap, fromTaskId)
      const updatedToTask = taskService.findTask(updatedRoadmap, toTaskId)

      return {
        success: true,
        updatedTasks: [updatedFromTask, updatedToTask].filter((t): t is Task => t !== null)
      }
    })
  )

  /**
   * Handler: prt:deps:validate
   * Validates all dependencies in the project
   * Returns array of validation errors (empty if valid)
   */
  ipcMain.handle(
    'prt:deps:validate',
    wrapHandler(async () => {
      if (!currentProjectPath) {
        throw new Error('No project is currently open. Please open a project first.')
      }

      const roadmap = await readRoadmapFile(currentProjectPath)
      const taskDependencyService = new TaskDependencyService()

      const validationErrors = taskDependencyService.validateDependencies(roadmap)

      return validationErrors
    })
  )

  /**
   * Handler: prt:deps:detect-circular
   * Checks for circular dependencies in the project
   * Returns CircularDependency object if found, null otherwise
   */
  ipcMain.handle(
    'prt:deps:detect-circular',
    wrapHandler(async () => {
      if (!currentProjectPath) {
        throw new Error('No project is currently open. Please open a project first.')
      }

      const roadmap = await readRoadmapFile(currentProjectPath)
      const taskDependencyService = new TaskDependencyService()

      const circular = taskDependencyService.detectCircular(roadmap.tasks)

      return circular
    })
  )

  /**
   * Handler: prt:deps:sort
   * Returns tasks in topological order (dependencies first)
   * Throws error if circular dependency exists
   */
  ipcMain.handle(
    'prt:deps:sort',
    wrapHandler(async () => {
      if (!currentProjectPath) {
        throw new Error('No project is currently open. Please open a project first.')
      }

      const roadmap = await readRoadmapFile(currentProjectPath)
      const taskDependencyService = new TaskDependencyService()

      // This will throw if circular dependency exists
      const sortedTasks = taskDependencyService.topologicalSort(roadmap.tasks)

      return sortedTasks
    })
  )
}
