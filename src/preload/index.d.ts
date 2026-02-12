import { ElectronAPI } from '@electron-toolkit/preload'
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

interface TaskDeleteResult {
  success: boolean
  deletedTaskId: string
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
    }
  }
}
