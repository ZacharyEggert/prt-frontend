import { useMemo, useState } from 'react'
import { useDependencyGraph } from '@renderer/hooks/use-deps'
import { useTasks } from '@renderer/hooks/use-tasks'
import { useViewBox } from '@renderer/hooks/use-view-box'
import { computeDagreLayout } from '@renderer/lib/graph-utils'
import { Skeleton } from '@renderer/components/ui/skeleton'
import { FeedbackState } from '@renderer/components/ui/feedback-state'
import { getErrorCopy, RETRY_LABEL } from '@renderer/lib/error-copy'
import { Network, AlertCircle } from 'lucide-react'
import { Node } from './dependency-graph/node'
import { Edge } from './dependency-graph/edge'
import { ZoomControls } from './dependency-graph/zoom-controls'

export interface DependencyGraphProps {
  /** Optional filter to show graph for specific task and its neighbors */
  focusTaskId?: string
  /** Callback when a node is clicked */
  onTaskClick?: (taskId: string) => void
  /** Height of the graph container (default: 600px) */
  height?: number
  /** Whether to show isolated tasks (tasks without dependencies) */
  showIsolatedTasks?: boolean
  /** Callback for creating a task from empty state */
  onCreateTask?: () => void
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
 * - Zoom (Cmd/Ctrl+scroll, pinch) and pan (click-drag)
 *
 * Data source: useDependencyGraph() + useTasks() hooks
 * Layout algorithm: dagre (top-to-bottom directed graph layout)
 */
export function DependencyGraph({
  focusTaskId,
  onTaskClick,
  height = 600,
  showIsolatedTasks = false,
  onCreateTask
}: DependencyGraphProps): React.JSX.Element {
  const {
    data: graph,
    isLoading: graphLoading,
    error: graphError,
    refetch: refetchGraph
  } = useDependencyGraph()
  const {
    data: allTasks,
    isLoading: tasksLoading,
    error: tasksError,
    refetch: refetchTasks
  } = useTasks()
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null)

  const isLoading = graphLoading || tasksLoading
  const error = graphError || tasksError

  // Compute graph layout (memoized for performance)
  const computedGraph = useMemo(() => {
    if (!graph || !allTasks) return null
    return computeDagreLayout(graph, allTasks, focusTaskId, showIsolatedTasks)
  }, [graph, allTasks, focusTaskId, showIsolatedTasks])

  // Zoom and pan (hook must be called unconditionally)
  const { containerRef, viewBox, zoom, isPanning, didPanRef, resetView, zoomIn, zoomOut } =
    useViewBox({
      contentWidth: computedGraph?.width ?? 0,
      contentHeight: computedGraph?.height ?? 0
    })

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
    const copy = getErrorCopy('dependencyGraphLoad')

    return (
      <div className="w-full" style={{ height: `${height}px` }}>
        <FeedbackState
          variant="error"
          title={copy.title}
          description={copy.description}
          icon={<AlertCircle className="size-10" />}
          className="h-full"
          primaryAction={{
            label: RETRY_LABEL,
            onClick: () => {
              void refetchGraph()
              void refetchTasks()
            }
          }}
        />
      </div>
    )
  }

  // Empty state - no dependencies to visualize
  if (!computedGraph || computedGraph.nodes.length === 0) {
    return (
      <div className="w-full" style={{ height: `${height}px` }}>
        <FeedbackState
          variant="empty"
          title="No dependencies to visualize"
          description="Add task dependencies to see how work is connected."
          icon={<Network className="size-12" />}
          className="h-full"
          primaryAction={
            onCreateTask
              ? {
                  label: 'Create Task',
                  onClick: onCreateTask
                }
              : undefined
          }
        />
      </div>
    )
  }

  // Determine if an edge should be highlighted
  const isEdgeHighlighted = (edge: { from: string; to: string }): boolean => {
    if (!hoveredNodeId) return false
    return edge.from === hoveredNodeId || edge.to === hoveredNodeId
  }

  // Handle node click (suppress if user just panned)
  const handleNodeClick = (taskId: string): void => {
    if (didPanRef.current) return
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
      ref={containerRef}
      className="relative w-full border rounded-md bg-background overflow-hidden"
      style={{
        height: `${height}px`,
        cursor: isPanning ? 'grabbing' : 'grab',
        touchAction: 'none'
      }}
    >
      <svg width="100%" height="100%" viewBox={viewBox} xmlns="http://www.w3.org/2000/svg">
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
      <ZoomControls zoom={zoom} onZoomIn={zoomIn} onZoomOut={zoomOut} onReset={resetView} />
    </div>
  )
}
