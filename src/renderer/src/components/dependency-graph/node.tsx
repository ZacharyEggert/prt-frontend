import type { Task } from 'project-roadmap-tracking/dist/util/types'
import {
  getNodeColor,
  getStatusDotColor,
  getTypeBorderColor,
  truncateText
} from '@renderer/lib/graph-utils'

export interface NodeProps {
  id: string
  task: Task
  x: number
  y: number
  width: number
  height: number
  isHovered: boolean
  isFocused: boolean
  onClick?: (id: string) => void
  onMouseEnter?: (id: string) => void
  onMouseLeave?: () => void
  onFocus?: () => void
}

/**
 * SVG node component for dependency graph visualization.
 *
 * Renders a task as a rectangular SVG node with:
 * - Background color based on status (primary indicator)
 * - Border color based on type (on hover) or focus state
 * - Task ID at top (bold)
 * - Task title at bottom (truncated, muted)
 * - Status indicator dot in top-right corner
 * - Interactive hover and click behaviors
 * - Keyboard accessible
 */
export function Node({
  id,
  task,
  x,
  y,
  width,
  height,
  isHovered,
  isFocused,
  onClick,
  onMouseEnter,
  onMouseLeave,
  onFocus
}: NodeProps): React.JSX.Element {
  const statusColor = getNodeColor(task.status)
  const typeBorderColor = getTypeBorderColor(task.type)
  const dotColor = getStatusDotColor(task.status)

  // Determine border color based on state
  const borderColor = isFocused || isHovered ? typeBorderColor : statusColor.border
  const borderWidth = isFocused || isHovered ? 3 : 2

  // Handle keyboard activation
  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onClick?.(id)
    }
  }

  return (
    <g transform={`translate(${x - width / 2}, ${y - height / 2})`}>
      <g
        onClick={() => onClick?.(id)}
        onMouseEnter={() => onMouseEnter?.(id)}
        onMouseLeave={onMouseLeave}
        onFocus={onFocus}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="button"
        aria-label={`Open task ${task.id}: ${task.title}. Status ${task.status}. Press Enter to open task details.`}
        className="cursor-pointer outline-none focus:outline-none"
        style={{
          transformOrigin: `${width / 2}px ${height / 2}px`,
          transform: isHovered || isFocused ? 'scale(1.05)' : 'scale(1)',
          transition: 'transform 0.2s ease'
        }}
      >
        {/* Background rectangle */}
        <rect
          width={width}
          height={height}
          rx={8}
          fill={statusColor.background}
          stroke={borderColor}
          strokeWidth={borderWidth}
          style={{ transition: 'all 0.2s ease' }}
        />

        {/* Focus ring for keyboard navigation */}
        {isFocused && (
          <rect
            width={width + 4}
            height={height + 4}
            x={-2}
            y={-2}
            rx={10}
            fill="none"
            stroke="hsl(0 0% 64%)"
            strokeWidth={2}
            strokeDasharray="4 4"
          />
        )}

        {/* Task ID (top) */}
        <text
          x={width / 2}
          y={28}
          textAnchor="middle"
          fill={statusColor.text}
          className="font-semibold text-sm"
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          {task.id}
        </text>

        {/* Task title (bottom, truncated) */}
        <text
          x={width / 2}
          y={52}
          textAnchor="middle"
          fill="hsl(0 0% 45%)"
          className="text-xs"
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          {truncateText(task.title, 24)}
        </text>

        {/* Status indicator dot (top-right corner) */}
        <circle
          cx={width - 15}
          cy={15}
          r={6}
          fill={dotColor}
          style={{ transition: 'all 0.2s ease' }}
        />
      </g>
    </g>
  )
}
