import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, cleanup, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WelcomeView } from '@renderer/pages/welcome'
import { mockApi } from '../mocks/mock-api'
import {
  createOpenDialogResult,
  createRoadmap,
  createDirectorySelectResult
} from '../mocks/factories'

// Mock toast
vi.mock('@renderer/lib/toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn()
  }
}))

// Mock navigation
const mockNavigate = vi.fn()
vi.mock('@renderer/hooks/use-navigation', () => ({
  useNavigation: () => ({ currentView: 'welcome', navigate: mockNavigate }),
  NavigationProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>
}))

function createWrapper(): {
  wrapper: ({ children }: { children: React.ReactNode }) => React.JSX.Element
  queryClient: QueryClient
} {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity, staleTime: Infinity }
    }
  })

  const wrapper = ({ children }: { children: React.ReactNode }): React.JSX.Element => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  return { wrapper, queryClient }
}

describe('WelcomeView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders welcome heading and both cards', () => {
    const { wrapper: Wrapper } = createWrapper()

    render(
      <Wrapper>
        <WelcomeView />
      </Wrapper>
    )

    expect(screen.getByText('Welcome to PRT')).toBeInTheDocument()
    expect(screen.getByText('Open Project')).toBeInTheDocument()
    expect(screen.getByText('Create New Project')).toBeInTheDocument()
  })

  it('renders browse and choose directory buttons', () => {
    const { wrapper: Wrapper } = createWrapper()

    render(
      <Wrapper>
        <WelcomeView />
      </Wrapper>
    )

    expect(screen.getByText('Browse for Project')).toBeInTheDocument()
    expect(screen.getByText('Choose Directory')).toBeInTheDocument()
  })

  it('calls openDialog when Browse for Project is clicked', async () => {
    const user = userEvent.setup()
    mockApi.project.openDialog.mockResolvedValueOnce(createOpenDialogResult({ canceled: true }))
    const { wrapper: Wrapper } = createWrapper()

    render(
      <Wrapper>
        <WelcomeView />
      </Wrapper>
    )

    await user.click(screen.getByText('Browse for Project'))

    await waitFor(() => {
      expect(mockApi.project.openDialog).toHaveBeenCalled()
    })
  })

  it('navigates to dashboard after successful project open', async () => {
    const user = userEvent.setup()
    const roadmap = createRoadmap({
      metadata: {
        name: 'Opened',
        description: '',
        createdBy: 'test',
        createdAt: '2024-01-01T00:00:00Z'
      }
    })
    mockApi.project.openDialog.mockResolvedValueOnce(
      createOpenDialogResult({ canceled: false, roadmap })
    )
    const { wrapper: Wrapper } = createWrapper()

    render(
      <Wrapper>
        <WelcomeView />
      </Wrapper>
    )

    await user.click(screen.getByText('Browse for Project'))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('dashboard')
    })
  })

  it('shows new project form after directory selection', async () => {
    const user = userEvent.setup()
    mockApi.project.selectDirectory.mockResolvedValueOnce(
      createDirectorySelectResult({ canceled: false, path: '/my/project' })
    )
    const { wrapper: Wrapper } = createWrapper()

    render(
      <Wrapper>
        <WelcomeView />
      </Wrapper>
    )

    await user.click(screen.getByText('Choose Directory'))

    await waitFor(() => {
      expect(screen.getByText('Location: /my/project')).toBeInTheDocument()
    })

    expect(screen.getByLabelText('Project Name')).toBeInTheDocument()
    expect(screen.getByLabelText('Description')).toBeInTheDocument()
    expect(screen.getByText('Create Project')).toBeInTheDocument()
  })
})
