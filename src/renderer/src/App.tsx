import { useState } from 'react'
import { Toaster } from '@renderer/components/ui/sonner'
import { TooltipProvider } from '@renderer/components/ui/tooltip'
import { Layout } from '@renderer/components/layout'
import { WelcomeView } from '@renderer/pages/welcome'
import { DashboardView } from '@renderer/pages/dashboard'
import { TasksView } from '@renderer/pages/tasks'

type ViewType = 'welcome' | 'dashboard' | 'tasks'

function App(): React.JSX.Element {
  const [currentView, setCurrentView] = useState<ViewType>('welcome')

  return (
    <TooltipProvider>
      <Layout currentView={currentView} onNavigate={setCurrentView}>
        {currentView === 'welcome' && <WelcomeView />}
        {currentView === 'dashboard' && <DashboardView />}
        {currentView === 'tasks' && <TasksView />}
      </Layout>
      <Toaster />
    </TooltipProvider>
  )
}

export default App
