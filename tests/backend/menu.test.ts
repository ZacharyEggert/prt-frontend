import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { MenuItemConstructorOptions } from 'electron'

const {
  focusedWindowSend,
  fallbackWindowSend,
  focusedWindow,
  fallbackWindow,
  buildFromTemplateMock,
  showAboutPanelMock
} = vi.hoisted(() => {
  const focusedWindowSend = vi.fn()
  const fallbackWindowSend = vi.fn()
  const focusedWindow = {
    isDestroyed: vi.fn(() => false),
    webContents: {
      send: focusedWindowSend
    }
  }
  const fallbackWindow = {
    isDestroyed: vi.fn(() => false),
    webContents: {
      send: fallbackWindowSend
    }
  }
  const buildFromTemplateMock = vi.fn((template: MenuItemConstructorOptions[]) => ({ template }))
  const showAboutPanelMock = vi.fn()

  return {
    focusedWindowSend,
    fallbackWindowSend,
    focusedWindow,
    fallbackWindow,
    buildFromTemplateMock,
    showAboutPanelMock
  }
})

vi.mock('electron', () => ({
  app: {
    showAboutPanel: showAboutPanelMock
  },
  BrowserWindow: {
    getFocusedWindow: vi.fn(() => focusedWindow),
    getAllWindows: vi.fn(() => [fallbackWindow])
  },
  Menu: {
    buildFromTemplate: buildFromTemplateMock
  }
}))

import { app, BrowserWindow, Menu } from 'electron'
import {
  buildAppMenuTemplate,
  createApplicationMenu,
  MENU_COMMAND_CHANNEL
} from '../../src/main/menu'

function getSubmenu(label: string): MenuItemConstructorOptions[] {
  const section = buildAppMenuTemplate().find((item) => item.label === label)
  if (!section) {
    throw new Error(`Menu section "${label}" not found`)
  }
  if (!Array.isArray(section.submenu)) {
    throw new Error(`Menu section "${label}" does not have an array submenu`)
  }
  return section.submenu
}

describe('main menu', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(BrowserWindow.getFocusedWindow).mockReturnValue(
      focusedWindow as unknown as Electron.BrowserWindow
    )
    vi.mocked(BrowserWindow.getAllWindows).mockReturnValue([
      fallbackWindow as unknown as Electron.BrowserWindow
    ])
  })

  it('builds expected top-level sections', () => {
    const labels = buildAppMenuTemplate().map((item) => item.label)
    expect(labels).toEqual(['File', 'Edit', 'View', 'Help'])
  })

  it('contains quit role in File menu', () => {
    const fileSubmenu = getSubmenu('File')
    expect(fileSubmenu.some((item) => item.role === 'quit')).toBe(true)
  })

  it('emits open/new/save commands to renderer', () => {
    const fileSubmenu = getSubmenu('File')

    const newItem = fileSubmenu.find((item) => item.label === 'New')
    const openItem = fileSubmenu.find((item) => item.label === 'Open')
    const saveItem = fileSubmenu.find((item) => item.label === 'Save')

    newItem?.click?.()
    openItem?.click?.()
    saveItem?.click?.()

    expect(focusedWindowSend).toHaveBeenNthCalledWith(1, MENU_COMMAND_CHANNEL, 'new-project')
    expect(focusedWindowSend).toHaveBeenNthCalledWith(2, MENU_COMMAND_CHANNEL, 'open-project')
    expect(focusedWindowSend).toHaveBeenNthCalledWith(3, MENU_COMMAND_CHANNEL, 'save-project')
  })

  it('falls back to first window when no focused window exists', () => {
    vi.mocked(BrowserWindow.getFocusedWindow).mockReturnValue(null)
    const fileSubmenu = getSubmenu('File')
    const saveItem = fileSubmenu.find((item) => item.label === 'Save')

    saveItem?.click?.()

    expect(fallbackWindowSend).toHaveBeenCalledWith(MENU_COMMAND_CHANNEL, 'save-project')
  })

  it('does not emit commands when no window is available', () => {
    vi.mocked(BrowserWindow.getFocusedWindow).mockReturnValue(null)
    vi.mocked(BrowserWindow.getAllWindows).mockReturnValue([])
    const fileSubmenu = getSubmenu('File')
    const openItem = fileSubmenu.find((item) => item.label === 'Open')

    openItem?.click?.()

    expect(focusedWindowSend).not.toHaveBeenCalled()
    expect(fallbackWindowSend).not.toHaveBeenCalled()
  })

  it('opens native about panel from Help menu', () => {
    const helpSubmenu = getSubmenu('Help')
    const aboutItem = helpSubmenu.find((item) => item.label === 'About')

    aboutItem?.click?.()

    expect(app.showAboutPanel).toHaveBeenCalled()
  })

  it('creates menu using Menu.buildFromTemplate', () => {
    createApplicationMenu()
    expect(Menu.buildFromTemplate).toHaveBeenCalledTimes(1)
  })
})
