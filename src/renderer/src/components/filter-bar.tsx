import { STATUS, TASK_TYPE, PRIORITY } from 'project-roadmap-tracking/dist/util/types'
import { ToggleGroup, ToggleGroupItem } from '@renderer/components/ui/toggle-group'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@renderer/components/ui/dropdown-menu'
import { Button } from '@renderer/components/ui/button'
import { Badge } from '@renderer/components/ui/badge'
import { Filter, ChevronDown, X } from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import {
  formatLabel,
  getStatusBadgeProps,
  getTypeBadgeProps,
  getPriorityBadgeProps
} from '@renderer/lib/task-utils'

interface FilterBarProps {
  value: {
    status?: STATUS | STATUS[]
    type?: TASK_TYPE | TASK_TYPE[]
    priority?: PRIORITY | PRIORITY[]
  }
  onChange: (filters: FilterBarProps['value']) => void
}

export function FilterBar({ value, onChange }: FilterBarProps): React.JSX.Element {
  // Convert single values to arrays for consistent handling
  const statusArray = value.status
    ? Array.isArray(value.status)
      ? value.status
      : [value.status]
    : []
  const typeArray = value.type ? (Array.isArray(value.type) ? value.type : [value.type]) : []
  const priorityValue = value.priority
    ? Array.isArray(value.priority)
      ? value.priority[0]
      : value.priority
    : undefined

  // Handle status changes
  const handleStatusChange = (values: string[]): void => {
    onChange({
      ...value,
      status: values.length > 0 ? (values as STATUS[]) : undefined
    })
  }

  // Handle type changes
  const handleTypeChange = (type: TASK_TYPE, checked: boolean): void => {
    const newTypes = checked ? [...typeArray, type] : typeArray.filter((t) => t !== type)
    onChange({
      ...value,
      type: newTypes.length > 0 ? newTypes : undefined
    })
  }

  // Handle priority changes
  const handlePriorityChange = (priority: PRIORITY, checked: boolean): void => {
    onChange({
      ...value,
      priority: checked ? priority : undefined
    })
  }

  // Remove a specific filter
  const removeFilter = (filterType: 'status' | 'type' | 'priority', filterValue?: string): void => {
    if (filterType === 'status' && filterValue) {
      const newStatus = statusArray.filter((s) => s !== filterValue)
      onChange({
        ...value,
        status: newStatus.length > 0 ? newStatus : undefined
      })
    } else if (filterType === 'type' && filterValue) {
      const newTypes = typeArray.filter((t) => t !== filterValue)
      onChange({
        ...value,
        type: newTypes.length > 0 ? newTypes : undefined
      })
    } else if (filterType === 'priority') {
      onChange({
        ...value,
        priority: undefined
      })
    }
  }

  // Clear all filters
  const clearAllFilters = (): void => {
    onChange({})
  }

  const hasActiveFilters = statusArray.length > 0 || typeArray.length > 0 || !!priorityValue

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center">
        {/* Status Filter */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <span className="text-xs sm:text-sm font-medium text-muted-foreground">Status:</span>
          <ToggleGroup
            type="multiple"
            value={statusArray}
            onValueChange={handleStatusChange}
            variant="outline"
            size="sm"
            className="w-full flex-wrap justify-start md:w-auto"
          >
            <ToggleGroupItem value={STATUS.NotStarted}>
              {formatLabel(STATUS.NotStarted)}
            </ToggleGroupItem>
            <ToggleGroupItem value={STATUS.InProgress}>
              {formatLabel(STATUS.InProgress)}
            </ToggleGroupItem>
            <ToggleGroupItem value={STATUS.Completed}>
              {formatLabel(STATUS.Completed)}
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        {/* Type Filter */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <span className="text-xs sm:text-sm font-medium text-muted-foreground">Type:</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full justify-between md:w-auto"
              >
                <Filter className="size-4 mr-2" />
                {typeArray.length > 0 ? `${typeArray.length} selected` : 'All types'}
                <ChevronDown className="size-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuLabel>Task Types</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={typeArray.includes(TASK_TYPE.Feature)}
                onCheckedChange={(checked) => handleTypeChange(TASK_TYPE.Feature, checked)}
              >
                {formatLabel(TASK_TYPE.Feature)}
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={typeArray.includes(TASK_TYPE.Bug)}
                onCheckedChange={(checked) => handleTypeChange(TASK_TYPE.Bug, checked)}
              >
                {formatLabel(TASK_TYPE.Bug)}
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={typeArray.includes(TASK_TYPE.Improvement)}
                onCheckedChange={(checked) => handleTypeChange(TASK_TYPE.Improvement, checked)}
              >
                {formatLabel(TASK_TYPE.Improvement)}
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={typeArray.includes(TASK_TYPE.Planning)}
                onCheckedChange={(checked) => handleTypeChange(TASK_TYPE.Planning, checked)}
              >
                {formatLabel(TASK_TYPE.Planning)}
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={typeArray.includes(TASK_TYPE.Research)}
                onCheckedChange={(checked) => handleTypeChange(TASK_TYPE.Research, checked)}
              >
                {formatLabel(TASK_TYPE.Research)}
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Priority Filter */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <span className="text-xs sm:text-sm font-medium text-muted-foreground">Priority:</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full justify-between md:w-auto"
              >
                <Filter className="size-4 mr-2" />
                {priorityValue ? formatLabel(priorityValue) : 'All priorities'}
                <ChevronDown className="size-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuLabel>Priority Level</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={priorityValue === PRIORITY.Low}
                onCheckedChange={(checked) => handlePriorityChange(PRIORITY.Low, checked)}
              >
                {formatLabel(PRIORITY.Low)}
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={priorityValue === PRIORITY.Medium}
                onCheckedChange={(checked) => handlePriorityChange(PRIORITY.Medium, checked)}
              >
                {formatLabel(PRIORITY.Medium)}
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={priorityValue === PRIORITY.High}
                onCheckedChange={(checked) => handlePriorityChange(PRIORITY.High, checked)}
              >
                {formatLabel(PRIORITY.High)}
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Clear All Button */}
        {hasActiveFilters && (
          <Button type="button" variant="ghost" size="sm" onClick={clearAllFilters}>
            Clear All
          </Button>
        )}
      </div>

      {/* Active Filter Badges */}
      {hasActiveFilters && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:flex-wrap">
          <span className="text-xs sm:text-sm font-medium text-muted-foreground">
            Active filters:
          </span>

          {/* Status Badges */}
          {statusArray.map((status) => {
            const badgeProps = getStatusBadgeProps(status)
            return (
              <Badge
                key={status}
                variant={badgeProps.variant}
                className={cn(badgeProps.className, 'gap-1 text-xs sm:text-sm')}
              >
                Status: {formatLabel(status)}
                <button
                  type="button"
                  onClick={() => removeFilter('status', status)}
                  className="ml-1 rounded-sm hover:bg-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={`Remove status filter ${formatLabel(status)}`}
                >
                  <X className="size-3" />
                </button>
              </Badge>
            )
          })}

          {/* Type Badges */}
          {typeArray.map((type) => {
            const badgeProps = getTypeBadgeProps(type)
            return (
              <Badge
                key={type}
                variant={badgeProps.variant}
                className={cn(badgeProps.className, 'gap-1 text-xs sm:text-sm')}
              >
                Type: {formatLabel(type)}
                <button
                  type="button"
                  onClick={() => removeFilter('type', type)}
                  className="ml-1 rounded-sm hover:bg-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={`Remove type filter ${formatLabel(type)}`}
                >
                  <X className="size-3" />
                </button>
              </Badge>
            )
          })}

          {/* Priority Badge */}
          {priorityValue && (
            <Badge
              variant={getPriorityBadgeProps(priorityValue).variant}
              className={cn(
                getPriorityBadgeProps(priorityValue).className,
                'gap-1 text-xs sm:text-sm'
              )}
            >
              Priority: {formatLabel(priorityValue)}
              <button
                type="button"
                onClick={() => removeFilter('priority')}
                className="ml-1 rounded-sm hover:bg-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`Remove priority filter ${formatLabel(priorityValue)}`}
              >
                <X className="size-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  )
}
