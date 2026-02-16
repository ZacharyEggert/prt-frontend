import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock file-watcher module
vi.mock('../../../src/main/ipc/file-watcher', () => ({
  startWatching: vi.fn(),
  stopWatching: vi.fn(),
  suppressNextChange: vi.fn()
}))

// Mock readRoadmapFile
const mockRoadmap = {
  $schema: 'https://prt.dev/schema/v1',
  metadata: {
    name: 'Test Project',
    description: 'A test project',
    createdBy: 'test',
    createdAt: '2024-01-01T00:00:00Z'
  },
  tasks: []
}

vi.mock('project-roadmap-tracking/dist/util/read-roadmap.js', () => ({
  readRoadmapFile: vi.fn(async () => mockRoadmap)
}))

vi.mock('project-roadmap-tracking/dist/util/write-roadmap.js', () => ({
  writeRoadmapFile: vi.fn()
}))

const mockValidate = vi.fn().mockReturnValue([])
const mockGetStats = vi.fn().mockReturnValue({
  totalTasks: 5,
  byStatus: { completed: 2, 'in-progress': 1, 'not-started': 2 },
  byType: { bug: 1, feature: 2, improvement: 1, planning: 0, research: 1 },
  byPriority: { high: 1, low: 2, medium: 2 }
})

vi.mock('project-roadmap-tracking/dist/services/roadmap.service.js', () => {
  return {
    RoadmapService: function () {
      return {
        validate: mockValidate,
        getStats: mockGetStats
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
    showOpenDialog: vi.fn().mockResolvedValue({
      canceled: false,
      filePaths: ['/test/project']
    })
  }
}))

// Mock child_process
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

import { dialog } from 'electron'
import { writeRoadmapFile } from 'project-roadmap-tracking/dist/util/write-roadmap.js'
import { suppressNextChange } from '../../../src/main/ipc/file-watcher'

describe('project IPC handlers', () => {
  beforeEach(() => {
    mockHandlers.clear()
    vi.clearAllMocks()
    mockValidate.mockReturnValue([])
    mockGetStats.mockReturnValue({
      totalTasks: 5,
      byStatus: { completed: 2, 'in-progress': 1, 'not-started': 2 },
      byType: { bug: 1, feature: 2, improvement: 1, planning: 0, research: 1 },
      byPriority: { high: 1, low: 2, medium: 2 }
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  async function getHandler(channel: string): Promise<(...args: unknown[]) => Promise<unknown>> {
    mockHandlers.clear()
    const mod = await import('../../../src/main/ipc/project.ipc')
    mod.registerProjectHandlers()
    const handler = mockHandlers.get(channel)
    if (!handler) throw new Error(`Handler for '${channel}' not registered`)
    return handler as (...args: unknown[]) => Promise<unknown>
  }

  /** Set currentProjectPath by opening a project first */
  async function openProject(): Promise<void> {
    const handler = await getHandler('prt:project:open')
    await handler({}, '/test/project/prt.json')
  }

  describe('prt:project:save', () => {
    it('writes roadmap to disk and calls suppressNextChange', async () => {
      await openProject()
      const handler = await getHandler('prt:project:save')
      const roadmap = { ...mockRoadmap, tasks: [{ id: 'F-001' }] }

      const result = await handler({}, roadmap)

      expect(suppressNextChange).toHaveBeenCalled()
      expect(writeRoadmapFile).toHaveBeenCalledWith('/test/project/prt.json', roadmap)
      expect(result).toEqual({ success: true, path: '/test/project/prt.json' })
    })

    it('throws when no project is open', async () => {
      // Fresh import without opening a project
      mockHandlers.clear()
      // Reset the module to clear currentProjectPath
      vi.resetModules()
      const mod = await import('../../../src/main/ipc/project.ipc')
      mod.registerProjectHandlers()
      const handler = mockHandlers.get('prt:project:save')!

      await expect(handler({}, mockRoadmap)).rejects.toThrow('No project is currently open')
    })
  })

  describe('prt:project:save-current', () => {
    it('reads and writes the current roadmap to disk', async () => {
      await openProject()
      const handler = await getHandler('prt:project:save-current')

      const result = await handler({})

      expect(suppressNextChange).toHaveBeenCalled()
      expect(writeRoadmapFile).toHaveBeenCalledWith('/test/project/prt.json', mockRoadmap)
      expect(result).toEqual({ success: true, path: '/test/project/prt.json' })
    })

    it('throws when no project is open', async () => {
      vi.resetModules()
      const mod = await import('../../../src/main/ipc/project.ipc')
      mod.registerProjectHandlers()
      const handler = mockHandlers.get('prt:project:save-current')!

      await expect(handler({})).rejects.toThrow('No project is currently open')
    })
  })

  describe('prt:project:validate', () => {
    it('returns success when no validation errors', async () => {
      await openProject()
      const handler = await getHandler('prt:project:validate')

      const result = await handler({})

      expect(result).toEqual({ success: true })
    })

    it('returns errors when validation fails', async () => {
      mockValidate.mockReturnValue(['Missing title', 'Invalid status'])
      await openProject()
      const handler = await getHandler('prt:project:validate')

      const result = (await handler({})) as { success: boolean; errors?: string }

      expect(result.success).toBe(false)
      expect(result.errors).toContain('Missing title')
      expect(result.errors).toContain('Invalid status')
    })

    it('throws when no project is open', async () => {
      vi.resetModules()
      const mod = await import('../../../src/main/ipc/project.ipc')
      mod.registerProjectHandlers()
      const handler = mockHandlers.get('prt:project:validate')!

      await expect(handler({})).rejects.toThrow('No project is currently open')
    })
  })

  describe('prt:project:stats', () => {
    it('returns project statistics', async () => {
      await openProject()
      const handler = await getHandler('prt:project:stats')

      const result = await handler({})

      expect(result).toEqual({
        totalTasks: 5,
        byStatus: { completed: 2, 'in-progress': 1, 'not-started': 2 },
        byType: { bug: 1, feature: 2, improvement: 1, planning: 0, research: 1 },
        byPriority: { high: 1, low: 2, medium: 2 }
      })
    })

    it('throws when no project is open', async () => {
      vi.resetModules()
      const mod = await import('../../../src/main/ipc/project.ipc')
      mod.registerProjectHandlers()
      const handler = mockHandlers.get('prt:project:stats')!

      await expect(handler({})).rejects.toThrow('No project is currently open')
    })
  })

  describe('prt:project:metadata', () => {
    it('returns roadmap metadata', async () => {
      await openProject()
      const handler = await getHandler('prt:project:metadata')

      const result = await handler({})

      expect(result).toEqual(mockRoadmap.metadata)
    })

    it('throws when no project is open', async () => {
      vi.resetModules()
      const mod = await import('../../../src/main/ipc/project.ipc')
      mod.registerProjectHandlers()
      const handler = mockHandlers.get('prt:project:metadata')!

      await expect(handler({})).rejects.toThrow('No project is currently open')
    })
  })

  describe('prt:project:select-directory', () => {
    it('returns selected directory path', async () => {
      const handler = await getHandler('prt:project:select-directory')

      const result = await handler({})

      expect(dialog.showOpenDialog).toHaveBeenCalledWith({
        properties: ['openDirectory', 'createDirectory'],
        title: 'Select Project Directory',
        message: 'Choose where to create your new project'
      })
      expect(result).toEqual({ canceled: false, path: '/test/project' })
    })

    it('returns canceled when user cancels dialog', async () => {
      vi.mocked(dialog.showOpenDialog).mockResolvedValueOnce({
        canceled: true,
        filePaths: []
      })
      const handler = await getHandler('prt:project:select-directory')

      const result = await handler({})

      expect(result).toEqual({ canceled: true, path: undefined })
    })
  })
})
