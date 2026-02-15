import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock chokidar before importing the module under test
const mockWatcher = {
  on: vi.fn().mockReturnThis(),
  close: vi.fn().mockResolvedValue(undefined)
}

vi.mock('chokidar', () => ({
  watch: vi.fn(() => mockWatcher)
}))

// Mock Electron's BrowserWindow
const mockWebContents = { send: vi.fn() }
const mockWindow = {
  isDestroyed: vi.fn().mockReturnValue(false),
  webContents: mockWebContents
}

vi.mock('electron', () => ({
  BrowserWindow: {
    getAllWindows: vi.fn(() => [mockWindow])
  }
}))

// Mock readRoadmapFile — factory cannot reference external variables, so use vi.fn() directly
vi.mock('project-roadmap-tracking/dist/util/read-roadmap.js', () => ({
  readRoadmapFile: vi.fn()
}))

import { startWatching, stopWatching, suppressNextChange } from '../../src/main/ipc/file-watcher'
import { watch } from 'chokidar'
import { BrowserWindow } from 'electron'
import { readRoadmapFile } from 'project-roadmap-tracking/dist/util/read-roadmap.js'

const mockRoadmap = { metadata: { name: 'Test' }, tasks: [] }

describe('file-watcher', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    mockWatcher.on.mockReturnThis()
    mockWatcher.close.mockResolvedValue(undefined)
    mockWindow.isDestroyed.mockReturnValue(false)
    vi.mocked(readRoadmapFile).mockResolvedValue(mockRoadmap as never)
  })

  afterEach(async () => {
    vi.useRealTimers()
    await stopWatching()
  })

  describe('startWatching', () => {
    it('should create a chokidar watcher on the given path', async () => {
      await startWatching('/path/to/prt.json')

      expect(watch).toHaveBeenCalledWith('/path/to/prt.json', {
        persistent: true,
        ignoreInitial: true,
        awaitWriteFinish: {
          stabilityThreshold: 200,
          pollInterval: 50
        }
      })
    })

    it('should register change and unlink event handlers', async () => {
      await startWatching('/path/to/prt.json')

      expect(mockWatcher.on).toHaveBeenCalledWith('change', expect.any(Function))
      expect(mockWatcher.on).toHaveBeenCalledWith('unlink', expect.any(Function))
    })

    it('should stop any existing watcher before starting a new one', async () => {
      await startWatching('/path/to/first.json')
      await startWatching('/path/to/second.json')

      expect(mockWatcher.close).toHaveBeenCalledTimes(1)
      expect(watch).toHaveBeenCalledTimes(2)
    })

    it('should send prt:file:changed event to all windows on file change after debounce', async () => {
      await startWatching('/path/to/prt.json')

      const changeHandler = mockWatcher.on.mock.calls.find((c) => c[0] === 'change')![1]
      changeHandler()

      // Before debounce, no event should be sent
      expect(mockWebContents.send).not.toHaveBeenCalled()

      // Advance past debounce (500ms)
      await vi.advanceTimersByTimeAsync(500)

      expect(mockWebContents.send).toHaveBeenCalledWith(
        'prt:file:changed',
        expect.objectContaining({
          type: 'modified',
          path: '/path/to/prt.json'
        }),
        mockRoadmap
      )
    })

    it('should include timestamp in FileChangeEvent', async () => {
      await startWatching('/path/to/prt.json')

      const changeHandler = mockWatcher.on.mock.calls.find((c) => c[0] === 'change')![1]
      changeHandler()

      await vi.advanceTimersByTimeAsync(500)

      const sentEvent = mockWebContents.send.mock.calls[0][1]
      expect(sentEvent.timestamp).toBeTypeOf('number')
    })

    it('should send deleted event on unlink', async () => {
      await startWatching('/path/to/prt.json')

      const unlinkHandler = mockWatcher.on.mock.calls.find((c) => c[0] === 'unlink')![1]
      unlinkHandler()

      await vi.advanceTimersByTimeAsync(500)

      expect(mockWebContents.send).toHaveBeenCalledWith(
        'prt:file:changed',
        expect.objectContaining({
          type: 'deleted',
          path: '/path/to/prt.json'
        }),
        null
      )
    })

    it('should skip destroyed windows when sending events', async () => {
      mockWindow.isDestroyed.mockReturnValue(true)

      await startWatching('/path/to/prt.json')

      const changeHandler = mockWatcher.on.mock.calls.find((c) => c[0] === 'change')![1]
      changeHandler()

      await vi.advanceTimersByTimeAsync(500)

      expect(mockWebContents.send).not.toHaveBeenCalled()
    })

    it('should not crash if readRoadmapFile throws', async () => {
      vi.mocked(readRoadmapFile).mockRejectedValue(new Error('File not found'))
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      await startWatching('/path/to/prt.json')

      const changeHandler = mockWatcher.on.mock.calls.find((c) => c[0] === 'change')![1]
      changeHandler()

      await vi.advanceTimersByTimeAsync(500)

      expect(consoleSpy).toHaveBeenCalledWith(
        '[file-watcher] Failed to read updated roadmap:',
        expect.any(Error)
      )
      expect(mockWebContents.send).not.toHaveBeenCalled()

      consoleSpy.mockRestore()
    })
  })

  describe('stopWatching', () => {
    it('should close the chokidar watcher', async () => {
      await startWatching('/path/to/prt.json')
      await stopWatching()

      expect(mockWatcher.close).toHaveBeenCalled()
    })

    it('should be safe to call when no watcher is active', async () => {
      // Should not throw
      await stopWatching()
      await stopWatching()
    })

    it('should clear pending debounce timers', async () => {
      await startWatching('/path/to/prt.json')

      const changeHandler = mockWatcher.on.mock.calls.find((c) => c[0] === 'change')![1]
      changeHandler()

      // Stop before debounce completes
      await stopWatching()

      await vi.advanceTimersByTimeAsync(500)

      // Event should NOT have been sent because we stopped
      expect(mockWebContents.send).not.toHaveBeenCalled()
    })
  })

  describe('suppressNextChange', () => {
    it('should suppress the next file change event', async () => {
      await startWatching('/path/to/prt.json')

      suppressNextChange()

      const changeHandler = mockWatcher.on.mock.calls.find((c) => c[0] === 'change')![1]
      changeHandler()

      await vi.advanceTimersByTimeAsync(500)

      // Should NOT send event because it was suppressed
      expect(mockWebContents.send).not.toHaveBeenCalled()
    })

    it('should only suppress one event then allow the next', async () => {
      await startWatching('/path/to/prt.json')

      suppressNextChange()

      const changeHandler = mockWatcher.on.mock.calls.find((c) => c[0] === 'change')![1]

      // First change - suppressed
      changeHandler()
      await vi.advanceTimersByTimeAsync(500)
      expect(mockWebContents.send).not.toHaveBeenCalled()

      // Second change - should go through
      changeHandler()
      await vi.advanceTimersByTimeAsync(500)
      expect(mockWebContents.send).toHaveBeenCalledTimes(1)
    })

    it('should auto-clear the flag after timeout if watcher never fires', async () => {
      await startWatching('/path/to/prt.json')

      suppressNextChange()

      // Advance past the suppress timeout (2000ms) without triggering a change
      await vi.advanceTimersByTimeAsync(2000)

      // Now trigger a change - should NOT be suppressed
      const changeHandler = mockWatcher.on.mock.calls.find((c) => c[0] === 'change')![1]
      changeHandler()
      await vi.advanceTimersByTimeAsync(500)

      expect(mockWebContents.send).toHaveBeenCalledTimes(1)
    })
  })

  describe('debounce behavior', () => {
    it('should only send one event for multiple rapid changes', async () => {
      await startWatching('/path/to/prt.json')

      const changeHandler = mockWatcher.on.mock.calls.find((c) => c[0] === 'change')![1]

      // Fire multiple rapid changes
      changeHandler()
      await vi.advanceTimersByTimeAsync(100)
      changeHandler()
      await vi.advanceTimersByTimeAsync(100)
      changeHandler()

      // Advance past full debounce from last change
      await vi.advanceTimersByTimeAsync(500)

      expect(mockWebContents.send).toHaveBeenCalledTimes(1)
    })

    it('should reset the debounce timer on each new change', async () => {
      await startWatching('/path/to/prt.json')

      const changeHandler = mockWatcher.on.mock.calls.find((c) => c[0] === 'change')![1]

      // Fire change, wait 400ms (not enough for 500ms debounce)
      changeHandler()
      await vi.advanceTimersByTimeAsync(400)

      // Fire another change - this should reset the 500ms timer
      changeHandler()
      await vi.advanceTimersByTimeAsync(400)

      // 800ms total, but only 400ms since last change - should not have fired yet
      expect(mockWebContents.send).not.toHaveBeenCalled()

      // Advance remaining 100ms to complete the debounce
      await vi.advanceTimersByTimeAsync(100)

      expect(mockWebContents.send).toHaveBeenCalledTimes(1)
    })

    it('should send to all non-destroyed windows', async () => {
      const mockWindow2 = {
        isDestroyed: vi.fn().mockReturnValue(false),
        webContents: { send: vi.fn() }
      }
      vi.mocked(BrowserWindow.getAllWindows).mockReturnValue([
        mockWindow as unknown as BrowserWindow,
        mockWindow2 as unknown as BrowserWindow
      ])

      await startWatching('/path/to/prt.json')

      const changeHandler = mockWatcher.on.mock.calls.find((c) => c[0] === 'change')![1]
      changeHandler()

      await vi.advanceTimersByTimeAsync(500)

      expect(mockWebContents.send).toHaveBeenCalledTimes(1)
      expect(mockWindow2.webContents.send).toHaveBeenCalledTimes(1)
    })
  })
})
