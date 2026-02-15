import { useState } from 'react'
import { useTask, useCompleteTask, usePassTest, useDeleteTask } from '@renderer/hooks/use-tasks'
import { useTaskDeps } from '@renderer/hooks/use-deps'
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
import { TaskForm } from '@renderer/components/task-form'
import { AddDependencyDialog } from '@renderer/components/add-dependency-dialog'
import { Edit, Check, TestTube, Trash2, AlertCircle, ArrowRight, Lock, Plus } from 'lucide-react'
import {
  getStatusBadgeProps,
  getTypeBadgeProps,
  getPriorityBadgeProps,
  getTestIcon,
  formatLabel,
  formatDate,
  formatDateShort
} from '@renderer/lib/task-utils'

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
}

function DependencyItem({
  task,
  onClick,
  clickable = true
}: DependencyItemProps): React.JSX.Element {
  if (clickable && onClick) {
    return (
      <div className="flex items-center gap-2">
        <ArrowRight className="size-3 text-muted-foreground" />
        <Button variant="link" size="sm" className="h-auto p-0 text-sm" onClick={onClick}>
          {task.id}: {task.title}
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Lock className="size-3 text-muted-foreground" />
      <span className="text-sm">
        {task.id}: {task.title}
      </span>
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

  // Query hooks
  const { data: task, isLoading: isTaskLoading, error: taskError } = useTask(taskId || '')

  // Mutation hooks
  const completeTask = useCompleteTask()
  const passTest = usePassTest()
  const deleteTask = useDeleteTask()

  // Dependency hooks
  const { data: deps } = useTaskDeps(taskId || '')

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

  // Loading state
  if (isTaskLoading) {
    return (
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent>
          <SheetHeader>
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
    return (
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Error Loading Task</SheetTitle>
          </SheetHeader>
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="size-4" />
              <p className="text-sm">{taskError.message}</p>
            </div>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  // No task selected
  if (!taskId || !task) {
    return (
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>No Task Selected</SheetTitle>
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
        <SheetContent className="sm:max-w-lg">
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
  const anyMutationPending = completeTask.isPending || passTest.isPending || deleteTask.isPending

  return (
    <>
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent className="flex flex-col">
          <SheetHeader>
            <SheetTitle className="text-lg">
              {task.id}: {task.title}
            </SheetTitle>
            <SheetDescription>
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
                <h3 className="text-sm font-semibold">Details</h3>
                <p className="text-sm whitespace-pre-wrap">{task.details}</p>
              </div>

              <Separator />

              {/* Metadata Grid */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Metadata</h3>
                <dl className="grid grid-cols-2 gap-2 text-sm">
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
                    <h3 className="text-sm font-semibold">Tags</h3>
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
                  <h3 className="text-sm font-semibold">
                    Dependencies {deps?.dependsOn?.length ? `(${deps.dependsOn.length})` : '(0)'}
                  </h3>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleAddDependency}
                    className="h-7 px-2"
                  >
                    <Plus className="size-3 mr-1" />
                    Add
                  </Button>
                </div>
                {deps?.dependsOn && deps.dependsOn.length > 0 ? (
                  <div className="space-y-1">
                    {deps.dependsOn.map((depTask) => (
                      <DependencyItem
                        key={depTask.id}
                        task={depTask}
                        onClick={() => handleDependencyClick(depTask.id)}
                        clickable={true}
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
                  <h3 className="text-sm font-semibold">
                    Blocks {deps?.blocks?.length ? `(${deps.blocks.length})` : '(0)'}
                  </h3>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleAddBlocked}
                    className="h-7 px-2"
                  >
                    <Plus className="size-3 mr-1" />
                    Add
                  </Button>
                </div>
                {deps?.blocks && deps.blocks.length > 0 ? (
                  <div className="space-y-1">
                    {deps.blocks.map((blockTask) => (
                      <DependencyItem key={blockTask.id} task={blockTask} clickable={false} />
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
                    <h3 className="text-sm font-semibold">Notes</h3>
                    <p className="text-sm whitespace-pre-wrap text-muted-foreground">
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
                    <h3 className="text-sm font-semibold">GitHub References</h3>
                    <div className="space-y-1">
                      {task['github-refs'].map((ref) => (
                        <div key={ref} className="text-sm font-mono">
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
            <div className="flex gap-2 w-full">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleEdit}
                disabled={anyMutationPending}
              >
                <Edit className="size-4 mr-2" />
                Edit
              </Button>

              <Button
                variant={isCompleted ? 'outline' : 'default'}
                className="flex-1"
                onClick={handleComplete}
                disabled={isCompleted || anyMutationPending}
              >
                <Check className="size-4 mr-2" />
                {completeTask.isPending ? 'Completing...' : isCompleted ? 'Completed' : 'Complete'}
              </Button>
            </div>

            {/* Action Buttons Row 2 */}
            <div className="flex gap-2 w-full">
              <Button
                variant={testsPassing ? 'outline' : 'secondary'}
                className="flex-1"
                onClick={handlePassTest}
                disabled={testsPassing || anyMutationPending}
              >
                <TestTube className="size-4 mr-2" />
                {passTest.isPending ? 'Updating...' : testsPassing ? 'Tests Pass' : 'Pass Test'}
              </Button>

              <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="flex-1" disabled={anyMutationPending}>
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
    </>
  )
}
