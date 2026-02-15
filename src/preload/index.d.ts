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
import type { RoadmapStats } from 'project-roadmap-tracking/dist/services/roadmap.service'

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

interface DirectorySelectResult {
  canceled: boolean
  path?: string
}

interface SaveResult {
  success: boolean
  path: string
}

interface CreateTaskData {
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

interface DepUpdate {
  fromTaskId: string
  toTaskId: string
  type: 'depends-on' | 'blocks'
}

interface DepUpdateResult {
  success: boolean
  updatedTasks: Task[]
}

interface SerializableDependencyGraph {
  blocks: Record<string, string[]>
  dependsOn: Record<string, string[]>
}

/**
 * Validation result structure from project validation
 */
interface ProjectValidationResult {
  success: boolean
  /** Formatted error messages (if validation failed) */
  errors?: string
}

/**
 * Options for filtering and sorting task lists.
 */
interface ListOptions {
  status?: STATUS | STATUS[]
  type?: TASK_TYPE | TASK_TYPE[]
  priority?: PRIORITY | PRIORITY[]
  tags?: string | string[]
  assignedTo?: string
  search?: string
  sortBy?: 'created' | 'updated' | 'priority' | 'status' | 'id'
  sortOrder?: 'asc' | 'desc'
  limit?: number
  offset?: number
}

/**
 * Dependency information for a specific task
 */
interface DependencyInfo {
  dependsOn: Task[]
  blocks: Task[]
}

/**
 * File change event structure for file watching.
 * Note: File watching not yet implemented.
 */
interface FileChangeEvent {
  type: 'created' | 'modified' | 'deleted'
  path: string
  timestamp: number
}

/**
 * Project management operations
 */
interface ProjectAPI {
  /** Opens a project file and sets as current */
  open: (projectPath: string) => Promise<Roadmap>
  /** Shows native file dialog to browse for project */
  openDialog: () => Promise<OpenDialogResult>
  /** Shows native file dialog to select directory for new project */
  selectDirectory: () => Promise<DirectorySelectResult>
  /** Initializes new PRT project via CLI */
  init: (options: InitOptions) => Promise<Roadmap>
  /** Saves roadmap to disk */
  save: (roadmap: Roadmap) => Promise<SaveResult>
  /** Validates roadmap structure and returns errors */
  validate: () => Promise<ProjectValidationResult>
  /** Generates statistics for current roadmap */
  stats: () => Promise<RoadmapStats>
  /** Gets metadata for current project */
  metadata: () => Promise<Roadmap['metadata']>
}

/**
 * Task CRUD operations
 */
interface TaskAPI {
  /**
   * Lists all tasks in current project.
   * @param options Optional filtering/sorting (not yet implemented)
   */
  list: (options?: ListOptions) => Promise<Task[]>
  /** Gets specific task by ID */
  get: (taskId: string) => Promise<Task>
  /** Creates new task with auto-generated ID */
  add: (taskData: CreateTaskData) => Promise<Task>
  /** Updates task properties (handles type changes) */
  update: (taskId: string, updates: Partial<Task>) => Promise<Task>
  /** Marks task as completed */
  complete: (taskId: string) => Promise<Task>
  /** Marks task's passes-tests flag as true */
  passTest: (taskId: string) => Promise<Task>
  /** Deletes task and cleans references */
  delete: (taskId: string) => Promise<TaskDeleteResult>
}

/**
 * Dependency management operations
 */
interface DepsAPI {
  /** Returns complete dependency graph */
  graph: () => Promise<SerializableDependencyGraph>
  /** Gets all dependencies for a task */
  get: (taskId: string) => Promise<DependencyInfo>
  /** Adds bidirectional dependency */
  add: (params: DepUpdate) => Promise<DepUpdateResult>
  /** Removes bidirectional dependency */
  remove: (params: DepUpdate) => Promise<DepUpdateResult>
  /** Validates all dependencies */
  validate: () => Promise<DependencyValidationError[]>
  /** Checks for circular dependencies */
  detectCircular: () => Promise<CircularDependency | null>
  /** Returns tasks in topological order */
  sort: () => Promise<Task[]>
}

/**
 * File watching API for detecting external changes.
 * Note: Not yet implemented.
 */
interface FileWatchAPI {
  /**
   * Subscribes to changes in the current project file.
   * @param callback Function called when file changes
   * @returns Cleanup function to unsubscribe
   */
  subscribe: (callback: (event: FileChangeEvent) => void) => () => void
}

/**
 * Complete API surface exposed to renderer via window.api
 */
interface PrtAPI {
  project: ProjectAPI
  task: TaskAPI
  deps: DepsAPI
  onFileChanged: FileWatchAPI
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: PrtAPI
  }
}

export type {
  // Main API
  PrtAPI,
  ProjectAPI,
  TaskAPI,
  DepsAPI,
  FileWatchAPI,
  // Helper types
  InitOptions,
  OpenDialogResult,
  DirectorySelectResult,
  SaveResult,
  CreateTaskData,
  TaskDeleteResult,
  DepUpdate,
  DepUpdateResult,
  SerializableDependencyGraph,
  ProjectValidationResult,
  ListOptions,
  DependencyInfo,
  FileChangeEvent
}
