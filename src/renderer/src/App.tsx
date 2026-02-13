import { Toaster } from '@renderer/components/ui/sonner'
import { TooltipProvider } from '@renderer/components/ui/tooltip'
import { Layout } from '@renderer/components/layout'
import { WelcomeView } from '@renderer/pages/welcome'
import { DashboardView } from '@renderer/pages/dashboard'
import { TasksView } from '@renderer/pages/tasks'
import { NavigationProvider, useNavigation } from '@renderer/hooks/use-navigation'

function App(): React.JSX.Element {
  return (
    <TooltipProvider>
      <NavigationProvider>
        <AppContent />
      </NavigationProvider>
      <Toaster />
    </TooltipProvider>
  )
}

function AppContent(): React.JSX.Element {
  const { currentView } = useNavigation()

  return (
    <Layout>
      {currentView === 'welcome' && <WelcomeView />}
      {currentView === 'dashboard' && <DashboardView />}
      {currentView === 'tasks' && <TasksView />}
    </Layout>
  )
}

export default App
