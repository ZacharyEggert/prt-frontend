import { Button } from '@renderer/components/ui/button'

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
        <div className="max-w-2xl">
          <h2 className="text-xl font-medium mb-4">Welcome</h2>
          <p className="text-muted-foreground mb-6">
            This is a minimal Electron + React + Tailwind shell. Start building your application here.
          </p>
          <Button>Get Started</Button>
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
