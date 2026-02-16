import { Home, LayoutDashboard, ListTodo, FolderOpen } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription } from '@renderer/components/ui/card'
import { ScrollArea } from '@renderer/components/ui/scroll-area'
import { Skeleton } from '@renderer/components/ui/skeleton'
import { Button } from '@renderer/components/ui/button'
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
      <aside className="w-16 md:w-64 flex shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
        {/* Project Indicator */}
        <div className="hidden border-b border-sidebar-border p-4 md:block">
          {isLoading ? (
            <ProjectIndicatorSkeleton />
          ) : (
            <ProjectIndicator stats={stats} onOpenProject={() => navigate('welcome')} />
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-3 md:py-4" aria-label="Main navigation">
          <ul className="space-y-1 px-1 md:px-0">
            {NAV_ITEMS.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => navigate(item.id)}
                  aria-label={item.label}
                  aria-current={currentView === item.id ? 'page' : undefined}
                  className={cn(
                    'flex w-full items-center justify-center gap-0 px-0 py-2.5 text-sm transition-colors md:justify-start md:gap-3 md:px-4',
                    'border-l-2 outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
                    currentView === item.id
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground border-sidebar-primary font-medium'
                      : 'border-transparent text-sidebar-foreground hover:bg-sidebar-accent/50'
                  )}
                  title={item.label}
                >
                  <item.icon className="size-5 shrink-0" />
                  <span className="hidden md:inline">{item.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer */}
        <div className="border-t border-sidebar-border p-2 md:p-4">
          <ThemeToggle />
          <p className="mt-3 hidden text-center text-xs text-sidebar-foreground/60 md:block">
            PRT Frontend
          </p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-4 md:p-6">{children}</div>
        </ScrollArea>
      </main>
    </div>
  )
}

function ProjectIndicator({
  stats,
  onOpenProject
}: {
  stats?: RoadmapStats
  onOpenProject: () => void
}): React.JSX.Element {
  if (!stats) {
    return (
      <Card className="bg-sidebar-accent/30 border-sidebar-border">
        <CardHeader className="p-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <FolderOpen className="size-5 text-sidebar-foreground/40 shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <CardTitle className="text-sm text-sidebar-foreground/60">No Project</CardTitle>
                <CardDescription className="text-xs">Open or create a project</CardDescription>
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="w-full"
              onClick={onOpenProject}
            >
              Open or Create Project
            </Button>
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
