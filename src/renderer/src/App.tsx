import { Button } from '@renderer/components/ui/button'
import {
  useProjectStats,
  useProjectValidation,
  useOpenProjectDialog
} from '@renderer/hooks/use-project'

/**
 * !TODO: Remove this test component once hooks are validated in the main app.
 * Test component to validate project query hooks work end-to-end.
 * This demonstrates:
 * - Read hooks: useProjectStats, useProjectValidation
 * - Mutation hooks: useOpenProjectDialog
 * - Automatic cache invalidation on mutations
 */
function ProjectHooksTest(): React.JSX.Element {
  const { data: stats, isLoading: statsLoading, error: statsError } = useProjectStats()
  const {
    data: validation,
    isLoading: validationLoading,
    error: validationError
  } = useProjectValidation()
  const openDialog = useOpenProjectDialog({
    onSuccess: (result) => {
      if (!result.canceled) {
        console.log('Project opened successfully')
      }
    },
    onError: (error) => {
      console.error('Failed to open project:', error.message)
    }
  })

  return (
    <div className="rounded-lg border border-border p-4 bg-card space-y-4">
      <div>
        <h3 className="text-sm font-medium mb-2">Project Hooks Test</h3>
        <Button onClick={() => openDialog.mutate()} disabled={openDialog.isPending}>
          {openDialog.isPending ? 'Opening...' : 'Open Project (Dialog)'}
        </Button>
      </div>

      <div>
        <h4 className="text-xs font-medium mb-1">Stats:</h4>
        <div className="text-xs text-muted-foreground">
          {statsLoading ? (
            <p>Loading stats...</p>
          ) : statsError ? (
            <p className="text-destructive">Error: {statsError.message}</p>
          ) : stats ? (
            <pre className="p-2 bg-muted rounded overflow-auto">
              {JSON.stringify(stats, null, 2)}
            </pre>
          ) : (
            <p>No stats available</p>
          )}
        </div>
      </div>

      <div>
        <h4 className="text-xs font-medium mb-1">Validation:</h4>
        <div className="text-xs text-muted-foreground">
          {validationLoading ? (
            <p>Validating...</p>
          ) : validationError ? (
            <p className="text-destructive">Error: {validationError.message}</p>
          ) : validation ? (
            <div>
              <p>Status: {validation.success ? '✓ Valid' : '✗ Invalid'}</p>
              {validation.errors && <p className="text-destructive mt-1">{validation.errors}</p>}
            </div>
          ) : (
            <p>No validation data</p>
          )}
        </div>
      </div>
    </div>
  )
}

function App(): React.JSX.Element {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-semibold">PRT Frontend</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-2xl space-y-6">
          <div>
            <h2 className="text-xl font-medium mb-4">Welcome</h2>
            <p className="text-muted-foreground mb-6">
              This is a minimal Electron + React + Tailwind shell. Start building your application
              here.
            </p>
            <Button>Get Started</Button>
          </div>

          {/* Project Hooks Validation */}
          <ProjectHooksTest />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="container mx-auto px-4 py-4">
          <p className="text-sm text-muted-foreground">
            Built with Electron + React + Tailwind CSS
          </p>
        </div>
      </footer>
    </div>
  )
}

export default App
