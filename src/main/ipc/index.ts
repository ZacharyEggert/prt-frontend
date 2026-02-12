import { registerProjectHandlers } from './project.ipc'
import { registerTaskHandlers } from './task.ipc'
import { registerDepsHandlers } from './deps.ipc'

/**
 * Registers all IPC handlers for the application
 * Should be called after app.whenReady() to ensure proper initialization
 */
export function registerAllIpcHandlers(): void {
  registerProjectHandlers()
  registerTaskHandlers()
  registerDepsHandlers()
}
