import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Track call order across mocked functions
const callOrder: string[] = []

// Mock file-watcher module
vi.mock('../../src/main/ipc/file-watcher', () => ({
  startWatching: vi.fn(async () => {
    callOrder.push('startWatching')
  }),
  stopWatching: vi.fn(async () => {
    callOrder.push('stopWatching')
  }),
  suppressNextChange: vi.fn()
}))

// Mock readRoadmapFile
vi.mock('project-roadmap-tracking/dist/util/read-roadmap.js', () => ({
  readRoadmapFile: vi.fn(async () => {
    callOrder.push('readRoadmapFile')
    return mockRoadmap
  })
}))

// Mock writeRoadmapFile
vi.mock('project-roadmap-tracking/dist/util/write-roadmap.js', () => ({
  writeRoadmapFile: vi.fn()
}))

// Mock RoadmapService
vi.mock('project-roadmap-tracking/dist/services/roadmap.service.js', () => ({
  RoadmapService: vi.fn().mockImplementation(() => ({
    validate: vi.fn().mockReturnValue([]),
    getStats: vi.fn().mockReturnValue({ totalTasks: 0 })
  }))
}))

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
      filePaths: ['/test/new-project']
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

import { readRoadmapFile } from 'project-roadmap-tracking/dist/util/read-roadmap.js'
import { startWatching, stopWatching } from '../../src/main/ipc/file-watcher'

const mockRoadmap = {
  $schema: 'https://prt.dev/schema/v1',
  metadata: {
    name: 'Test Project',
    description: '',
    createdBy: 'test',
    createdAt: '2024-01-01T00:00:00Z'
  },
  tasks: []
}

describe('project switching cleanup', () => {
  beforeEach(() => {
    callOrder.length = 0
    mockHandlers.clear()
    vi.clearAllMocks()

    // Re-install tracking implementations after clearAllMocks
    vi.mocked(stopWatching).mockImplementation(async () => {
      callOrder.push('stopWatching')
    })
    vi.mocked(startWatching).mockImplementation(async () => {
      callOrder.push('startWatching')
    })
    vi.mocked(readRoadmapFile).mockImplementation(async () => {
      callOrder.push('readRoadmapFile')
      return mockRoadmap as never
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  /**
   * Helper: register handlers and return the handler for a specific channel.
   * We dynamically import to trigger IPC registration.
   */
  async function getHandler(channel: string): Promise<(...args: unknown[]) => Promise<unknown>> {
    // Clear previous registrations
    mockHandlers.clear()

    // Re-import to trigger registerProjectHandlers
    const mod = await import('../../src/main/ipc/project.ipc')
    mod.registerProjectHandlers()

    const handler = mockHandlers.get(channel)
    if (!handler) {
      throw new Error(`Handler for channel '${channel}' not registered`)
    }

    // IPC handlers are wrapped with wrapHandler, which passes the event as first arg
    return handler as (...args: unknown[]) => Promise<unknown>
  }

  describe('prt:project:open', () => {
    it('stops the file watcher before loading the new project', async () => {
      const handler = await getHandler('prt:project:open')

      await handler({}, '/test/new-project/prt.json')

      expect(callOrder.indexOf('stopWatching')).toBeLessThan(callOrder.indexOf('readRoadmapFile'))
    })

    it('calls stopWatching, then readRoadmapFile, then startWatching', async () => {
      const handler = await getHandler('prt:project:open')

      await handler({}, '/test/new-project/prt.json')

      expect(callOrder).toEqual(['stopWatching', 'readRoadmapFile', 'startWatching'])
    })

    it('starts a new watcher on the new project path', async () => {
      const handler = await getHandler('prt:project:open')

      await handler({}, '/test/new-project/prt.json')

      expect(startWatching).toHaveBeenCalledWith('/test/new-project/prt.json')
    })

    it('stops the watcher even if readRoadmapFile throws', async () => {
      vi.mocked(readRoadmapFile).mockImplementation(async () => {
        callOrder.push('readRoadmapFile')
        throw new Error('File not found')
      })

      const handler = await getHandler('prt:project:open')

      await expect(handler({}, '/test/bad-path/prt.json')).rejects.toThrow()

      expect(stopWatching).toHaveBeenCalled()
      expect(startWatching).not.toHaveBeenCalled()
    })
  })

  describe('prt:project:open-dialog', () => {
    it('stops the file watcher before loading the new project', async () => {
      const handler = await getHandler('prt:project:open-dialog')

      await handler({})

      expect(callOrder.indexOf('stopWatching')).toBeLessThan(callOrder.indexOf('readRoadmapFile'))
    })

    it('starts a new watcher after successful load', async () => {
      const handler = await getHandler('prt:project:open-dialog')

      await handler({})

      expect(startWatching).toHaveBeenCalled()
    })
  })

  describe('prt:project:init', () => {
    it('stops the file watcher before initializing the new project', async () => {
      const handler = await getHandler('prt:project:init')

      await handler(
        {},
        {
          path: '/test/new-project',
          name: 'New Project',
          description: 'Test'
        }
      )

      expect(stopWatching).toHaveBeenCalled()
    })

    it('starts a new watcher after successful init', async () => {
      const handler = await getHandler('prt:project:init')

      await handler(
        {},
        {
          path: '/test/new-project',
          name: 'New Project',
          description: 'Test'
        }
      )

      expect(startWatching).toHaveBeenCalled()
    })
  })
})
