export function WelcomeView(): React.JSX.Element {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-3xl font-semibold">Welcome to PRT</h1>
      <p className="text-muted-foreground">
        Open an existing project or create a new one to get started with project roadmap tracking.
      </p>
    </div>
  )
}
