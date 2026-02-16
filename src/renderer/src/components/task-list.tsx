import { useRef, useState } from 'react'
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
  const ariaSort = isActive ? (currentOrder === 'asc' ? 'ascending' : 'descending') : 'none'

  return (
    <TableHead className={cn('select-none', className)} aria-sort={ariaSort}>
      <button
        type="button"
        className={cn(
          'flex w-full items-center gap-1 rounded-sm px-1 py-1 text-left hover:bg-muted/50',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          isActive && 'font-semibold'
        )}
        onClick={() => onClick(field)}
        aria-label={`Sort by ${label}`}
      >
        <span>{label}</span>
        {isActive &&
          (currentOrder === 'asc' ? (
            <ChevronUp className="size-4" />
          ) : (
            <ChevronDown className="size-4" />
          ))}
      </button>
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
  const isInteractive = Boolean(onTaskClick)
  const [focusedRowId, setFocusedRowId] = useState<string | null>(null)
  const rowRefs = useRef<Array<HTMLTableRowElement | null>>([])
  const focusedRowIndex = tasks.findIndex((task) => task.id === focusedRowId)
  const activeRowIndex = focusedRowIndex >= 0 ? focusedRowIndex : 0

  const focusRow = (nextIndex: number): void => {
    if (!isInteractive || tasks.length === 0) return

    const boundedIndex = Math.min(Math.max(nextIndex, 0), tasks.length - 1)
    setFocusedRowId(tasks[boundedIndex]?.id ?? null)
    rowRefs.current[boundedIndex]?.focus()
  }

  const handleRowKeyDown = (
    event: React.KeyboardEvent<HTMLTableRowElement>,
    rowIndex: number,
    taskId: string
  ): void => {
    if (!isInteractive) return

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        focusRow(rowIndex + 1)
        break
      case 'ArrowUp':
        event.preventDefault()
        focusRow(rowIndex - 1)
        break
      case 'Home':
        event.preventDefault()
        focusRow(0)
        break
      case 'End':
        event.preventDefault()
        focusRow(tasks.length - 1)
        break
      case 'Enter':
      case 'Space':
      case 'Spacebar':
      case ' ':
        event.preventDefault()
        handleRowClick(taskId)
        break
      default:
        break
    }
  }

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
            <TableHead className="w-10">
              <span className="sr-only">Status</span>
            </TableHead>
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
          {tasks.map((task, index) => {
            const priorityBadge = getPriorityBadgeProps(task.priority)
            const typeBadge = getTypeBadgeProps(task.type)
            const dependencyCount = task['depends-on']?.length || 0

            return (
              <TableRow
                key={task.id}
                ref={(row) => {
                  rowRefs.current[index] = row
                }}
                className={cn(
                  isInteractive && 'cursor-pointer hover:bg-muted/70',
                  isInteractive &&
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                  'transition-colors'
                )}
                onClick={isInteractive ? () => handleRowClick(task.id) : undefined}
                onKeyDown={
                  isInteractive ? (event) => handleRowKeyDown(event, index, task.id) : undefined
                }
                onFocus={isInteractive ? () => setFocusedRowId(task.id) : undefined}
                tabIndex={isInteractive ? (index === activeRowIndex ? 0 : -1) : undefined}
                aria-label={isInteractive ? `Open task ${task.id}: ${task.title}` : undefined}
                data-task-row-id={task.id}
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
