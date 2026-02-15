/* eslint-disable react-refresh/only-export-components */
import { type ReactElement } from 'react'
import { render, type RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TooltipProvider } from '@renderer/components/ui/tooltip'

function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity,
        staleTime: 0
      },
      mutations: {
        retry: false
      }
    }
  })
}

function AllProviders({ children }: { children: React.ReactNode }): React.JSX.Element {
  const queryClient = createTestQueryClient()

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>{children}</TooltipProvider>
    </QueryClientProvider>
  )
}

function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
): ReturnType<typeof render> {
  return render(ui, { wrapper: AllProviders, ...options })
}

export { renderWithProviders, createTestQueryClient }
