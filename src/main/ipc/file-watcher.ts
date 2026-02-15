import { BrowserWindow } from 'electron'
import { watch, type FSWatcher } from 'chokidar'
import { readRoadmapFile } from 'project-roadmap-tracking/dist/util/read-roadmap.js'
import type { FileChangeEvent } from '../../preload/index.d'

const IPC_CHANNEL = 'prt:file:changed'
const DEBOUNCE_MS = 500
const SUPPRESS_TIMEOUT_MS = 2000

let watcher: FSWatcher | null = null
let debounceTimer: ReturnType<typeof setTimeout> | null = null
let suppressed = false
let suppressTimer: ReturnType<typeof setTimeout> | null = null

/**
 * Call before writing prt.json from the app to prevent the watcher
 * from treating it as an external change.
 */
export function suppressNextChange(): void {
  suppressed = true
  if (suppressTimer) clearTimeout(suppressTimer)
  suppressTimer = setTimeout(() => {
    suppressed = false
    suppressTimer = null
  }, SUPPRESS_TIMEOUT_MS)
}

/**
 * Starts watching the given prt.json file for changes.
 * Sends `prt:file:changed` events to all renderer windows on external changes.
 * Automatically stops any existing watcher before starting a new one.
 */
export async function startWatching(prtJsonPath: string): Promise<void> {
  await stopWatching()

  watcher = watch(prtJsonPath, {
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 200,
      pollInterval: 50
    }
  })

  watcher.on('change', () => {
    if (debounceTimer) clearTimeout(debounceTimer)

    debounceTimer = setTimeout(async () => {
      debounceTimer = null

      if (suppressed) {
        suppressed = false
        if (suppressTimer) {
          clearTimeout(suppressTimer)
          suppressTimer = null
        }
        return
      }

      try {
        const roadmap = await readRoadmapFile(prtJsonPath)

        const event: FileChangeEvent = {
          type: 'modified',
          path: prtJsonPath,
          timestamp: Date.now()
        }

        const windows = BrowserWindow.getAllWindows()
        for (const win of windows) {
          if (!win.isDestroyed()) {
            win.webContents.send(IPC_CHANNEL, event, roadmap)
          }
        }
      } catch (error) {
        console.error('[file-watcher] Failed to read updated roadmap:', error)
      }
    }, DEBOUNCE_MS)
  })

  watcher.on('unlink', () => {
    if (debounceTimer) clearTimeout(debounceTimer)

    debounceTimer = setTimeout(() => {
      debounceTimer = null

      if (suppressed) {
        suppressed = false
        if (suppressTimer) {
          clearTimeout(suppressTimer)
          suppressTimer = null
        }
        return
      }

      const event: FileChangeEvent = {
        type: 'deleted',
        path: prtJsonPath,
        timestamp: Date.now()
      }

      const windows = BrowserWindow.getAllWindows()
      for (const win of windows) {
        if (!win.isDestroyed()) {
          win.webContents.send(IPC_CHANNEL, event, null)
        }
      }
    }, DEBOUNCE_MS)
  })
}

/**
 * Stops watching and cleans up all timers.
 * Safe to call even if no watcher is active.
 */
export async function stopWatching(): Promise<void> {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }
  if (suppressTimer) {
    clearTimeout(suppressTimer)
    suppressTimer = null
  }
  suppressed = false

  if (watcher) {
    await watcher.close()
    watcher = null
  }
}
