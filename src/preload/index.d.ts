import { ElectronAPI } from '@electron-toolkit/preload'
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

interface TaskDeleteResult {
  success: boolean
  deletedTaskId: string
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

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      project: {
        open: (projectPath: string) => Promise<Roadmap>
        openDialog: () => Promise<OpenDialogResult>
        init: (options: InitOptions) => Promise<Roadmap>
        save: (roadmap: Roadmap) => Promise<SaveResult>
      }
      task: {
        list: () => Promise<Task[]>
        get: (taskId: string) => Promise<Task>
        add: (taskData: TaskCreateData) => Promise<Task>
        update: (taskId: string, updates: Partial<Task>) => Promise<Task>
        complete: (taskId: string) => Promise<Task>
        passTest: (taskId: string) => Promise<Task>
        delete: (taskId: string) => Promise<TaskDeleteResult>
      }
      deps: {
        graph: () => Promise<SerializableDependencyGraph>
        get: (taskId: string) => Promise<{ dependsOn: Task[]; blocks: Task[] }>
        add: (params: DependencyMutationParams) => Promise<DependencyMutationResult>
        remove: (params: DependencyMutationParams) => Promise<DependencyMutationResult>
        validate: () => Promise<DependencyValidationError[]>
        detectCircular: () => Promise<CircularDependency | null>
        sort: () => Promise<Task[]>
      }
    }
  }
}
