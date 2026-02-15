import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@renderer/lib/query-keys'
import { toast } from '@renderer/lib/toast'
import type { FileChangeEvent } from '../../../preload/index'

export function useFileChangeListener(): void {
  const queryClient = useQueryClient()

  useEffect(() => {
    const unsubscribe = window.api.onFileChanged.subscribe((event: FileChangeEvent) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.project.root })
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.root })
      queryClient.invalidateQueries({ queryKey: queryKeys.deps.root })

      if (event.type === 'deleted') {
        toast.warning('Project file deleted', 'The prt.json file was removed externally')
      } else {
        toast.info('Project updated', 'External changes detected and reloaded')
      }
    })

    return unsubscribe
  }, [queryClient])
}
