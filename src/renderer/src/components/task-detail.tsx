import { useState } from 'react'
import { useTask, useCompleteTask, usePassTest, useDeleteTask } from '@renderer/hooks/use-tasks'
import { useTaskDeps, useRemoveDependency } from '@renderer/hooks/use-deps'
import type { Task } from 'project-roadmap-tracking/dist/util/types'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter
} from '@renderer/components/ui/sheet'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@renderer/components/ui/alert-dialog'
import { Badge } from '@renderer/components/ui/badge'
import { Button } from '@renderer/components/ui/button'
import { Separator } from '@renderer/components/ui/separator'
import { ScrollArea } from '@renderer/components/ui/scroll-area'
import { Skeleton } from '@renderer/components/ui/skeleton'
import { FeedbackState } from '@renderer/components/ui/feedback-state'
import { TaskForm } from '@renderer/components/task-form'
import { AddDependencyDialog } from '@renderer/components/add-dependency-dialog'
import { Edit, Check, TestTube, Trash2, AlertCircle, ArrowRight, Lock, Plus, X } from 'lucide-react'
import {
  getStatusBadgeProps,
  getTypeBadgeProps,
  getPriorityBadgeProps,
  getTestIcon,
  formatLabel,
  formatDate,
  formatDateShort
} from '@renderer/lib/task-utils'
import { toast } from '@renderer/lib/toast'
import { getErrorCopy, RETRY_LABEL } from '@renderer/lib/error-copy'

interface TaskDetailProps {
  taskId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onTaskChange?: (taskId: string) => void
}

interface DependencyItemProps {
  task: Task
  onClick?: () => void
  clickable?: boolean
  onRemove?: () => void
  isRemoving?: boolean
  removeLabel?: string
}

function DependencyItem({
  task,
  onClick,
  clickable = true,
  onRemove,
  isRemoving = false,
  removeLabel
}: DependencyItemProps): React.JSX.Element {
  if (clickable && onClick) {
    return (
      <div className="flex items-center gap-2 justify-between group">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <ArrowRight className="size-3 text-muted-foreground" />
          <Button
            type="button"
            variant="link"
            size="sm"
            className="h-auto p-0 text-[13px] md:text-sm truncate"
            onClick={onClick}
          >
            {task.id}: {task.title}
          </Button>
        </div>
        {onRemove && (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={onRemove}
            disabled={isRemoving}
            className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 transition-opacity text-muted-foreground hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={removeLabel ?? `Remove relationship with ${task.id}`}
          >
            <X className="size-3" />
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 justify-between group">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <Lock className="size-3 text-muted-foreground" />
        <span className="text-[13px] md:text-sm truncate">
          {task.id}: {task.title}
        </span>
      </div>
      {onRemove && (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={onRemove}
          disabled={isRemoving}
          className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 transition-opacity text-muted-foreground hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={removeLabel ?? `Remove relationship with ${task.id}`}
        >
          <X className="size-3" />
        </Button>
      )}
    </div>
  )
}

export function TaskDetail({
  taskId,
  open,
  onOpenChange,
  onTaskChange
}: TaskDetailProps): React.JSX.Element {
  const [isEditMode, setIsEditMode] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isAddDepDialogOpen, setIsAddDepDialogOpen] = useState(false)
  const [addDepType, setAddDepType] = useState<'depends-on' | 'blocks'>('depends-on')
  const [isRemoveDepDialogOpen, setIsRemoveDepDialogOpen] = useState(false)
  const [dependencyToRemove, setDependencyToRemove] = useState<{
    taskId: string
    taskTitle: string
    type: 'depends-on' | 'blocks'
  } | null>(null)

  // Query hooks
  const {
    data: task,
    isLoading: isTaskLoading,
    error: taskError,
    refetch: refetchTask
  } = useTask(taskId || '')

  // Mutation hooks
  const completeTask = useCompleteTask()
  const passTest = usePassTest()
  const deleteTask = useDeleteTask()
  const removeDependency = useRemoveDependency({
    onSuccess: (result) => {
      toast.success('Dependency removed', `Updated ${result.updatedTasks.length} tasks`)
      setIsRemoveDepDialogOpen(false)
      setDependencyToRemove(null)
    },
    onError: () => {
      const copy = getErrorCopy('dependencyRemoveFailed')
      toast.error(copy.title, copy.description)
    }
  })

  // Dependency hooks
  const {
    data: deps,
    isLoading: isDepsLoading,
    error: depsError,
    refetch: refetchDeps
  } = useTaskDeps(taskId || '')

  // Event handlers
  const handleEdit = (): void => {
    setIsEditMode(true)
  }

  const handleCancelEdit = (): void => {
    setIsEditMode(false)
  }

  const handleEditSuccess = (): void => {
    // TaskForm mutation already shows toast
    setIsEditMode(false)
  }

  const handleComplete = async (): Promise<void> => {
    if (!taskId) return
    await completeTask.mutateAsync(taskId)
  }

  const handlePassTest = async (): Promise<void> => {
    if (!taskId) return
    await passTest.mutateAsync(taskId)
  }

  const handleDelete = async (): Promise<void> => {
    if (!taskId) return

    try {
      await deleteTask.mutateAsync(taskId)
      // Auto-close sheet after successful delete
      onOpenChange(false)
      setIsDeleteDialogOpen(false)
    } catch {
      // Error already handled by mutation hook
      // Sheet stays open
    }
  }

  const handleOpenChange = (newOpen: boolean): void => {
    // Reset edit mode when closing
    if (!newOpen) {
      setIsEditMode(false)
    }
    onOpenChange(newOpen)
  }

  const handleDependencyClick = (depTaskId: string): void => {
    if (onTaskChange) {
      onTaskChange(depTaskId)
    }
  }

  const handleAddDependency = (): void => {
    setAddDepType('depends-on')
    setIsAddDepDialogOpen(true)
  }

  const handleAddBlocked = (): void => {
    setAddDepType('blocks')
    setIsAddDepDialogOpen(true)
  }

  const handleRemoveDependency = (
    depTaskId: string,
    depTaskTitle: string,
    type: 'depends-on' | 'blocks'
  ): void => {
    setDependencyToRemove({
      taskId: depTaskId,
      taskTitle: depTaskTitle,
      type
    })
    setIsRemoveDepDialogOpen(true)
  }

  const handleConfirmRemoveDependency = async (): Promise<void> => {
    if (!taskId || !dependencyToRemove) return

    await removeDependency.mutateAsync({
      fromTaskId: taskId,
      toTaskId: dependencyToRemove.taskId,
      type: dependencyToRemove.type
    })
  }

  // Loading state
  if (isTaskLoading) {
    return (
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent className="w-full sm:max-w-sm">
          <SheetHeader>
            <SheetTitle className="sr-only">Loading task details</SheetTitle>
            <SheetDescription className="sr-only">
              Task details are loading. Please wait.
            </SheetDescription>
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-4 w-32" />
          </SheetHeader>
          <div className="space-y-4 p-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  // Error state
  if (taskError && taskId) {
    const copy = getErrorCopy('taskDetailLoad')

    return (
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent className="w-full sm:max-w-sm">
          <SheetHeader>
            <SheetTitle>Error Loading Task</SheetTitle>
            <SheetDescription className="sr-only">
              The selected task could not be loaded.
            </SheetDescription>
          </SheetHeader>
          <div className="p-4 space-y-3">
            <FeedbackState
              variant="error"
              title={copy.title}
              description={copy.description}
              icon={<AlertCircle className="size-10" />}
              primaryAction={{ label: RETRY_LABEL, onClick: () => void refetchTask() }}
              secondaryAction={{ label: 'Close', onClick: () => onOpenChange(false) }}
            />
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  // No task selected
  if (!taskId || !task) {
    return (
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent className="w-full sm:max-w-sm">
          <SheetHeader>
            <SheetTitle>No Task Selected</SheetTitle>
            <SheetDescription className="sr-only">
              No task is selected in the task list.
            </SheetDescription>
          </SheetHeader>
          <div className="p-4">
            <p className="text-muted-foreground text-sm">
              Select a task from the list to view details.
            </p>
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  // Edit mode: Show form instead of details
  if (isEditMode) {
    return (
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Edit Task</SheetTitle>
            <SheetDescription>Modify task details below</SheetDescription>
          </SheetHeader>

          <ScrollArea className="h-[calc(100vh-8rem)] px-4">
            <TaskForm
              mode="edit"
              task={task}
              onSuccess={handleEditSuccess}
              onCancel={handleCancelEdit}
              showCancelButton={true}
            />
          </ScrollArea>
        </SheetContent>
      </Sheet>
    )
  }

  // View mode: Show task details
  const isCompleted = task.status === 'completed'
  const testsPassing = task['passes-tests']
  const anyMutationPending =
    completeTask.isPending ||
    passTest.isPending ||
    deleteTask.isPending ||
    removeDependency.isPending
  const dependencyErrorCopy = getErrorCopy('dependencyListLoad')
  const dependenciesReady = Boolean(deps) && !isDepsLoading && !depsError

  return (
    <>
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent className="flex w-full flex-col sm:max-w-sm">
          <SheetHeader>
            <SheetTitle className="text-base md:text-lg break-words pr-8">
              {task.id}: {task.title}
            </SheetTitle>
            <SheetDescription className="text-xs md:text-sm">
              {formatLabel(task.type)} • {formatLabel(task.status)}
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="flex-1 -mx-4 px-4">
            <div className="space-y-4 pb-4">
              {/* Status Badges */}
              <div className="flex flex-wrap gap-2">
                <Badge {...getStatusBadgeProps(task.status)}>{formatLabel(task.status)}</Badge>
                <Badge {...getPriorityBadgeProps(task.priority)}>
                  Priority: {formatLabel(task.priority)}
                </Badge>
                <Badge {...getTypeBadgeProps(task.type)}>{formatLabel(task.type)}</Badge>
                <Badge
                  variant={testsPassing ? 'outline' : 'destructive'}
                  className="flex items-center gap-1"
                >
                  {getTestIcon(testsPassing)}
                  <span>Tests: {testsPassing ? 'Passing' : 'Failing'}</span>
                </Badge>
              </div>

              <Separator />

              {/* Details */}
              <div className="space-y-2">
                <h3 className="text-xs md:text-sm font-semibold">Details</h3>
                <p className="text-[13px] md:text-sm whitespace-pre-wrap">{task.details}</p>
              </div>

              <Separator />

              {/* Metadata Grid */}
              <div className="space-y-2">
                <h3 className="text-xs md:text-sm font-semibold">Metadata</h3>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[13px] md:text-sm">
                  <dt className="text-muted-foreground">Created:</dt>
                  <dd>{formatDate(task.createdAt)}</dd>

                  <dt className="text-muted-foreground">Updated:</dt>
                  <dd>{formatDate(task.updatedAt)}</dd>

                  <dt className="text-muted-foreground">Due Date:</dt>
                  <dd>{formatDateShort(task.dueDate)}</dd>

                  {task.assignedTo && (
                    <>
                      <dt className="text-muted-foreground">Assigned:</dt>
                      <dd>{task.assignedTo}</dd>
                    </>
                  )}

                  {task.effort && (
                    <>
                      <dt className="text-muted-foreground">Effort:</dt>
                      <dd>{task.effort}</dd>
                    </>
                  )}
                </dl>
              </div>

              {/* Tags */}
              {task.tags && task.tags.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <h3 className="text-xs md:text-sm font-semibold">Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {task.tags.map((tag) => (
                        <Badge key={tag} variant="outline">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Dependencies - Always show header with Add button */}
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs md:text-sm font-semibold">
                    Dependencies {dependenciesReady ? `(${deps?.dependsOn.length ?? 0})` : '(...)'}
                  </h3>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleAddDependency}
                    className="h-7 px-2"
                    disabled={isDepsLoading || Boolean(depsError)}
                  >
                    <Plus className="size-3 mr-1" />
                    Add
                  </Button>
                </div>
                {isDepsLoading ? (
                  <div className="space-y-2 py-1" aria-live="polite">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                  </div>
                ) : depsError ? (
                  <FeedbackState
                    variant="error"
                    title={dependencyErrorCopy.title}
                    description={dependencyErrorCopy.description}
                    icon={<AlertCircle className="size-8" />}
                    className="p-4"
                    primaryAction={{ label: RETRY_LABEL, onClick: () => void refetchDeps() }}
                  />
                ) : deps?.dependsOn && deps.dependsOn.length > 0 ? (
                  <div className="space-y-1">
                    {deps.dependsOn.map((depTask) => (
                      <DependencyItem
                        key={depTask.id}
                        task={depTask}
                        onClick={() => handleDependencyClick(depTask.id)}
                        clickable={true}
                        onRemove={() =>
                          handleRemoveDependency(depTask.id, depTask.title, 'depends-on')
                        }
                        isRemoving={removeDependency.isPending}
                        removeLabel={`Remove dependency on ${depTask.id}: ${depTask.title}`}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No dependencies</p>
                )}
              </div>

              {/* Blocks - Always show header with Add button */}
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs md:text-sm font-semibold">
                    Blocks {dependenciesReady ? `(${deps?.blocks.length ?? 0})` : '(...)'}
                  </h3>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleAddBlocked}
                    className="h-7 px-2"
                    disabled={isDepsLoading || Boolean(depsError)}
                  >
                    <Plus className="size-3 mr-1" />
                    Add
                  </Button>
                </div>
                {isDepsLoading ? (
                  <div className="space-y-2 py-1" aria-live="polite">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                  </div>
                ) : depsError ? (
                  <FeedbackState
                    variant="error"
                    title={dependencyErrorCopy.title}
                    description={dependencyErrorCopy.description}
                    icon={<AlertCircle className="size-8" />}
                    className="p-4"
                    primaryAction={{ label: RETRY_LABEL, onClick: () => void refetchDeps() }}
                  />
                ) : deps?.blocks && deps.blocks.length > 0 ? (
                  <div className="space-y-1">
                    {deps.blocks.map((blockTask) => (
                      <DependencyItem
                        key={blockTask.id}
                        task={blockTask}
                        clickable={false}
                        onRemove={() =>
                          handleRemoveDependency(blockTask.id, blockTask.title, 'blocks')
                        }
                        isRemoving={removeDependency.isPending}
                        removeLabel={`Remove blocked task ${blockTask.id}: ${blockTask.title}`}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No blocked tasks</p>
                )}
              </div>

              {/* Notes */}
              {task.notes && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <h3 className="text-xs md:text-sm font-semibold">Notes</h3>
                    <p className="text-[13px] md:text-sm whitespace-pre-wrap text-muted-foreground">
                      {task.notes}
                    </p>
                  </div>
                </>
              )}

              {/* GitHub References */}
              {task['github-refs'] && task['github-refs'].length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <h3 className="text-xs md:text-sm font-semibold">GitHub References</h3>
                    <div className="space-y-1">
                      {task['github-refs'].map((ref) => (
                        <div key={ref} className="text-[13px] md:text-sm font-mono break-all">
                          {ref}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </ScrollArea>

          <SheetFooter className="flex-col gap-2">
            {/* Action Buttons Row 1 */}
            <div className="flex w-full flex-col gap-2 sm:flex-row">
              <Button
                variant="outline"
                className="w-full sm:flex-1"
                onClick={handleEdit}
                disabled={anyMutationPending}
              >
                <Edit className="size-4 mr-2" />
                Edit
              </Button>

              <Button
                variant={isCompleted ? 'outline' : 'default'}
                className="w-full sm:flex-1"
                onClick={handleComplete}
                disabled={isCompleted || anyMutationPending}
              >
                <Check className="size-4 mr-2" />
                {completeTask.isPending ? 'Completing...' : isCompleted ? 'Completed' : 'Complete'}
              </Button>
            </div>

            {/* Action Buttons Row 2 */}
            <div className="flex w-full flex-col gap-2 sm:flex-row">
              <Button
                variant={testsPassing ? 'outline' : 'secondary'}
                className="w-full sm:flex-1"
                onClick={handlePassTest}
                disabled={testsPassing || anyMutationPending}
              >
                <TestTube className="size-4 mr-2" />
                {passTest.isPending ? 'Updating...' : testsPassing ? 'Tests Pass' : 'Pass Test'}
              </Button>

              <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    className="w-full sm:flex-1"
                    disabled={anyMutationPending}
                  >
                    <Trash2 className="size-4 mr-2" />
                    Delete
                  </Button>
                </AlertDialogTrigger>

                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Task?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete &quot;{task.title}&quot; ({task.id}) and remove
                      all references from other tasks. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>

                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>
                      {deleteTask.isPending ? 'Deleting...' : 'Delete Task'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Add Dependency Dialog */}
      {taskId && deps && (
        <AddDependencyDialog
          open={isAddDepDialogOpen}
          onOpenChange={setIsAddDepDialogOpen}
          taskId={taskId}
          type={addDepType}
          existingDependencies={
            addDepType === 'depends-on'
              ? deps.dependsOn.map((t) => t.id)
              : deps.blocks.map((t) => t.id)
          }
        />
      )}

      {/* Remove Dependency Confirmation Dialog */}
      <AlertDialog open={isRemoveDepDialogOpen} onOpenChange={setIsRemoveDepDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Dependency?</AlertDialogTitle>
            <AlertDialogDescription>
              {dependencyToRemove && (
                <>
                  {dependencyToRemove.type === 'depends-on'
                    ? `Remove dependency on "${dependencyToRemove.taskTitle}"? This will also remove the reverse 'blocks' relationship.`
                    : `Remove blocking relationship with "${dependencyToRemove.taskTitle}"? This will also remove the reverse 'depends-on' relationship.`}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRemoveDependency} variant="destructive">
              {removeDependency.isPending ? 'Removing...' : 'Remove Dependency'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
