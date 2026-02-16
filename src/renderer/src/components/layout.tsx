import { Home, LayoutDashboard, ListTodo, FolderOpen } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription } from '@renderer/components/ui/card'
import { ScrollArea } from '@renderer/components/ui/scroll-area'
import { Skeleton } from '@renderer/components/ui/skeleton'
import { ThemeToggle } from '@renderer/components/theme-toggle'
import { useProjectStats } from '@renderer/hooks/use-project'
import { useNavigation } from '@renderer/hooks/use-navigation'
import { cn } from '@renderer/lib/utils'
import type { RoadmapStats } from 'project-roadmap-tracking/dist/services/roadmap.service'

interface LayoutProps {
  children: React.ReactNode
}

const NAV_ITEMS = [
  { id: 'welcome' as const, label: 'Welcome', icon: Home },
  { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
  { id: 'tasks' as const, label: 'Tasks', icon: ListTodo }
]

export function Layout({ children }: LayoutProps): React.JSX.Element {
  const { currentView, navigate } = useNavigation()
  const { data: stats, isLoading } = useProjectStats()

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 flex flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
        {/* Project Indicator */}
        <div className="p-4 border-b border-sidebar-border">
          {isLoading ? <ProjectIndicatorSkeleton /> : <ProjectIndicator stats={stats} />}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4" aria-label="Main navigation">
          <ul className="space-y-1">
            {NAV_ITEMS.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => navigate(item.id)}
                  aria-current={currentView === item.id ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-3 w-full px-4 py-2.5 text-sm transition-colors',
                    'border-l-2 outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
                    currentView === item.id
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground border-sidebar-primary font-medium'
                      : 'border-transparent text-sidebar-foreground hover:bg-sidebar-accent/50'
                  )}
                >
                  <item.icon className="size-5 shrink-0" />
                  <span>{item.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer */}
        <div className="p-4 space-y-3 border-t border-sidebar-border">
          <ThemeToggle />
          <p className="text-xs text-sidebar-foreground/60 text-center">PRT Frontend</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-6">{children}</div>
        </ScrollArea>
      </main>
    </div>
  )
}

function ProjectIndicator({ stats }: { stats?: RoadmapStats }): React.JSX.Element {
  if (!stats) {
    return (
      <Card className="bg-sidebar-accent/30 border-sidebar-border">
        <CardHeader className="p-4">
          <div className="flex items-start gap-3">
            <FolderOpen className="size-5 text-sidebar-foreground/40 shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <CardTitle className="text-sm text-sidebar-foreground/60">No Project</CardTitle>
              <CardDescription className="text-xs">Open or create a project</CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className="bg-sidebar-accent/30 border-sidebar-border">
      <CardHeader className="p-4">
        <div className="flex items-start gap-3">
          <FolderOpen className="size-5 text-sidebar-primary shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <CardTitle className="text-sm truncate">Current Project</CardTitle>
            <CardDescription className="text-xs truncate">
              {stats.totalTasks} {stats.totalTasks === 1 ? 'task' : 'tasks'}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
    </Card>
  )
}

function ProjectIndicatorSkeleton(): React.JSX.Element {
  return (
    <Card className="bg-sidebar-accent/30 border-sidebar-border">
      <CardHeader className="p-4">
        <div className="flex items-start gap-3">
          <Skeleton className="size-5 shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      </CardHeader>
    </Card>
  )
}
