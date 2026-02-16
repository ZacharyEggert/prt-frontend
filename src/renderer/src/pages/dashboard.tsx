import { useState } from 'react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent
} from '@renderer/components/ui/card'
import { Button } from '@renderer/components/ui/button'
import { Skeleton } from '@renderer/components/ui/skeleton'
import { FeedbackState } from '@renderer/components/ui/feedback-state'
import { ProjectStats } from '@renderer/components/project-stats'
import {
  useProjectStats,
  useProjectMetadata,
  useProjectValidation
} from '@renderer/hooks/use-project'
import { useNavigation } from '@renderer/hooks/use-navigation'
import { Plus, List, CheckCircle, AlertCircle } from 'lucide-react'
import { toast } from '@renderer/lib/toast'
import { getErrorCopy, RETRY_LABEL } from '@renderer/lib/error-copy'
import { CreateTaskDialog } from '@renderer/components/create-task-dialog'
import { ValidationPanel } from '@renderer/components/validation-panel'
import { DependencyGraph } from '@renderer/components/dependency-graph'
import type { ProjectValidationResult } from '../../../preload/index'

export function DashboardView(): React.JSX.Element {
  const { navigate } = useNavigation()
  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
    refetch: refetchStats
  } = useProjectStats()
  const {
    data: metadata,
    isLoading: metadataLoading,
    error: metadataError,
    refetch: refetchMetadata
  } = useProjectMetadata()
  const { refetch: validateProject, isFetching: isValidating } = useProjectValidation()
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [validationResult, setValidationResult] = useState<ProjectValidationResult | null>(null)

  const isLoading = statsLoading || metadataLoading

  const handleValidate = (): void => {
    validateProject().then((result) => {
      if (result.data) {
        setValidationResult(result.data)
        if (result.data.success) {
          toast.success('Validation Passed', 'Project structure is valid')
        } else if (result.data.errors) {
          const copy = getErrorCopy('validationFailedToast')
          toast.error(copy.title, copy.description)
        }
      }
    })
  }

  const handleTaskIdClick = (
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _taskId: string
  ): void => {
    // Navigate to tasks page (task pre-selection is a future enhancement)
    navigate('tasks')
  }

  const handleAddTask = (): void => {
    setIsCreateDialogOpen(true)
  }

  const handleViewTasks = (): void => {
    navigate('tasks')
  }

  if (isLoading) {
    return <DashboardSkeleton />
  }

  if (statsError || metadataError || !stats || !metadata) {
    const copy = getErrorCopy('dashboardLoad')

    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <FeedbackState
          variant="error"
          title={copy.title}
          description={copy.description}
          icon={<AlertCircle className="size-10" />}
          primaryAction={{
            label: RETRY_LABEL,
            onClick: () => {
              void refetchStats()
              void refetchMetadata()
            }
          }}
        />
      </div>
    )
  }

  const completionPercentage =
    stats.totalTasks > 0 ? Math.round((stats.byStatus.completed / stats.totalTasks) * 100) : 0

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Project Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold">{metadata.name}</h1>
        <p className="text-muted-foreground">{metadata.description}</p>
      </div>

      {/* Completion Progress Card */}
      <Card>
        <CardHeader>
          <CardTitle>Progress</CardTitle>
          <CardDescription>Overall project completion</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {stats.byStatus.completed} of {stats.totalTasks} tasks completed
              </span>
              <span className="font-medium">{completionPercentage}%</span>
            </div>
            {/* Simple progress bar using divs */}
            <div className="w-full h-2 bg-accent rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${completionPercentage}%` }}
                role="progressbar"
                aria-label="Project completion"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={completionPercentage}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid - Reuse existing ProjectStats component */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Statistics</h2>
        <ProjectStats stats={stats} />
      </div>

      {/* Validation Status */}
      {validationResult && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Validation Status</h2>
          <ValidationPanel validationResult={validationResult} onTaskClick={handleTaskIdClick} />
        </div>
      )}

      {/* Dependency Graph */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Dependency Graph</h2>
        <Card>
          <CardContent className="pt-6">
            <DependencyGraph
              height={500}
              onTaskClick={handleTaskIdClick}
              showIsolatedTasks={false}
              onCreateTask={handleAddTask}
            />
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Button onClick={handleAddTask} className="h-auto py-4 flex flex-col items-center gap-2">
            <Plus className="size-5" />
            <span>Add Task</span>
          </Button>

          <Button
            onClick={handleViewTasks}
            variant="outline"
            className="h-auto py-4 flex flex-col items-center gap-2"
          >
            <List className="size-5" />
            <span>View Tasks</span>
          </Button>

          <Button
            onClick={handleValidate}
            disabled={isValidating}
            variant="outline"
            className="h-auto py-4 flex flex-col items-center gap-2"
          >
            <CheckCircle className="size-5" />
            <span>{isValidating ? 'Validating...' : 'Validate'}</span>
          </Button>
        </div>
      </div>

      {/* Create task dialog */}
      <CreateTaskDialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen} />
    </div>
  )
}

function DashboardSkeleton(): React.JSX.Element {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-5 w-96" />
      </div>

      {/* Progress Card Skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-12" />
            </div>
            <Skeleton className="h-2 w-full" />
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid Skeleton */}
      <div>
        <Skeleton className="h-7 w-32 mb-4" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-20" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[1, 2, 3].map((j) => (
                    <div key={j} className="flex justify-between">
                      <Skeleton className="h-5 w-24" />
                      <Skeleton className="h-5 w-8" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Quick Actions Skeleton */}
      <div>
        <Skeleton className="h-7 w-32 mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    </div>
  )
}
