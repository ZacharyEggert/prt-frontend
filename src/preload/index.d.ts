import { ElectronAPI } from '@electron-toolkit/preload'
import type { Roadmap } from 'project-roadmap-tracking/dist/util/types'

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

interface SaveResult {
  success: boolean
  path: string
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      project: {
        open: (projectPath: string) => Promise<Roadmap>
        openDialog: () => Promise<OpenDialogResult>
        init: (options: InitOptions) => Promise<Roadmap>
        save: (roadmap: Roadmap) => Promise<SaveResult>
      }
    }
  }
}
