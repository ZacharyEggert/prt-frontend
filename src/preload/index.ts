import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { Roadmap, Task } from 'project-roadmap-tracking/dist/util/types'
import type {
  DependencyValidationError,
  CircularDependency
} from 'project-roadmap-tracking/dist/services/task-dependency.service'
import type {
  InitOptions,
  OpenDialogResult,
  SaveResult,
  ProjectValidationResult,
  CreateTaskData,
  TaskDeleteResult,
  DepUpdate,
  DepUpdateResult,
  SerializableDependencyGraph,
  DependencyInfo,
  ListOptions
} from './index.d'

// Custom APIs for renderer
const api = {
  project: {
    open: (projectPath: string): Promise<Roadmap> =>
      ipcRenderer.invoke('prt:project:open', projectPath),
    openDialog: (): Promise<OpenDialogResult> => ipcRenderer.invoke('prt:project:open-dialog'),
    init: (options: InitOptions): Promise<Roadmap> =>
      ipcRenderer.invoke('prt:project:init', options),
    save: (roadmap: Roadmap): Promise<SaveResult> =>
      ipcRenderer.invoke('prt:project:save', roadmap),
    validate: () => ipcRenderer.invoke('prt:project:validate'),
    stats: () => ipcRenderer.invoke('prt:project:stats')
  },
  task: {
    list: (options?: unknown): Promise<Task[]> => ipcRenderer.invoke('prt:task:list', options),
    get: (taskId: string): Promise<Task> => ipcRenderer.invoke('prt:task:get', taskId),
    add: (taskData: CreateTaskData): Promise<Task> => ipcRenderer.invoke('prt:task:add', taskData),
    update: (taskId: string, updates: Partial<Task>): Promise<Task> =>
      ipcRenderer.invoke('prt:task:update', taskId, updates),
    complete: (taskId: string): Promise<Task> => ipcRenderer.invoke('prt:task:complete', taskId),
    passTest: (taskId: string): Promise<Task> => ipcRenderer.invoke('prt:task:pass-test', taskId),
    delete: (taskId: string): Promise<TaskDeleteResult> =>
      ipcRenderer.invoke('prt:task:delete', taskId)
  },
  deps: {
    graph: (): Promise<SerializableDependencyGraph> => ipcRenderer.invoke('prt:deps:graph'),
    get: (taskId: string): Promise<{ dependsOn: Task[]; blocks: Task[] }> =>
      ipcRenderer.invoke('prt:deps:get', taskId),
    add: (params: DepUpdate): Promise<DepUpdateResult> =>
      ipcRenderer.invoke('prt:deps:add', params),
    remove: (params: DepUpdate): Promise<DepUpdateResult> =>
      ipcRenderer.invoke('prt:deps:remove', params),
    validate: (): Promise<DependencyValidationError[]> => ipcRenderer.invoke('prt:deps:validate'),
    detectCircular: (): Promise<CircularDependency | null> =>
      ipcRenderer.invoke('prt:deps:detect-circular'),
    sort: (): Promise<Task[]> => ipcRenderer.invoke('prt:deps:sort')
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

export type {
  ListOptions,
  InitOptions,
  OpenDialogResult,
  SaveResult,
  ProjectValidationResult,
  CreateTaskData,
  TaskDeleteResult,
  DepUpdate,
  DepUpdateResult,
  SerializableDependencyGraph,
  DependencyInfo
}
