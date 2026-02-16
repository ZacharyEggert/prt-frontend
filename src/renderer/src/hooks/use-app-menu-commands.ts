import { useCallback, useEffect } from 'react'
import { useOpenProjectDialog } from '@renderer/hooks/use-project'
import { useNavigation } from '@renderer/hooks/use-navigation'
import { toast } from '@renderer/lib/toast'
import { getErrorCopy } from '@renderer/lib/error-copy'
import {
  MENU_NEW_PROJECT_DIRECTORY_EVENT,
  type MenuNewProjectDirectoryEventDetail
} from '@renderer/lib/menu-events'
import type { MenuCommand } from '../../../preload/index'

export function useAppMenuCommands(): void {
  const { navigate } = useNavigation()
  const { mutateAsync: openProjectDialog } = useOpenProjectDialog()

  const handleMenuCommand = useCallback(
    async (command: MenuCommand): Promise<void> => {
      switch (command) {
        case 'open-project': {
          const result = await openProjectDialog()
          if (!result.canceled && result.roadmap) {
            navigate('dashboard')
          }
          return
        }

        case 'new-project': {
          navigate('welcome')
          try {
            const result = await window.api.project.selectDirectory()
            if (!result.canceled && result.path) {
              const event = new CustomEvent<MenuNewProjectDirectoryEventDetail>(
                MENU_NEW_PROJECT_DIRECTORY_EVENT,
                {
                  detail: { path: result.path }
                }
              )
              window.dispatchEvent(event)
            }
          } catch {
            const copy = getErrorCopy('menuSelectDirectoryFailed')
            toast.error(copy.title, copy.description)
          }
          return
        }

        case 'save-project': {
          try {
            const result = await window.api.project.saveCurrent()
            toast.success('Project saved', `Saved to ${result.path}`)
          } catch {
            const copy = getErrorCopy('menuSaveProjectFailed')
            toast.error(copy.title, copy.description)
          }
          return
        }
      }
    },
    [navigate, openProjectDialog]
  )

  useEffect(() => {
    const unsubscribe = window.api.menu.subscribe((command) => {
      void handleMenuCommand(command)
    })

    return unsubscribe
  }, [handleMenuCommand])
}
