import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { Roadmap } from 'project-roadmap-tracking/dist/util/types'

interface InitOptions {
  path: string
  name: string
  description: string
  withSampleTasks?: boolean
}

interface OpenDialogResult {
  canceled: boolean
  roadmap?: Roadmap
}

interface SaveResult {
  success: boolean
  path: string
}

// Custom APIs for renderer
const api = {
  project: {
    open: (projectPath: string): Promise<Roadmap> =>
      ipcRenderer.invoke('prt:project:open', projectPath),
    openDialog: (): Promise<OpenDialogResult> => ipcRenderer.invoke('prt:project:open-dialog'),
    init: (options: InitOptions): Promise<Roadmap> =>
      ipcRenderer.invoke('prt:project:init', options),
    save: (roadmap: Roadmap): Promise<SaveResult> =>
      ipcRenderer.invoke('prt:project:save', roadmap)
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
