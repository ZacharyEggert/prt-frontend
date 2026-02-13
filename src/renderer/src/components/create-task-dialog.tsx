import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@renderer/components/ui/dialog'
import { TaskForm } from '@renderer/components/task-form'

interface CreateTaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateTaskDialog({ open, onOpenChange }: CreateTaskDialogProps): React.JSX.Element {
  const handleSuccess = (): void => {
    // TaskForm already shows success toast via useAddTask
    // Just close the dialog
    onOpenChange(false)
  }

  const handleCancel = (): void => {
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
          <DialogDescription>
            Add a new task to the project. Fill in the details below.
          </DialogDescription>
        </DialogHeader>

        {/* Key prop forces form reset when dialog reopens */}
        <TaskForm
          key={open ? 'open' : 'closed'}
          mode="create"
          onSuccess={handleSuccess}
          onCancel={handleCancel}
          showCancelButton={true}
        />
      </DialogContent>
    </Dialog>
  )
}
