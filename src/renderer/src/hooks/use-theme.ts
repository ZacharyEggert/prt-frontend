import { useCallback } from 'react'
import { useTheme as useNextTheme } from 'next-themes'

export type Theme = 'light' | 'dark' | 'system'
type ResolvedTheme = 'light' | 'dark'

function resolveFallbackTheme(): ResolvedTheme {
  if (typeof document !== 'undefined') {
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
  }

  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }

  return 'light'
}

export function useTheme(): {
  theme: Theme
  resolvedTheme: ResolvedTheme
  setTheme: (theme: Theme) => void
} {
  const { theme, resolvedTheme, setTheme } = useNextTheme()

  const normalizedTheme: Theme =
    theme === 'light' || theme === 'dark' || theme === 'system' ? theme : 'system'
  const normalizedResolvedTheme: ResolvedTheme =
    resolvedTheme === 'light' || resolvedTheme === 'dark' ? resolvedTheme : resolveFallbackTheme()

  const setAppTheme = useCallback(
    (nextTheme: Theme): void => {
      setTheme(nextTheme)
    },
    [setTheme]
  )

  return {
    theme: normalizedTheme,
    resolvedTheme: normalizedResolvedTheme,
    setTheme: setAppTheme
  }
}
