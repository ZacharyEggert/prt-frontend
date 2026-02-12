import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type {
  Roadmap,
  Task,
  TASK_TYPE,
  PRIORITY,
  STATUS
} from 'project-roadmap-tracking/dist/util/types'
import type {
  DependencyValidationError,
  CircularDependency
} from 'project-roadmap-tracking/dist/services/task-dependency.service'

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

interface DependencyMutationParams {
  fromTaskId: string
  toTaskId: string
  type: 'depends-on' | 'blocks'
}

interface DependencyMutationResult {
  success: boolean
  updatedTasks: Task[]
}

interface SerializableDependencyGraph {
  blocks: Record<string, string[]>
  dependsOn: Record<string, string[]>
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
  },
  deps: {
    graph: (): Promise<SerializableDependencyGraph> => ipcRenderer.invoke('prt:deps:graph'),
    get: (taskId: string): Promise<{ dependsOn: Task[]; blocks: Task[] }> =>
      ipcRenderer.invoke('prt:deps:get', taskId),
    add: (params: DependencyMutationParams): Promise<DependencyMutationResult> =>
      ipcRenderer.invoke('prt:deps:add', params),
    remove: (params: DependencyMutationParams): Promise<DependencyMutationResult> =>
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
