import { useMemo, useState } from 'react'
import { useDependencyGraph } from '@renderer/hooks/use-deps'
import { useTasks } from '@renderer/hooks/use-tasks'
import { computeDagreLayout } from '@renderer/lib/graph-utils'
import { Skeleton } from '@renderer/components/ui/skeleton'
import { Alert, AlertDescription } from '@renderer/components/ui/alert'
import { Network, AlertCircle } from 'lucide-react'
import { Node } from './dependency-graph/node'
import { Edge } from './dependency-graph/edge'

export interface DependencyGraphProps {
  /** Optional filter to show graph for specific task and its neighbors */
  focusTaskId?: string
  /** Callback when a node is clicked */
  onTaskClick?: (taskId: string) => void
  /** Height of the graph container (default: 600px) */
  height?: number
  /** Whether to show isolated tasks (tasks without dependencies) */
  showIsolatedTasks?: boolean
}

/**
 * Dependency graph visualization component using dagre layout.
 *
 * Renders a directed acyclic graph (DAG) of task dependencies:
 * - Nodes represent tasks (colored by status)
 * - Edges represent dependencies (arrows point from dependency to dependent)
 * - Interactive hover highlighting
 * - Clickable nodes for navigation
 * - Keyboard accessible
 *
 * Data source: useDependencyGraph() + useTasks() hooks
 * Layout algorithm: dagre (top-to-bottom directed graph layout)
 */
export function DependencyGraph({
  focusTaskId,
  onTaskClick,
  height = 600,
  showIsolatedTasks = false
}: DependencyGraphProps): React.JSX.Element {
  const { data: graph, isLoading: graphLoading, error: graphError } = useDependencyGraph()
  const { data: allTasks, isLoading: tasksLoading } = useTasks()
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null)

  const isLoading = graphLoading || tasksLoading
  const error = graphError

  // Compute graph layout (memoized for performance)
  const computedGraph = useMemo(() => {
    if (!graph || !allTasks) return null
    return computeDagreLayout(graph, allTasks, focusTaskId, showIsolatedTasks)
  }, [graph, allTasks, focusTaskId, showIsolatedTasks])

  // Loading state
  if (isLoading) {
    return (
      <div className="w-full" style={{ height: `${height}px` }}>
        <Skeleton className="w-full h-full rounded-md" />
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="size-4" />
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    )
  }

  // Empty state - no dependencies to visualize
  if (!computedGraph || computedGraph.nodes.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center text-muted-foreground"
        style={{ height: `${height}px` }}
      >
        <Network className="size-12 mb-4" />
        <p className="text-sm">No dependencies to visualize</p>
      </div>
    )
  }

  // Determine if an edge should be highlighted
  const isEdgeHighlighted = (edge: { from: string; to: string }): boolean => {
    if (!hoveredNodeId) return false
    return edge.from === hoveredNodeId || edge.to === hoveredNodeId
  }

  // Handle node click
  const handleNodeClick = (taskId: string): void => {
    onTaskClick?.(taskId)
  }

  // Handle node hover
  const handleNodeMouseEnter = (taskId: string): void => {
    setHoveredNodeId(taskId)
  }

  const handleNodeMouseLeave = (): void => {
    setHoveredNodeId(null)
  }

  // Handle focus for keyboard navigation
  const handleNodeFocus = (taskId: string): void => {
    setFocusedNodeId(taskId)
  }

  return (
    <div
      className="relative w-full border rounded-md bg-background overflow-auto"
      style={{ height: `${height}px` }}
    >
      <svg
        width={computedGraph.width}
        height={computedGraph.height}
        className="min-w-full min-h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Define arrow marker for edges */}
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="10"
            refX="9"
            refY="3"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <polygon points="0 0, 10 3, 0 6" fill="hsl(0 0% 45%)" />
          </marker>
        </defs>

        <g>
          {/* Render edges first (behind nodes) */}
          {computedGraph.edges.map((edge) => (
            <Edge
              key={`${edge.from}-${edge.to}`}
              from={edge.from}
              to={edge.to}
              points={edge.points}
              isHighlighted={isEdgeHighlighted(edge)}
            />
          ))}

          {/* Render nodes on top */}
          {computedGraph.nodes.map((node) => (
            <Node
              key={node.id}
              id={node.id}
              task={node.task}
              x={node.x}
              y={node.y}
              width={node.width}
              height={node.height}
              isHovered={hoveredNodeId === node.id}
              isFocused={focusedNodeId === node.id}
              onClick={handleNodeClick}
              onMouseEnter={handleNodeMouseEnter}
              onMouseLeave={handleNodeMouseLeave}
              onFocus={() => handleNodeFocus(node.id)}
            />
          ))}
        </g>
      </svg>
    </div>
  )
}
