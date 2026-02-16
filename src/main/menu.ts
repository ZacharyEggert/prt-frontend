import { app, BrowserWindow, Menu, type MenuItemConstructorOptions } from 'electron'

export const MENU_COMMAND_CHANNEL = 'prt:menu:command'

export type MenuCommand = 'new-project' | 'open-project' | 'save-project'

function getTargetWindow(): BrowserWindow | null {
  const focusedWindow = BrowserWindow.getFocusedWindow()
  if (focusedWindow && !focusedWindow.isDestroyed()) {
    return focusedWindow
  }

  const [firstWindow] = BrowserWindow.getAllWindows()
  if (firstWindow && !firstWindow.isDestroyed()) {
    return firstWindow
  }

  return null
}

function sendMenuCommand(command: MenuCommand): void {
  const targetWindow = getTargetWindow()
  if (!targetWindow) return

  targetWindow.webContents.send(MENU_COMMAND_CHANNEL, command)
}

export function buildAppMenuTemplate(): MenuItemConstructorOptions[] {
  return [
    {
      label: 'File',
      submenu: [
        {
          label: 'New',
          accelerator: 'CmdOrCtrl+N',
          click: () => sendMenuCommand('new-project')
        },
        {
          label: 'Open',
          accelerator: 'CmdOrCtrl+O',
          click: () => sendMenuCommand('open-project')
        },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => sendMenuCommand('save-project')
        },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About',
          click: () => app.showAboutPanel()
        }
      ]
    }
  ]
}

export function createApplicationMenu(): Menu {
  return Menu.buildFromTemplate(buildAppMenuTemplate())
}
