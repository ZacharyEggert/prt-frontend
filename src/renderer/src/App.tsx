import { Button } from '@renderer/components/ui/button'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@renderer/lib/query-keys'

/**
 * !TODO: Remove this test component once query keys are validated in the main app.
 * Test component to validate query keys work with TanStack Query.
 * This demonstrates:
 * - Query key factory integration
 * - Type inference from query keys
 * - IPC API integration via window.api
 */
function QueryKeysTest(): React.JSX.Element {
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.project.stats(),
    queryFn: () => window.api.project.stats(),
    // Only run if a project is open
    enabled: false
  })

  return (
    <div className="rounded-lg border border-border p-4 bg-card">
      <h3 className="text-sm font-medium mb-2">Query Keys Test</h3>
      <div className="text-sm text-muted-foreground space-y-1">
        <p>Status: {isLoading ? 'Loading...' : error ? 'Error' : 'Ready'}</p>
        {data && (
          <pre className="text-xs mt-2 p-2 bg-muted rounded overflow-auto">
            {JSON.stringify(data, null, 2)}
          </pre>
        )}
        <p className="text-xs mt-2">
          Query key:{' '}
          <code className="bg-muted px-1 py-0.5 rounded">
            {JSON.stringify(queryKeys.project.stats())}
          </code>
        </p>
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

          {/* Query Keys Validation */}
          <QueryKeysTest />
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
