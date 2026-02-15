import { vi, type Mock } from 'vitest'
import { STATUS } from 'project-roadmap-tracking/dist/util/types'
import type { ProjectAPI, TaskAPI, DepsAPI } from '../../../src/preload/index.d'
import {
  createRoadmap,
  createTask,
  createStats,
  createMetadata,
  createOpenDialogResult,
  createDirectorySelectResult,
  createSaveResult,
  createValidationResult,
  createDeleteResult,
  createDepUpdateResult,
  createDependencyGraph,
  createDependencyInfo
} from './factories'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MockedFn = Mock<(...args: any[]) => any>
type MockedObject<T> = { [K in keyof T]: MockedFn }

export interface MockPrtAPI {
  project: MockedObject<ProjectAPI>
  task: MockedObject<TaskAPI>
  deps: MockedObject<DepsAPI>
  onFileChanged: { subscribe: MockedFn }
}

function createMockApi(): MockPrtAPI {
  return {
    project: {
      open: vi.fn().mockResolvedValue(createRoadmap()),
      openDialog: vi.fn().mockResolvedValue(createOpenDialogResult()),
      selectDirectory: vi.fn().mockResolvedValue(createDirectorySelectResult()),
      init: vi.fn().mockResolvedValue(createRoadmap()),
      save: vi.fn().mockResolvedValue(createSaveResult()),
      validate: vi.fn().mockResolvedValue(createValidationResult()),
      stats: vi.fn().mockResolvedValue(createStats()),
      metadata: vi.fn().mockResolvedValue(createMetadata())
    },
    task: {
      list: vi.fn().mockResolvedValue([]),
      get: vi.fn().mockResolvedValue(createTask()),
      add: vi.fn().mockResolvedValue(createTask()),
      update: vi.fn().mockResolvedValue(createTask()),
      complete: vi.fn().mockResolvedValue(createTask({ status: STATUS.Completed })),
      passTest: vi.fn().mockResolvedValue(createTask({ 'passes-tests': true })),
      delete: vi.fn().mockResolvedValue(createDeleteResult())
    },
    deps: {
      graph: vi.fn().mockResolvedValue(createDependencyGraph()),
      get: vi.fn().mockResolvedValue(createDependencyInfo()),
      add: vi.fn().mockResolvedValue(createDepUpdateResult()),
      remove: vi.fn().mockResolvedValue(createDepUpdateResult()),
      validate: vi.fn().mockResolvedValue([]),
      detectCircular: vi.fn().mockResolvedValue(null),
      sort: vi.fn().mockResolvedValue([])
    },
    onFileChanged: {
      subscribe: vi.fn().mockReturnValue(() => {})
    }
  }
}

/**
 * Mock API object matching the PrtAPI interface. Import in tests to customize
 * per-test behavior:
 *
 *   mockApi.task.list.mockResolvedValue([createTask({ title: 'Custom' })])
 */
export const mockApi = createMockApi()

/**
 * Resets all mock functions and restores sensible default return values.
 * Called in beforeEach via the setup file to ensure test isolation.
 */
export function resetMockApi(): void {
  // Project
  mockApi.project.open.mockReset().mockResolvedValue(createRoadmap())
  mockApi.project.openDialog.mockReset().mockResolvedValue(createOpenDialogResult())
  mockApi.project.selectDirectory.mockReset().mockResolvedValue(createDirectorySelectResult())
  mockApi.project.init.mockReset().mockResolvedValue(createRoadmap())
  mockApi.project.save.mockReset().mockResolvedValue(createSaveResult())
  mockApi.project.validate.mockReset().mockResolvedValue(createValidationResult())
  mockApi.project.stats.mockReset().mockResolvedValue(createStats())
  mockApi.project.metadata.mockReset().mockResolvedValue(createMetadata())

  // Task
  mockApi.task.list.mockReset().mockResolvedValue([])
  mockApi.task.get.mockReset().mockResolvedValue(createTask())
  mockApi.task.add.mockReset().mockResolvedValue(createTask())
  mockApi.task.update.mockReset().mockResolvedValue(createTask())
  mockApi.task.complete.mockReset().mockResolvedValue(createTask({ status: STATUS.Completed }))
  mockApi.task.passTest.mockReset().mockResolvedValue(createTask({ 'passes-tests': true }))
  mockApi.task.delete.mockReset().mockResolvedValue(createDeleteResult())

  // Deps
  mockApi.deps.graph.mockReset().mockResolvedValue(createDependencyGraph())
  mockApi.deps.get.mockReset().mockResolvedValue(createDependencyInfo())
  mockApi.deps.add.mockReset().mockResolvedValue(createDepUpdateResult())
  mockApi.deps.remove.mockReset().mockResolvedValue(createDepUpdateResult())
  mockApi.deps.validate.mockReset().mockResolvedValue([])
  mockApi.deps.detectCircular.mockReset().mockResolvedValue(null)
  mockApi.deps.sort.mockReset().mockResolvedValue([])

  // File watching
  mockApi.onFileChanged.subscribe.mockReset().mockReturnValue(() => {})
}
