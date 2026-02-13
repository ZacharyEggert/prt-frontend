import type { STATUS, TASK_TYPE, PRIORITY } from 'project-roadmap-tracking/dist/util/types'
import { Circle, Clock, CheckCircle, XCircle } from 'lucide-react'

export type BadgeProps = {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'ghost' | 'link'
  className?: string
}

/**
 * Returns badge styling props for a task status.
 * Used to maintain consistent status badge colors across components.
 */
export function getStatusBadgeProps(status: STATUS): BadgeProps {
  switch (status) {
    case 'not-started':
      return { variant: 'outline' }
    case 'in-progress':
      return { variant: 'secondary' }
    case 'completed':
      return {
        variant: 'outline',
        className: 'bg-green-500/10 text-green-700 border-green-200'
      }
    default:
      return { variant: 'outline' }
  }
}

/**
 * Returns badge styling props for a task type.
 * Used to maintain consistent type badge colors across components.
 */
export function getTypeBadgeProps(type: TASK_TYPE): BadgeProps {
  switch (type) {
    case 'bug':
      return { variant: 'destructive' }
    case 'feature':
      return { variant: 'default' }
    case 'improvement':
      return { variant: 'secondary' }
    case 'planning':
      return {
        variant: 'outline',
        className: 'bg-yellow-500/10 text-yellow-700 border-yellow-200'
      }
    case 'research':
      return {
        variant: 'outline',
        className: 'bg-indigo-500/10 text-indigo-700 border-indigo-200'
      }
    default:
      return { variant: 'outline' }
  }
}

/**
 * Returns badge styling props for a task priority.
 * Used to maintain consistent priority badge colors across components.
 */
export function getPriorityBadgeProps(priority: PRIORITY): BadgeProps {
  switch (priority) {
    case 'low':
      return { variant: 'outline' }
    case 'medium':
      return {
        variant: 'outline',
        className: 'bg-yellow-500/10 text-yellow-700 border-yellow-200'
      }
    case 'high':
      return { variant: 'destructive' }
    default:
      return { variant: 'outline' }
  }
}

/**
 * Converts kebab-case strings to Title Case.
 * Example: "not-started" -> "Not Started"
 */
export function formatLabel(key: string): string {
  return key
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Returns an icon component for a task status.
 * Used to visually indicate task status in lists and details.
 */
export function getStatusIcon(status: STATUS): React.JSX.Element {
  switch (status) {
    case 'not-started':
      return <Circle className="size-4 text-muted-foreground" />
    case 'in-progress':
      return <Clock className="size-4 text-blue-500" />
    case 'completed':
      return <CheckCircle className="size-4 text-green-600" />
    default:
      return <Circle className="size-4 text-muted-foreground" />
  }
}

/**
 * Returns an icon component for test pass/fail status.
 * Used to indicate whether a task's tests are passing.
 */
export function getTestIcon(passesTests: boolean): React.JSX.Element {
  return passesTests ? (
    <CheckCircle className="size-4 text-green-600" />
  ) : (
    <XCircle className="size-4 text-muted-foreground" />
  )
}

/**
 * Formats an ISO date string to a human-readable format with time.
 * Returns "Not set" for null/undefined dates.
 * Example: "Jan 15, 2026 at 3:45 PM"
 */
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return 'Not set'

  try {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(date)
  } catch {
    return 'Invalid date'
  }
}

/**
 * Formats a date string to show only the date (no time).
 * Returns "Not set" for null/undefined dates.
 * Example: "Jan 15, 2026"
 */
export function formatDateShort(dateString: string | null | undefined): string {
  if (!dateString) return 'Not set'

  try {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date)
  } catch {
    return 'Invalid date'
  }
}
