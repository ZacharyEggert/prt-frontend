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

const sampleTask: Task = {
  id: 'F-001',
  title: 'Sample Task',
  details: 'Details here',
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
  updatedAt: '2024-01-01T00:00:00Z'
}

const sampleTask2: Task = {
  ...sampleTask,
  id: 'F-002',
  title: 'Second Task',
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
  tasks: [sampleTask, sampleTask2]
}

vi.mock('project-roadmap-tracking/dist/util/read-roadmap.js', () => ({
  readRoadmapFile: vi.fn(async () => mockRoadmap)
}))

vi.mock('project-roadmap-tracking/dist/util/write-roadmap.js', () => ({
  writeRoadmapFile: vi.fn()
}))

const mockFindTask = vi.fn(
  (roadmap: Roadmap, taskId: string) => roadmap.tasks.find((t) => t.id === taskId) ?? null
)
const mockCreateTask = vi.fn((data: Partial<Task>) => ({ ...sampleTask, ...data }))
const mockAddTask = vi.fn(
  (roadmap: Roadmap, task: Task): Roadmap => ({
    ...roadmap,
    tasks: [...roadmap.tasks, task]
  })
)
const mockUpdateTask = vi.fn(
  (roadmap: Roadmap, taskId: string, updates: Partial<Task>): Roadmap => ({
    ...roadmap,
    tasks: roadmap.tasks.map((t) => (t.id === taskId ? { ...t, ...updates } : t))
  })
)
const mockUpdateTaskType = vi.fn(() => ({
  roadmap: mockRoadmap,
  newTaskId: 'B-001'
}))
const mockGenerateNextId = vi.fn(() => 'F-003')

vi.mock('project-roadmap-tracking/dist/services/task.service.js', () => {
  return {
    TaskService: function () {
      return {
        findTask: mockFindTask,
        createTask: mockCreateTask,
        addTask: mockAddTask,
        updateTask: mockUpdateTask,
        updateTaskType: mockUpdateTaskType,
        generateNextId: mockGenerateNextId
      }
    }
  }
})

const mockFilter = vi.fn((tasks: Task[]) => tasks)
const mockSearch = vi.fn((tasks: Task[]) => tasks)
const mockSort = vi.fn((tasks: Task[]) => tasks)

vi.mock('project-roadmap-tracking/dist/services/task-query.service.js', () => {
  return {
    TaskQueryService: function () {
      return {
        filter: mockFilter,
        search: mockSearch,
        sort: mockSort
      }
    },
    SortOrder: { Ascending: 'asc', Descending: 'desc' }
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

// Mock Electron (needed because project.ipc is imported for currentProjectPath)
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

describe('task IPC handlers', () => {
  beforeEach(() => {
    mockHandlers.clear()
    vi.clearAllMocks()
    // Restore default mock implementations
    mockFindTask.mockImplementation(
      (roadmap: Roadmap, taskId: string) => roadmap.tasks.find((t) => t.id === taskId) ?? null
    )
    mockFilter.mockImplementation((tasks: Task[]) => tasks)
    mockSearch.mockImplementation((tasks: Task[]) => tasks)
    mockSort.mockImplementation((tasks: Task[]) => tasks)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  async function registerAllHandlers(): Promise<void> {
    mockHandlers.clear()
    vi.resetModules()
    // Register project handlers first to set up the module
    const projectMod = await import('../../../src/main/ipc/project.ipc')
    projectMod.registerProjectHandlers()
    const taskMod = await import('../../../src/main/ipc/task.ipc')
    taskMod.registerTaskHandlers()
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

  describe('prt:task:list', () => {
    it('returns all tasks when no options provided', async () => {
      await openProject()
      const handler = getHandler('prt:task:list')

      const result = await handler({}, undefined)

      expect(result).toEqual(mockRoadmap.tasks)
    })

    it('applies filters when provided', async () => {
      const filtered = [sampleTask]
      mockFilter.mockReturnValueOnce(filtered)
      await openProject()
      const handler = getHandler('prt:task:list')

      const result = await handler({}, { status: STATUS.NotStarted })

      expect(mockFilter).toHaveBeenCalled()
      expect(result).toEqual(filtered)
    })

    it('applies search when query provided', async () => {
      const searched = [sampleTask]
      mockSearch.mockReturnValueOnce(searched)
      await openProject()
      const handler = getHandler('prt:task:list')

      const result = await handler({}, { search: 'Sample' })

      expect(mockSearch).toHaveBeenCalledWith(expect.any(Array), 'Sample')
      expect(result).toEqual(searched)
    })

    it('applies sorting when sortBy provided', async () => {
      await openProject()
      const handler = getHandler('prt:task:list')

      await handler({}, { sortBy: 'priority', sortOrder: 'desc' })

      expect(mockSort).toHaveBeenCalled()
    })

    it('applies pagination', async () => {
      await openProject()
      const handler = getHandler('prt:task:list')

      const result = await handler({}, { offset: 0, limit: 1 })

      expect(result).toEqual([sampleTask])
    })

    it('throws when no project is open', async () => {
      await registerAllHandlers()
      const handler = getHandler('prt:task:list')

      await expect(handler({}, undefined)).rejects.toThrow('No project is currently open')
    })
  })

  describe('prt:task:get', () => {
    it('returns task by ID', async () => {
      await openProject()
      const handler = getHandler('prt:task:get')

      const result = await handler({}, 'F-001')

      expect(result).toEqual(sampleTask)
    })

    it('throws when task not found', async () => {
      mockFindTask.mockReturnValueOnce(null)
      await openProject()
      const handler = getHandler('prt:task:get')

      await expect(handler({}, 'F-999')).rejects.toThrow("Task with ID 'F-999' not found")
    })

    it('throws when no project is open', async () => {
      await registerAllHandlers()
      const handler = getHandler('prt:task:get')

      await expect(handler({}, 'F-001')).rejects.toThrow('No project is currently open')
    })
  })

  describe('prt:task:add', () => {
    it('creates task with generated ID and writes to disk', async () => {
      await openProject()
      const handler = getHandler('prt:task:add')

      await handler(
        {},
        {
          title: 'New Task',
          details: 'New details',
          type: TASK_TYPE.Feature,
          priority: PRIORITY.High
        }
      )

      expect(mockGenerateNextId).toHaveBeenCalled()
      expect(mockCreateTask).toHaveBeenCalled()
      expect(mockAddTask).toHaveBeenCalled()
      expect(suppressNextChange).toHaveBeenCalled()
      expect(writeRoadmapFile).toHaveBeenCalled()
    })

    it('throws when no project is open', async () => {
      await registerAllHandlers()
      const handler = getHandler('prt:task:add')

      await expect(handler({}, { title: 'Test' })).rejects.toThrow('No project is currently open')
    })
  })

  describe('prt:task:update', () => {
    it('updates task and writes to disk', async () => {
      await openProject()
      const handler = getHandler('prt:task:update')

      await handler({}, 'F-001', { title: 'Updated Title' })

      expect(mockUpdateTask).toHaveBeenCalledWith(expect.any(Object), 'F-001', {
        title: 'Updated Title'
      })
      expect(suppressNextChange).toHaveBeenCalled()
      expect(writeRoadmapFile).toHaveBeenCalled()
    })

    it('handles type changes with ID reassignment', async () => {
      mockFindTask.mockReturnValue({ ...sampleTask, id: 'B-001', type: TASK_TYPE.Bug })
      await openProject()
      const handler = getHandler('prt:task:update')

      await handler({}, 'F-001', { type: TASK_TYPE.Bug, title: 'Updated' })

      expect(mockUpdateTaskType).toHaveBeenCalledWith(expect.any(Object), 'F-001', TASK_TYPE.Bug)
    })

    it('throws when no project is open', async () => {
      await registerAllHandlers()
      const handler = getHandler('prt:task:update')

      await expect(handler({}, 'F-001', { title: 'Test' })).rejects.toThrow(
        'No project is currently open'
      )
    })
  })

  describe('prt:task:complete', () => {
    it('marks task as completed and writes to disk', async () => {
      await openProject()
      const handler = getHandler('prt:task:complete')

      await handler({}, 'F-001')

      expect(mockUpdateTask).toHaveBeenCalledWith(expect.any(Object), 'F-001', {
        status: 'completed'
      })
      expect(suppressNextChange).toHaveBeenCalled()
      expect(writeRoadmapFile).toHaveBeenCalled()
    })

    it('throws when no project is open', async () => {
      await registerAllHandlers()
      const handler = getHandler('prt:task:complete')

      await expect(handler({}, 'F-001')).rejects.toThrow('No project is currently open')
    })
  })

  describe('prt:task:pass-test', () => {
    it('sets passes-tests to true and writes to disk', async () => {
      await openProject()
      const handler = getHandler('prt:task:pass-test')

      await handler({}, 'F-001')

      expect(mockUpdateTask).toHaveBeenCalledWith(expect.any(Object), 'F-001', {
        'passes-tests': true
      })
      expect(suppressNextChange).toHaveBeenCalled()
      expect(writeRoadmapFile).toHaveBeenCalled()
    })

    it('throws when no project is open', async () => {
      await registerAllHandlers()
      const handler = getHandler('prt:task:pass-test')

      await expect(handler({}, 'F-001')).rejects.toThrow('No project is currently open')
    })
  })

  describe('prt:task:delete', () => {
    it('removes task and cleans up dependency references', async () => {
      await openProject()
      const handler = getHandler('prt:task:delete')

      const result = (await handler({}, 'F-001')) as { success: boolean; deletedTaskId: string }

      expect(result.success).toBe(true)
      expect(result.deletedTaskId).toBe('F-001')
      expect(suppressNextChange).toHaveBeenCalled()
      expect(writeRoadmapFile).toHaveBeenCalled()

      // Verify that writeRoadmapFile was called with a roadmap that doesn't contain F-001
      const writtenRoadmap = vi.mocked(writeRoadmapFile).mock.calls[0][1] as Roadmap
      expect(writtenRoadmap.tasks.find((t) => t.id === 'F-001')).toBeUndefined()
      // Verify dep references to F-001 were cleaned up
      for (const task of writtenRoadmap.tasks) {
        expect(task['depends-on']).not.toContain('F-001')
        expect(task.blocks).not.toContain('F-001')
      }
    })

    it('throws when task not found', async () => {
      mockFindTask.mockReturnValueOnce(null)
      await openProject()
      const handler = getHandler('prt:task:delete')

      await expect(handler({}, 'F-999')).rejects.toThrow("Task with ID 'F-999' not found")
    })

    it('throws when no project is open', async () => {
      await registerAllHandlers()
      const handler = getHandler('prt:task:delete')

      await expect(handler({}, 'F-001')).rejects.toThrow('No project is currently open')
    })
  })
})
