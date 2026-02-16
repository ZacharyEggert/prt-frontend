import { useSyncExternalStore } from 'react'

function supportsMatchMedia(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
}

function getSnapshot(query: string): boolean {
  if (!supportsMatchMedia()) return false
  return window.matchMedia(query).matches
}

function subscribeToQuery(query: string, onStoreChange: () => void): () => void {
  if (!supportsMatchMedia()) return () => {}

  const mediaQueryList = window.matchMedia(query)
  const handleChange = (): void => {
    onStoreChange()
  }

  if (typeof mediaQueryList.addEventListener === 'function') {
    mediaQueryList.addEventListener('change', handleChange)
    return () => {
      mediaQueryList.removeEventListener('change', handleChange)
    }
  }

  mediaQueryList.addListener(handleChange)
  return () => {
    mediaQueryList.removeListener(handleChange)
  }
}

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onStoreChange) => subscribeToQuery(query, onStoreChange),
    () => getSnapshot(query),
    () => false
  )
}
