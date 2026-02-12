import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type {
  Roadmap,
  Task,
  TASK_TYPE,
  PRIORITY,
  STATUS
} from 'project-roadmap-tracking/dist/util/types'

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

interface TaskCreateData {
  title: string
  details: string
  type: TASK_TYPE
  priority?: PRIORITY
  status?: STATUS
  'depends-on'?: Array<string>
  blocks?: Array<string>
  tags?: Array<string>
  notes?: string
  assignedTo?: string | null
  dueDate?: string | null
  effort?: number | null
}

// Custom APIs for renderer
const api = {
  project: {
    open: (projectPath: string): Promise<Roadmap> =>
      ipcRenderer.invoke('prt:project:open', projectPath),
    openDialog: (): Promise<OpenDialogResult> => ipcRenderer.invoke('prt:project:open-dialog'),
    init: (options: InitOptions): Promise<Roadmap> =>
      ipcRenderer.invoke('prt:project:init', options),
    save: (roadmap: Roadmap): Promise<SaveResult> => ipcRenderer.invoke('prt:project:save', roadmap)
  },
  task: {
    list: (): Promise<Task[]> => ipcRenderer.invoke('prt:task:list'),
    get: (taskId: string): Promise<Task> => ipcRenderer.invoke('prt:task:get', taskId),
    add: (taskData: TaskCreateData): Promise<Task> => ipcRenderer.invoke('prt:task:add', taskData),
    update: (taskId: string, updates: Partial<Task>): Promise<Task> =>
      ipcRenderer.invoke('prt:task:update', taskId, updates),
    complete: (taskId: string): Promise<Task> => ipcRenderer.invoke('prt:task:complete', taskId),
    passTest: (taskId: string): Promise<Task> => ipcRenderer.invoke('prt:task:pass-test', taskId),
    delete: (taskId: string): Promise<{ success: boolean; deletedTaskId: string }> =>
      ipcRenderer.invoke('prt:task:delete', taskId)
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
