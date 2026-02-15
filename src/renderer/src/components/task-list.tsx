import type { Task } from 'project-roadmap-tracking/dist/util/types'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell
} from '@renderer/components/ui/table'
import { Badge } from '@renderer/components/ui/badge'
import { Skeleton } from '@renderer/components/ui/skeleton'
import { ListTodo, ChevronUp, ChevronDown } from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import {
  getStatusIcon,
  getPriorityBadgeProps,
  getTypeBadgeProps,
  getTestIcon,
  formatLabel
} from '@renderer/lib/task-utils'

interface TaskListProps {
  tasks: Task[]
  isLoading?: boolean
  onTaskClick?: (taskId: string) => void
  sortBy?: 'created' | 'updated' | 'priority' | 'status' | 'id'
  sortOrder?: 'asc' | 'desc'
  onSortChange?: (field: 'priority' | 'id') => void
}

interface SortableHeaderProps {
  label: string
  field: 'priority' | 'id'
  currentSort?: 'created' | 'updated' | 'priority' | 'status' | 'id'
  currentOrder?: 'asc' | 'desc'
  onClick: (field: 'priority' | 'id') => void
  className?: string
}

function SortableHeader({
  label,
  field,
  currentSort,
  currentOrder,
  onClick,
  className
}: SortableHeaderProps): React.JSX.Element {
  const isActive = currentSort === field

  return (
    <TableHead
      className={cn('cursor-pointer hover:bg-muted/50 select-none', className)}
      onClick={() => onClick(field)}
    >
      <div className="flex items-center gap-1">
        <span className={cn(isActive && 'font-semibold')}>{label}</span>
        {isActive && (
          <>
            {currentOrder === 'asc' ? (
              <ChevronUp className="size-4" />
            ) : (
              <ChevronDown className="size-4" />
            )}
          </>
        )}
      </div>
    </TableHead>
  )
}

export function TaskList({
  tasks,
  isLoading = false,
  onTaskClick,
  sortBy,
  sortOrder,
  onSortChange
}: TaskListProps): React.JSX.Element {
  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    )
  }

  // Empty state
  if (!tasks || tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center space-y-2">
        <ListTodo className="size-12 text-muted-foreground" />
        <h3 className="text-lg font-semibold">No tasks yet</h3>
        <p className="text-muted-foreground text-sm">Create your first task to get started</p>
      </div>
    )
  }

  // Row click handler
  const handleRowClick = (taskId: string): void => {
    if (onTaskClick) {
      onTaskClick(taskId)
    }
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10"></TableHead>
            {onSortChange ? (
              <SortableHeader
                label="Priority"
                field="priority"
                currentSort={sortBy}
                currentOrder={sortOrder}
                onClick={onSortChange}
                className="w-20"
              />
            ) : (
              <TableHead className="w-20">Priority</TableHead>
            )}
            {onSortChange ? (
              <SortableHeader
                label="ID"
                field="id"
                currentSort={sortBy}
                currentOrder={sortOrder}
                onClick={onSortChange}
                className="w-24"
              />
            ) : (
              <TableHead className="w-24">ID</TableHead>
            )}
            <TableHead>Title</TableHead>
            <TableHead className="w-24">Type</TableHead>
            <TableHead className="w-16 text-center">Tests</TableHead>
            <TableHead className="w-20 text-center">Deps</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((task) => {
            const priorityBadge = getPriorityBadgeProps(task.priority)
            const typeBadge = getTypeBadgeProps(task.type)
            const dependencyCount = task['depends-on']?.length || 0

            return (
              <TableRow
                key={task.id}
                className="cursor-pointer hover:bg-muted/70 transition-colors"
                onClick={() => handleRowClick(task.id)}
              >
                {/* Status Icon */}
                <TableCell>{getStatusIcon(task.status)}</TableCell>

                {/* Priority Badge */}
                <TableCell>
                  <Badge variant={priorityBadge.variant} className={cn(priorityBadge.className)}>
                    {formatLabel(task.priority)}
                  </Badge>
                </TableCell>

                {/* Task ID */}
                <TableCell className="font-mono text-sm">{task.id}</TableCell>

                {/* Title */}
                <TableCell className="max-w-100 truncate">{task.title}</TableCell>

                {/* Type Badge */}
                <TableCell>
                  <Badge variant={typeBadge.variant} className={cn(typeBadge.className)}>
                    {formatLabel(task.type)}
                  </Badge>
                </TableCell>

                {/* Test Status */}
                <TableCell className="text-center">{getTestIcon(task['passes-tests'])}</TableCell>

                {/* Dependency Count */}
                <TableCell className="text-center">
                  <span className="text-sm text-muted-foreground">{dependencyCount}</span>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
