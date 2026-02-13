import { TaskList } from '@renderer/components/task-list'
import { useTasks } from '@renderer/hooks/use-tasks'
import { Button } from '@renderer/components/ui/button'
import { Plus } from 'lucide-react'
import { toast } from '@renderer/lib/toast'

export function TasksView(): React.JSX.Element {
  const { data: tasks, isLoading, error } = useTasks()

  const handleAddTask = (): void => {
    toast.info('Add Task', 'Task creation interface coming soon')
  }

  const handleTaskClick = (taskId: string): void => {
    toast.info('Task Details', `Viewing task ${taskId}`)
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-semibold">Tasks</h1>
        <div className="text-destructive">Failed to load tasks: {error.message}</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold">Tasks</h1>
        <Button onClick={handleAddTask}>
          <Plus className="size-4 mr-2" />
          Add Task
        </Button>
      </div>

      {/* Task list */}
      <TaskList tasks={tasks || []} isLoading={isLoading} onTaskClick={handleTaskClick} />
    </div>
  )
}
