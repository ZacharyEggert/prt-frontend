import { QueryClient } from '@tanstack/react-query'

/**
 * Global QueryClient instance for TanStack Query.
 *
 * Configuration optimized for Electron IPC patterns:
 * - staleTime: 30s - Balance between freshness and IPC overhead
 * - gcTime: 5min - Memory-efficient cache retention
 * - retry: 1 - Single retry for local data operations
 *
 * Exported for:
 * - QueryClientProvider integration in main.tsx
 * - Cache invalidation from file-change listeners (future)
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000, // 30 seconds
      gcTime: 300000, // 5 minutes
      retry: 1, // Single retry
      refetchOnWindowFocus: false // Electron-specific: single window
    }
  }
})
