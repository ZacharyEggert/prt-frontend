import { useRef, useState } from 'react'
import { TaskList } from '@renderer/components/task-list'
import { TaskDetail } from '@renderer/components/task-detail'
import { FilterBar } from '@renderer/components/filter-bar'
import { SearchBar } from '@renderer/components/search-bar'
import { useTasks } from '@renderer/hooks/use-tasks'
import { Button } from '@renderer/components/ui/button'
import { FeedbackState } from '@renderer/components/ui/feedback-state'
import { getErrorCopy, RETRY_LABEL } from '@renderer/lib/error-copy'
import { Plus, AlertCircle } from 'lucide-react'
import { CreateTaskDialog } from '@renderer/components/create-task-dialog'
import type { STATUS, TASK_TYPE, PRIORITY } from 'project-roadmap-tracking/dist/util/types'
import type { ListOptions } from '../../../preload/index'

export function TasksView(): React.JSX.Element {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const createDialogFocusReturnRef = useRef<HTMLElement | null>(null)
  const detailSheetFocusReturnRef = useRef<HTMLElement | null>(null)
  const detailSheetFocusTaskIdRef = useRef<string | null>(null)
  const [filters, setFilters] = useState<{
    status?: STATUS | STATUS[]
    type?: TASK_TYPE | TASK_TYPE[]
    priority?: PRIORITY | PRIORITY[]
  }>({})
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [sortBy, setSortBy] = useState<'created' | 'updated' | 'priority' | 'status' | 'id'>()
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  const isDetailOpen = selectedTaskId !== null

  // Combine filters, search, and sorting into ListOptions
  const listOptions: ListOptions = {
    status: filters.status,
    type: filters.type,
    priority: filters.priority,
    search: searchQuery || undefined,
    sortBy,
    sortOrder
  }

  const { data: tasks, isLoading, error, refetch: refetchTasks } = useTasks(listOptions)

  const handleAddTask = (): void => {
    const activeElement = document.activeElement
    createDialogFocusReturnRef.current = activeElement instanceof HTMLElement ? activeElement : null
    setIsCreateDialogOpen(true)
  }

  const handleTaskClick = (taskId: string): void => {
    const activeElement = document.activeElement
    detailSheetFocusReturnRef.current = activeElement instanceof HTMLElement ? activeElement : null
    detailSheetFocusTaskIdRef.current = taskId
    setSelectedTaskId(taskId)
  }

  const handleDetailClose = (): void => {
    setSelectedTaskId(null)
  }

  const handleCreateDialogOpenChange = (open: boolean): void => {
    setIsCreateDialogOpen(open)

    if (!open) {
      const returnTarget =
        createDialogFocusReturnRef.current ??
        (document.querySelector('[data-create-task-trigger="true"]') as HTMLElement | null)

      createDialogFocusReturnRef.current = null
      requestAnimationFrame(() => {
        returnTarget?.focus()
      })
    }
  }

  const handleDetailOpenChange = (open: boolean): void => {
    if (open) return

    const returnTarget =
      detailSheetFocusReturnRef.current ??
      (detailSheetFocusTaskIdRef.current
        ? (document.querySelector(
            `[data-task-row-id="${detailSheetFocusTaskIdRef.current}"]`
          ) as HTMLElement | null)
        : null)

    detailSheetFocusReturnRef.current = null
    detailSheetFocusTaskIdRef.current = null
    handleDetailClose()

    requestAnimationFrame(() => {
      returnTarget?.focus()
    })
  }

  const handleSortChange = (field: 'priority' | 'id'): void => {
    if (sortBy === field) {
      // Toggle: asc → desc → none
      if (sortOrder === 'asc') {
        setSortOrder('desc')
      } else {
        setSortBy(undefined)
        setSortOrder('asc')
      }
    } else {
      setSortBy(field)
      setSortOrder('asc')
    }
  }

  if (error) {
    const copy = getErrorCopy('tasksLoad')

    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-semibold">Tasks</h1>
        <FeedbackState
          variant="error"
          title={copy.title}
          description={copy.description}
          icon={<AlertCircle className="size-10" />}
          primaryAction={{ label: RETRY_LABEL, onClick: () => void refetchTasks() }}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold">Tasks</h1>
        <Button onClick={handleAddTask} data-create-task-trigger="true">
          <Plus className="size-4 mr-2" />
          Add Task
        </Button>
      </div>

      {/* Search Bar */}
      <SearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Search tasks by title or description..."
        label="Search tasks by title or description"
      />

      {/* Filter Bar */}
      <FilterBar value={filters} onChange={setFilters} />

      {/* Task list with sorting */}
      <TaskList
        tasks={tasks || []}
        isLoading={isLoading}
        onTaskClick={handleTaskClick}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={handleSortChange}
        onCreateTask={handleAddTask}
      />

      {/* Create task dialog */}
      <CreateTaskDialog open={isCreateDialogOpen} onOpenChange={handleCreateDialogOpenChange} />

      {/* Task detail panel */}
      <TaskDetail
        taskId={selectedTaskId}
        open={isDetailOpen}
        onOpenChange={handleDetailOpenChange}
        onTaskChange={setSelectedTaskId}
      />
    </div>
  )
}
