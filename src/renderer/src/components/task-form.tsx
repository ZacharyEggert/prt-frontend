import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { cn } from '@renderer/lib/utils'
import { useAddTask, useUpdateTask } from '@renderer/hooks/use-tasks'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@renderer/components/ui/form'
import { Input } from '@renderer/components/ui/input'
import { Textarea } from '@renderer/components/ui/textarea'
import { Button } from '@renderer/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@renderer/components/ui/select'
import type { Task, TASK_TYPE, PRIORITY } from 'project-roadmap-tracking/dist/util/types'

// Zod validation schema - validates form input as strings
const taskFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title must be less than 100 characters'),

  type: z
    .string()
    .min(1, 'Task type is required')
    .refine((val) => ['bug', 'feature', 'improvement', 'planning', 'research'].includes(val), {
      message: 'Invalid task type'
    }),

  details: z
    .string()
    .min(1, 'Details are required')
    .max(2000, 'Details must be less than 2000 characters'),

  priority: z
    .string()
    .optional()
    .refine((val) => !val || ['low', 'medium', 'high'].includes(val), {
      message: 'Invalid priority'
    }),

  tags: z.string().optional()
})

type TaskFormValues = z.infer<typeof taskFormSchema>

// Component props interface
interface TaskFormProps {
  mode: 'create' | 'edit'
  task?: Task
  onSuccess?: (task: Task) => void
  onCancel?: () => void
  className?: string
  submitLabel?: string
  showCancelButton?: boolean
}

// Helper to get default values based on mode
function getDefaultValues(mode: 'create' | 'edit', task?: Task): TaskFormValues {
  if (mode === 'edit' && task) {
    return {
      title: task.title,
      type: task.type as string,
      details: task.details,
      priority: (task.priority as string) || '',
      tags: task.tags?.join(', ') || ''
    }
  }

  // Create mode defaults
  return {
    title: '',
    type: '',
    details: '',
    priority: '',
    tags: ''
  }
}

export function TaskForm({
  mode,
  task,
  onSuccess,
  onCancel,
  className,
  submitLabel,
  showCancelButton = true
}: TaskFormProps): React.JSX.Element {
  const addTask = useAddTask()
  const updateTask = useUpdateTask()

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: getDefaultValues(mode, task),
    mode: 'onChange'
  })

  // Submit handler
  const onSubmit = async (values: TaskFormValues): Promise<void> => {
    try {
      // Transform form values to API types
      const transformedData = {
        title: values.title,
        details: values.details,
        type: values.type as TASK_TYPE,
        priority: values.priority ? (values.priority as PRIORITY) : undefined,
        tags: values.tags
          ? values.tags
              .split(',')
              .map((tag) => tag.trim())
              .filter((tag) => tag.length > 0)
          : undefined
      }

      if (mode === 'create') {
        // Create new task
        const newTask = await addTask.mutateAsync(transformedData)
        onSuccess?.(newTask)
      } else {
        // Update existing task
        if (!task) throw new Error('Task is required for edit mode')

        const updatedTask = await updateTask.mutateAsync({
          taskId: task.id,
          updates: transformedData
        })

        onSuccess?.(updatedTask)
      }
    } catch (error) {
      // Error handling is done by mutation hooks (toast shown)
      // Form remains open for user to retry
      console.error('Task form submission failed:', error)
    }
  }

  // Validation guard for edit mode
  if (mode === 'edit' && !task) {
    return <div className="text-destructive">Error: Task is required for edit mode</div>
  }

  const isSubmitting = addTask.isPending || updateTask.isPending

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className={cn('space-y-6', className)}>
        {/* Title Field */}
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title *</FormLabel>
              <FormControl>
                <Input placeholder="Brief task description" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Type Field */}
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Type *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select task type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="feature">Feature</SelectItem>
                  <SelectItem value="bug">Bug</SelectItem>
                  <SelectItem value="improvement">Improvement</SelectItem>
                  <SelectItem value="planning">Planning</SelectItem>
                  <SelectItem value="research">Research</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Details Field */}
        <FormField
          control={form.control}
          name="details"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Details *</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Provide comprehensive task details..."
                  className="min-h-32 resize-y"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Describe what needs to be done, acceptance criteria, and context.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Priority Field */}
        <FormField
          control={form.control}
          name="priority"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Priority</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || undefined}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select priority (optional)" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Tags Field */}
        <FormField
          control={form.control}
          name="tags"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tags</FormLabel>
              <FormControl>
                <Input placeholder="frontend, ui, urgent (comma-separated)" {...field} />
              </FormControl>
              <FormDescription>
                Add tags to organize and filter tasks. Separate with commas.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Action Buttons */}
        <div className="flex justify-end gap-3">
          {showCancelButton && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? mode === 'create'
                ? 'Creating...'
                : 'Updating...'
              : submitLabel || (mode === 'create' ? 'Create Task' : 'Update Task')}
          </Button>
        </div>
      </form>
    </Form>
  )
}
