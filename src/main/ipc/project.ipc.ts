import { ipcMain, dialog } from 'electron'
import { wrapHandler } from './utils'
import { readRoadmapFile } from 'project-roadmap-tracking/dist/util/read-roadmap.js'
import { RoadmapService } from 'project-roadmap-tracking/dist/services/roadmap.service.js'
import { writeRoadmapFile } from 'project-roadmap-tracking/dist/util/write-roadmap.js'
import { join } from 'path'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { Roadmap } from 'project-roadmap-tracking/dist/util/types'

const execFileAsync = promisify(execFile)

// Module-level state to track currently open project
export let currentProjectPath: string | null = null

/**
 * Registers all project-related IPC handlers
 */
export function registerProjectHandlers(): void {
  /**
   * Handler: prt:project:open
   * Opens a project at the specified file path
   */
  ipcMain.handle(
    'prt:project:open',
    wrapHandler(async (...args: unknown[]) => {
      const projectPath = args[1] as string
      const roadmap = await readRoadmapFile(projectPath)
      currentProjectPath = projectPath
      return roadmap
    })
  )

  /**
   * Handler: prt:project:open-dialog
   * Shows a native file dialog to browse for a project directory
   */
  ipcMain.handle(
    'prt:project:open-dialog',
    wrapHandler(async () => {
      const result = await dialog.showOpenDialog({
        properties: ['openDirectory'],
        title: 'Open PRT Project',
        message: 'Select a directory containing prt.json'
      })

      if (result.canceled) {
        return { canceled: true }
      }

      const selectedDir = result.filePaths[0]
      const prtJsonPath = join(selectedDir, 'prt.json')

      const roadmap = await readRoadmapFile(prtJsonPath)
      currentProjectPath = prtJsonPath

      return { canceled: false, roadmap }
    })
  )

  /**
   * Handler: prt:project:init
   * Initializes a new PRT project using the CLI
   *
   * TODO: Migrate to service-based approach when project-roadmap-tracking
   * package exposes initialization functions
   */
  ipcMain.handle(
    'prt:project:init',
    wrapHandler(async (...args: unknown[]) => {
      const options = args[1] as {
        path: string
        name: string
        description: string
        withSampleTasks?: boolean
      }

      const { path: projectPath, name, description, withSampleTasks } = options

      // Build CLI arguments
      const cliArgs = ['init', '-n', name, '-d', description]

      if (withSampleTasks) {
        cliArgs.push('--withSampleTasks')
      }

      // Execute prt init command
      await execFileAsync('prt', cliArgs, {
        cwd: projectPath
      })

      // Update current project path and load the created roadmap
      const prtJsonPath = join(projectPath, 'prt.json')
      currentProjectPath = prtJsonPath

      const roadmap = await readRoadmapFile(prtJsonPath)
      return roadmap
    })
  )

  /**
   * Handler: prt:project:save
   * Saves the current roadmap to disk
   */
  ipcMain.handle(
    'prt:project:save',
    wrapHandler(async (...args: unknown[]) => {
      const roadmap = args[1] as Roadmap

      if (!currentProjectPath) {
        throw new Error('No project is currently open. Please open a project before saving.')
      }

      await writeRoadmapFile(currentProjectPath, roadmap)

      return {
        success: true,
        path: currentProjectPath
      }
    })
  )

  /**
   * Handler: prt:project:validate
   * Validates the current roadmap and returns any errors
   */
  ipcMain.handle(
    'prt:project:validate',
    wrapHandler(async () => {
      if (!currentProjectPath) {
        throw new Error('No project is currently open. Please open a project before validating.')
      }

      const roadmap = await readRoadmapFile(currentProjectPath)

      if (!roadmap) {
        throw new Error('Failed to load roadmap for validation.')
      }

      const roadmapService = new RoadmapService()

      const validationErrors = roadmapService.validate(roadmap)

      if (validationErrors.length > 0) {
        const formattedErrors = validationErrors.map((err) => `- ${err}`).join('\n')
        return {
          success: false,
          errors: formattedErrors
        }
      }

      return {
        success: true
      }
    })
  )

  /**
   * Handler: prt:project:stats
   * Generates statistics for the current roadmap
   */
  ipcMain.handle(
    'prt:project:stats',
    wrapHandler(async () => {
      if (!currentProjectPath) {
        throw new Error('No project is currently open. Please open a project to view stats.')
      }

      const roadmap = await readRoadmapFile(currentProjectPath)

      if (!roadmap) {
        throw new Error('Failed to load roadmap for stats generation.')
      }

      const roadmapService = new RoadmapService()
      const stats = roadmapService.getStats(roadmap)
      return stats
    })
  )
}
