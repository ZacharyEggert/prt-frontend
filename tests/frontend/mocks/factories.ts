import {
  type Task,
  type Roadmap,
  TASK_TYPE,
  STATUS,
  PRIORITY
} from 'project-roadmap-tracking/dist/util/types'
import type { RoadmapStats } from 'project-roadmap-tracking/dist/services/roadmap.service'
import type {
  OpenDialogResult,
  DirectorySelectResult,
  SaveResult,
  ProjectValidationResult,
  TaskDeleteResult,
  DepUpdateResult,
  SerializableDependencyGraph,
  DependencyInfo
} from '../../../src/preload/index.d'

// ---------- Core entities ----------

export function createTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'F-001',
    title: 'Sample Task',
    details: '',
    type: TASK_TYPE.Feature,
    status: STATUS.NotStarted,
    priority: PRIORITY.Medium,
    tags: [],
    'depends-on': [],
    blocks: [],
    'passes-tests': false,
    assignedTo: null,
    dueDate: null,
    effort: null,
    notes: null,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides
  }
}

export function createRoadmap(overrides: Partial<Roadmap> = {}): Roadmap {
  return {
    $schema: 'https://prt.dev/schema/v1',
    metadata: {
      name: 'Test Project',
      description: '',
      createdBy: 'test',
      createdAt: '2024-01-01T00:00:00Z'
    },
    tasks: [],
    ...overrides
  }
}

export function createStats(overrides: Partial<RoadmapStats> = {}): RoadmapStats {
  return {
    totalTasks: 0,
    byStatus: { completed: 0, 'in-progress': 0, 'not-started': 0 },
    byType: { bug: 0, feature: 0, improvement: 0, planning: 0, research: 0 },
    byPriority: { high: 0, low: 0, medium: 0 },
    ...overrides
  }
}

export function createMetadata(overrides: Partial<Roadmap['metadata']> = {}): Roadmap['metadata'] {
  return {
    name: 'Test Project',
    description: '',
    createdBy: 'test',
    createdAt: '2024-01-01T00:00:00Z',
    ...overrides
  }
}

// ---------- API response types ----------

export function createOpenDialogResult(
  overrides: Partial<OpenDialogResult> = {}
): OpenDialogResult {
  return { canceled: false, roadmap: createRoadmap(), ...overrides }
}

export function createDirectorySelectResult(
  overrides: Partial<DirectorySelectResult> = {}
): DirectorySelectResult {
  return { canceled: false, path: '/tmp/test-project', ...overrides }
}

export function createSaveResult(overrides: Partial<SaveResult> = {}): SaveResult {
  return { success: true, path: '/tmp/test-project/prt.json', ...overrides }
}

export function createValidationResult(
  overrides: Partial<ProjectValidationResult> = {}
): ProjectValidationResult {
  return { success: true, ...overrides }
}

export function createDeleteResult(overrides: Partial<TaskDeleteResult> = {}): TaskDeleteResult {
  return { success: true, deletedTaskId: 'F-001', ...overrides }
}

export function createDepUpdateResult(overrides: Partial<DepUpdateResult> = {}): DepUpdateResult {
  return { success: true, updatedTasks: [], ...overrides }
}

export function createDependencyGraph(
  overrides: Partial<SerializableDependencyGraph> = {}
): SerializableDependencyGraph {
  return { blocks: {}, dependsOn: {}, ...overrides }
}

export function createDependencyInfo(overrides: Partial<DependencyInfo> = {}): DependencyInfo {
  return { dependsOn: [], blocks: [], ...overrides }
}
