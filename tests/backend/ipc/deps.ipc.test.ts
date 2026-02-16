import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  STATUS,
  TASK_TYPE,
  PRIORITY,
  type Task,
  type Roadmap
} from 'project-roadmap-tracking/dist/util/types'

// Mock file-watcher module
vi.mock('../../../src/main/ipc/file-watcher', () => ({
  startWatching: vi.fn(),
  stopWatching: vi.fn(),
  suppressNextChange: vi.fn()
}))

const taskA: Task = {
  id: 'F-001',
  title: 'Task A',
  details: '',
  type: TASK_TYPE.Feature,
  status: STATUS.NotStarted,
  priority: PRIORITY.Medium,
  tags: [],
  'depends-on': [],
  blocks: ['F-002'],
  'passes-tests': false,
  assignedTo: null,
  dueDate: null,
  effort: null,
  notes: null,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z'
}

const taskB: Task = {
  ...taskA,
  id: 'F-002',
  title: 'Task B',
  'depends-on': ['F-001'],
  blocks: []
}

const mockRoadmap: Roadmap = {
  $schema: 'https://prt.dev/schema/v1',
  metadata: {
    name: 'Test Project',
    description: '',
    createdBy: 'test',
    createdAt: '2024-01-01T00:00:00Z'
  },
  tasks: [taskA, taskB]
}

vi.mock('project-roadmap-tracking/dist/util/read-roadmap.js', () => ({
  readRoadmapFile: vi.fn(async () => mockRoadmap)
}))

vi.mock('project-roadmap-tracking/dist/util/write-roadmap.js', () => ({
  writeRoadmapFile: vi.fn()
}))

const mockBuildGraph = vi.fn(() => ({
  blocks: new Map([
    ['F-001', ['F-002']],
    ['F-002', []]
  ]),
  dependsOn: new Map([
    ['F-001', []],
    ['F-002', ['F-001']]
  ])
}))
const mockGetDependsOnTasks = vi.fn(() => [taskA])
const mockGetBlockedTasks = vi.fn(() => [taskB])
const mockDetectCircular = vi.fn(() => null)
const mockValidateDependencies = vi.fn(() => [])
const mockTopologicalSort = vi.fn(() => [taskA, taskB])

vi.mock('project-roadmap-tracking/dist/services/task-dependency.service.js', () => {
  return {
    TaskDependencyService: function () {
      return {
        buildGraph: mockBuildGraph,
        getDependsOnTasks: mockGetDependsOnTasks,
        getBlockedTasks: mockGetBlockedTasks,
        detectCircular: mockDetectCircular,
        validateDependencies: mockValidateDependencies,
        topologicalSort: mockTopologicalSort
      }
    }
  }
})

const mockFindTask = vi.fn(
  (roadmap: Roadmap, taskId: string) => roadmap.tasks.find((t) => t.id === taskId) ?? null
)

vi.mock('project-roadmap-tracking/dist/services/task.service.js', () => {
  return {
    TaskService: function () {
      return {
        findTask: mockFindTask
      }
    }
  }
})

vi.mock('project-roadmap-tracking/dist/services/error-handler.service.js', () => {
  class MockErrorHandlerService {
    formatErrorMessage(err: unknown): string {
      return err instanceof Error ? err.message : String(err)
    }
  }
  return { ErrorHandlerService: MockErrorHandlerService }
})

// Mock Electron
const mockHandlers = new Map<string, (...args: unknown[]) => unknown>()
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn((channel: string, handler: (...args: unknown[]) => unknown) => {
      mockHandlers.set(channel, handler)
    })
  },
  dialog: {
    showOpenDialog: vi.fn().mockResolvedValue({ canceled: false, filePaths: ['/test/project'] })
  }
}))

vi.mock('child_process', () => ({
  execFile: vi.fn((_cmd, _args, _opts, cb) => cb?.(null, '', ''))
}))

vi.mock('util', async () => {
  const actual = await vi.importActual<typeof import('util')>('util')
  return {
    ...actual,
    promisify: vi.fn(() => vi.fn().mockResolvedValue({ stdout: '', stderr: '' }))
  }
})

import { writeRoadmapFile } from 'project-roadmap-tracking/dist/util/write-roadmap.js'
import { suppressNextChange } from '../../../src/main/ipc/file-watcher'

describe('deps IPC handlers', () => {
  beforeEach(() => {
    mockHandlers.clear()
    vi.clearAllMocks()
    mockFindTask.mockImplementation(
      (roadmap: Roadmap, taskId: string) => roadmap.tasks.find((t) => t.id === taskId) ?? null
    )
    mockDetectCircular.mockReturnValue(null)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  async function registerAllHandlers(): Promise<void> {
    mockHandlers.clear()
    vi.resetModules()
    const projectMod = await import('../../../src/main/ipc/project.ipc')
    projectMod.registerProjectHandlers()
    const depsMod = await import('../../../src/main/ipc/deps.ipc')
    depsMod.registerDepsHandlers()
  }

  async function openProject(): Promise<void> {
    await registerAllHandlers()
    const openHandler = mockHandlers.get('prt:project:open')!
    await openHandler({}, '/test/project/prt.json')
  }

  function getHandler(channel: string): (...args: unknown[]) => Promise<unknown> {
    const handler = mockHandlers.get(channel)
    if (!handler) throw new Error(`Handler for '${channel}' not registered`)
    return handler as (...args: unknown[]) => Promise<unknown>
  }

  describe('prt:deps:graph', () => {
    it('returns dependency graph as plain objects', async () => {
      await openProject()
      const handler = getHandler('prt:deps:graph')

      const result = (await handler({})) as Record<string, unknown>

      expect(result).toHaveProperty('blocks')
      expect(result).toHaveProperty('dependsOn')
      // Verify Maps were converted to plain objects
      expect(result.blocks).not.toBeInstanceOf(Map)
      expect(result.dependsOn).not.toBeInstanceOf(Map)
    })

    it('throws when no project is open', async () => {
      await registerAllHandlers()
      const handler = getHandler('prt:deps:graph')

      await expect(handler({})).rejects.toThrow('No project is currently open')
    })
  })

  describe('prt:deps:get', () => {
    it('returns dependsOn and blocks for a task', async () => {
      await openProject()
      const handler = getHandler('prt:deps:get')

      const result = (await handler({}, 'F-002')) as {
        dependsOn: Task[]
        blocks: Task[]
      }

      expect(result).toHaveProperty('dependsOn')
      expect(result).toHaveProperty('blocks')
      expect(mockGetDependsOnTasks).toHaveBeenCalled()
      expect(mockGetBlockedTasks).toHaveBeenCalled()
    })

    it('throws when task not found', async () => {
      mockFindTask.mockReturnValueOnce(null)
      await openProject()
      const handler = getHandler('prt:deps:get')

      await expect(handler({}, 'F-999')).rejects.toThrow("Task with ID 'F-999' not found")
    })

    it('throws when no project is open', async () => {
      await registerAllHandlers()
      const handler = getHandler('prt:deps:get')

      await expect(handler({}, 'F-001')).rejects.toThrow('No project is currently open')
    })
  })

  describe('prt:deps:add', () => {
    it('adds bidirectional dependency and writes to disk', async () => {
      await openProject()
      const handler = getHandler('prt:deps:add')

      const result = (await handler(
        {},
        {
          fromTaskId: 'F-002',
          toTaskId: 'F-001',
          type: 'depends-on'
        }
      )) as { success: boolean; updatedTasks: Task[] }

      expect(result.success).toBe(true)
      expect(suppressNextChange).toHaveBeenCalled()
      expect(writeRoadmapFile).toHaveBeenCalled()
    })

    it('throws on circular dependency', async () => {
      mockDetectCircular.mockReturnValueOnce({ message: 'Cycle detected: F-001 → F-002 → F-001' })
      await openProject()
      const handler = getHandler('prt:deps:add')

      await expect(
        handler(
          {},
          {
            fromTaskId: 'F-001',
            toTaskId: 'F-002',
            type: 'depends-on'
          }
        )
      ).rejects.toThrow('circular dependency')
    })

    it('throws on invalid dependency type', async () => {
      await openProject()
      const handler = getHandler('prt:deps:add')

      await expect(
        handler(
          {},
          {
            fromTaskId: 'F-001',
            toTaskId: 'F-002',
            type: 'invalid'
          }
        )
      ).rejects.toThrow('Invalid dependency type')
    })

    it('throws when fromTask not found', async () => {
      mockFindTask.mockImplementation((_roadmap: Roadmap, taskId: string) => {
        if (taskId === 'F-999') return null
        return mockRoadmap.tasks.find((t) => t.id === taskId) ?? null
      })
      await openProject()
      const handler = getHandler('prt:deps:add')

      await expect(
        handler(
          {},
          {
            fromTaskId: 'F-999',
            toTaskId: 'F-001',
            type: 'depends-on'
          }
        )
      ).rejects.toThrow("Task with ID 'F-999' not found")
    })

    it('throws when no project is open', async () => {
      await registerAllHandlers()
      const handler = getHandler('prt:deps:add')

      await expect(
        handler(
          {},
          {
            fromTaskId: 'F-001',
            toTaskId: 'F-002',
            type: 'depends-on'
          }
        )
      ).rejects.toThrow('No project is currently open')
    })
  })

  describe('prt:deps:remove', () => {
    it('removes bidirectional dependency and writes to disk', async () => {
      await openProject()
      const handler = getHandler('prt:deps:remove')

      const result = (await handler(
        {},
        {
          fromTaskId: 'F-002',
          toTaskId: 'F-001',
          type: 'depends-on'
        }
      )) as { success: boolean; updatedTasks: Task[] }

      expect(result.success).toBe(true)
      expect(suppressNextChange).toHaveBeenCalled()
      expect(writeRoadmapFile).toHaveBeenCalled()
    })

    it('throws when task not found', async () => {
      mockFindTask.mockImplementation((_roadmap: Roadmap, taskId: string) => {
        if (taskId === 'F-999') return null
        return mockRoadmap.tasks.find((t) => t.id === taskId) ?? null
      })
      await openProject()
      const handler = getHandler('prt:deps:remove')

      await expect(
        handler(
          {},
          {
            fromTaskId: 'F-999',
            toTaskId: 'F-001',
            type: 'depends-on'
          }
        )
      ).rejects.toThrow("Task with ID 'F-999' not found")
    })

    it('throws when no project is open', async () => {
      await registerAllHandlers()
      const handler = getHandler('prt:deps:remove')

      await expect(
        handler(
          {},
          {
            fromTaskId: 'F-001',
            toTaskId: 'F-002',
            type: 'depends-on'
          }
        )
      ).rejects.toThrow('No project is currently open')
    })
  })

  describe('prt:deps:validate', () => {
    it('returns empty array when all deps valid', async () => {
      await openProject()
      const handler = getHandler('prt:deps:validate')

      const result = await handler({})

      expect(result).toEqual([])
      expect(mockValidateDependencies).toHaveBeenCalled()
    })

    it('throws when no project is open', async () => {
      await registerAllHandlers()
      const handler = getHandler('prt:deps:validate')

      await expect(handler({})).rejects.toThrow('No project is currently open')
    })
  })

  describe('prt:deps:detect-circular', () => {
    it('returns null when no circular deps', async () => {
      await openProject()
      const handler = getHandler('prt:deps:detect-circular')

      const result = await handler({})

      expect(result).toBeNull()
    })

    it('returns circular dependency info when found', async () => {
      mockDetectCircular.mockReturnValueOnce({ message: 'Cycle found' })
      await openProject()
      const handler = getHandler('prt:deps:detect-circular')

      const result = await handler({})

      expect(result).toEqual({ message: 'Cycle found' })
    })

    it('throws when no project is open', async () => {
      await registerAllHandlers()
      const handler = getHandler('prt:deps:detect-circular')

      await expect(handler({})).rejects.toThrow('No project is currently open')
    })
  })

  describe('prt:deps:sort', () => {
    it('returns tasks in topological order', async () => {
      await openProject()
      const handler = getHandler('prt:deps:sort')

      const result = await handler({})

      expect(result).toEqual([taskA, taskB])
      expect(mockTopologicalSort).toHaveBeenCalled()
    })

    it('throws when no project is open', async () => {
      await registerAllHandlers()
      const handler = getHandler('prt:deps:sort')

      await expect(handler({})).rejects.toThrow('No project is currently open')
    })
  })
})
