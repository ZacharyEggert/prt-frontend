import { useTasks } from '@renderer/hooks/use-tasks'
import { useAddDependency } from '@renderer/hooks/use-deps'
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem
} from '@renderer/components/ui/command'
import { Badge } from '@renderer/components/ui/badge'
import { formatLabel } from '@renderer/lib/task-utils'

interface AddDependencyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  taskId: string
  type: 'depends-on' | 'blocks'
  existingDependencies: string[]
}

export function AddDependencyDialog({
  open,
  onOpenChange,
  taskId,
  type,
  existingDependencies
}: AddDependencyDialogProps): React.JSX.Element {
  const { data: allTasks } = useTasks()
  const addDependency = useAddDependency({
    onSuccess: () => {
      onOpenChange(false)
    }
  })

  // Filter available tasks
  const availableTasks =
    allTasks?.filter(
      (task) =>
        task.id !== taskId && // Not self
        !existingDependencies.includes(task.id) // Not already added
    ) || []

  const handleSelect = (toTaskId: string): void => {
    addDependency.mutate({
      fromTaskId: taskId,
      toTaskId,
      type
    })
  }

  const title = type === 'depends-on' ? 'Add Dependency' : 'Add Blocked Task'

  const description =
    type === 'depends-on'
      ? 'Select a task that this task depends on'
      : 'Select a task that this task blocks'
  const searchLabel =
    type === 'depends-on' ? 'Search tasks to add as dependencies' : 'Search tasks to add as blocked'

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} title={title} description={description}>
      <CommandInput placeholder="Search tasks..." aria-label={searchLabel} />
      <CommandList>
        <CommandEmpty>No tasks found.</CommandEmpty>
        <CommandGroup>
          {availableTasks.map((task) => (
            <CommandItem
              key={task.id}
              value={`${task.id} ${task.title}`}
              onSelect={() => handleSelect(task.id)}
              disabled={addDependency.isPending}
            >
              <div className="flex items-center gap-2 w-full">
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">
                    {task.id}: {task.title}
                  </div>
                  <div className="flex gap-1 mt-0.5">
                    <Badge variant="outline" className="text-xs">
                      {formatLabel(task.type)}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {formatLabel(task.status)}
                    </Badge>
                  </div>
                </div>
              </div>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
