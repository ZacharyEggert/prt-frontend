import { useEffect } from 'react'
import { useProjectMetadata } from '@renderer/hooks/use-project'
import { useNavigation } from '@renderer/hooks/use-navigation'

const DEFAULT_WINDOW_TITLE = 'PRT'

export function useWindowTitle(): void {
  const { currentView } = useNavigation()
  const { data: metadata } = useProjectMetadata()

  useEffect(() => {
    if (currentView !== 'welcome' && metadata?.name) {
      document.title = `PRT - ${metadata.name}`
      return
    }

    document.title = DEFAULT_WINDOW_TITLE
  }, [currentView, metadata?.name])
}
