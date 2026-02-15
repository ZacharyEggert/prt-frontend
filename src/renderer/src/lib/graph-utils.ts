import dagre from '@dagrejs/dagre'
import type { Task, STATUS, TASK_TYPE } from 'project-roadmap-tracking/dist/util/types'
import type { SerializableDependencyGraph } from '../../../preload/index'

export interface GraphNode {
  id: string
  task: Task
  x: number
  y: number
  width: number
  height: number
}

export interface GraphEdge {
  from: string
  to: string
  points: Array<{ x: number; y: number }>
}

export interface ComputedGraph {
  nodes: GraphNode[]
  edges: GraphEdge[]
  width: number
  height: number
}

/**
 * Computes dagre layout for dependency graph visualization.
 *
 * Transforms SerializableDependencyGraph into positioned nodes and edges
 * using the dagre layout algorithm.
 *
 * @param graph - Dependency graph with blocks and dependsOn mappings
 * @param tasks - Array of all tasks for node data enrichment
 * @param focusTaskId - Optional task ID to filter graph (show only focused task and neighbors)
 * @param showIsolatedTasks - Whether to include tasks with no dependencies (default: false)
 * @returns Computed graph with positioned nodes and edge paths
 */
export function computeDagreLayout(
  graph: SerializableDependencyGraph,
  tasks: Task[],
  focusTaskId?: string,
  showIsolatedTasks: boolean = false
): ComputedGraph {
  // Create task lookup map (use string keys for compatibility with graph structure)
  const taskMap = new Map<string, Task>(tasks.map((t) => [t.id, t]))

  // Get all task IDs that have dependencies
  const taskIdsWithDeps = new Set<string>()
  Object.keys(graph.dependsOn).forEach((id) => taskIdsWithDeps.add(id))
  Object.keys(graph.blocks).forEach((id) => taskIdsWithDeps.add(id))
  Object.values(graph.dependsOn).forEach((deps) => deps.forEach((id) => taskIdsWithDeps.add(id)))
  Object.values(graph.blocks).forEach((blocks) => blocks.forEach((id) => taskIdsWithDeps.add(id)))

  // Filter to focused task and neighbors if focusTaskId is provided
  let taskIds: string[]
  if (focusTaskId) {
    const neighbors = new Set<string>([focusTaskId])
    // Add dependencies (tasks this depends on)
    graph.dependsOn[focusTaskId]?.forEach((id) => neighbors.add(id))
    // Add blocked tasks (tasks that depend on this)
    graph.blocks[focusTaskId]?.forEach((id) => neighbors.add(id))
    // Add tasks that this task blocks (reverse lookup)
    Object.entries(graph.dependsOn).forEach(([taskId, deps]) => {
      if (deps.includes(focusTaskId)) neighbors.add(taskId)
    })
    taskIds = Array.from(neighbors).filter((id) => taskMap.has(id))
  } else if (showIsolatedTasks) {
    // Show all tasks
    taskIds = tasks.map((t) => t.id)
  } else {
    // Show only tasks with dependencies
    taskIds = Array.from(taskIdsWithDeps).filter((id) => taskMap.has(id))
  }

  // Handle empty graph
  if (taskIds.length === 0) {
    return { nodes: [], edges: [], width: 800, height: 400 }
  }

  // Create dagre graph
  const g = new dagre.graphlib.Graph()
  g.setGraph({
    rankdir: 'TB', // Top to bottom layout
    nodesep: 30, // Horizontal spacing between nodes at same rank
    ranksep: 50, // Vertical spacing between ranks
    marginx: 20,
    marginy: 20,
    ranker: 'longest-path' // Use longest-path ranker for better vertical spacing
  })
  g.setDefaultEdgeLabel(() => ({}))

  // Add nodes to dagre graph
  const nodeWidth = 200
  const nodeHeight = 80
  taskIds.forEach((taskId) => {
    g.setNode(taskId, { width: nodeWidth, height: nodeHeight })
  })

  // Add edges to dagre graph
  // Edge direction: dependency → dependent (A depends on B = B → A)
  const addedEdges = new Set<string>()

  // Add edges from dependsOn mapping
  Object.entries(graph.dependsOn).forEach(([fromId, toIds]) => {
    if (!taskIds.includes(fromId)) return
    toIds.forEach((toId) => {
      if (!taskIds.includes(toId)) return
      const edgeKey = `${toId}-${fromId}`
      if (!addedEdges.has(edgeKey)) {
        g.setEdge(toId, fromId) // Dependency points TO dependent
        addedEdges.add(edgeKey)
      }
    })
  })

  // Also add edges from blocks mapping (in case some tasks only have blocks)
  Object.entries(graph.blocks).forEach(([fromId, toIds]) => {
    if (!taskIds.includes(fromId)) return
    toIds.forEach((toId) => {
      if (!taskIds.includes(toId)) return
      const edgeKey = `${fromId}-${toId}`
      if (!addedEdges.has(edgeKey)) {
        g.setEdge(fromId, toId) // Blocker points TO blocked
        addedEdges.add(edgeKey)
      }
    })
  })

  // Check if we have any edges
  const hasEdges = addedEdges.size > 0

  // If no edges, create a simple grid layout instead
  if (!hasEdges && taskIds.length > 0) {
    const cols = Math.ceil(Math.sqrt(taskIds.length))
    const horizontalSpacing = 100
    const verticalSpacing = 150
    const margin = 50

    const nodes: GraphNode[] = taskIds
      .map((id, index) => {
        const task = taskMap.get(id)
        if (!task) return null
        const col = index % cols
        const row = Math.floor(index / cols)
        return {
          id,
          task,
          x: col * (nodeWidth + horizontalSpacing) + nodeWidth / 2 + margin,
          y: row * (nodeHeight + verticalSpacing) + nodeHeight / 2 + margin,
          width: nodeWidth,
          height: nodeHeight
        }
      })
      .filter((node): node is GraphNode => node !== null)

    const rows = Math.ceil(taskIds.length / cols)
    const width = cols * (nodeWidth + horizontalSpacing) + margin * 2
    const height = rows * (nodeHeight + verticalSpacing) + margin * 2

    return { nodes, edges: [], width, height }
  }

  // Run dagre layout algorithm (only if we have edges)
  dagre.layout(g)

  // Extract positioned nodes
  const nodes: GraphNode[] = taskIds
    .map((id) => {
      const task = taskMap.get(id)
      const node = g.node(id)
      if (!task || !node) return null
      return {
        id,
        task,
        x: node.x,
        y: node.y,
        width: nodeWidth,
        height: nodeHeight
      }
    })
    .filter((node): node is GraphNode => node !== null)

  // Extract edges with paths
  const edges: GraphEdge[] = g.edges().map((e) => {
    const edge = g.edge(e)
    return {
      from: e.v,
      to: e.w,
      points: edge.points || []
    }
  })

  // Calculate graph dimensions from layout
  const graphBounds = g.graph()
  const width = (graphBounds.width || 800) + 40 // Add margins
  const height = (graphBounds.height || 400) + 40

  return { nodes, edges, width, height }
}

/**
 * Returns SVG fill and stroke colors for a task node based on status.
 *
 * Status is the primary color coding for dependency visualization:
 * - not-started: Gray (task hasn't begun)
 * - in-progress: Blue (task is being worked on)
 * - completed: Green (task is done)
 *
 * @param status - Task status
 * @returns Object with background, border, and text color values
 */
export function getNodeColor(status: STATUS): {
  background: string
  border: string
  text: string
} {
  switch (status) {
    case 'not-started':
      return {
        background: 'hsl(0 0% 96%)',
        border: 'hsl(0 0% 85%)',
        text: 'hsl(0 0% 45%)'
      }
    case 'in-progress':
      return {
        background: 'hsl(217 91% 95%)', // blue-50
        border: 'hsl(217 91% 60%)', // blue-500
        text: 'hsl(217 91% 30%)' // blue-700
      }
    case 'completed':
      return {
        background: 'hsl(142 76% 95%)', // green-50
        border: 'hsl(142 76% 45%)', // green-500
        text: 'hsl(142 76% 25%)' // green-700
      }
    default:
      return {
        background: 'hsl(0 0% 96%)',
        border: 'hsl(0 0% 85%)',
        text: 'hsl(0 0% 45%)'
      }
  }
}

/**
 * Returns border color for a task node based on type.
 *
 * Type provides secondary visual context on hover:
 * - bug: Red (destructive)
 * - feature: Primary
 * - improvement: Blue
 * - planning: Yellow
 * - research: Indigo
 *
 * @param type - Task type
 * @returns HSL color string for border
 */
export function getTypeBorderColor(type: TASK_TYPE): string {
  switch (type) {
    case 'bug':
      return 'hsl(0 72% 51%)' // red
    case 'feature':
      return 'hsl(221 83% 53%)' // blue
    case 'improvement':
      return 'hsl(217 91% 60%)' // blue-500
    case 'planning':
      return 'hsl(45 93% 47%)' // yellow-500
    case 'research':
      return 'hsl(239 84% 67%)' // indigo-400
    default:
      return 'hsl(0 0% 85%)'
  }
}

/**
 * Returns solid color for status indicator dot.
 *
 * Small circle in node corner showing status:
 * - not-started: Gray
 * - in-progress: Blue
 * - completed: Green
 *
 * @param status - Task status
 * @returns HSL color string
 */
export function getStatusDotColor(status: STATUS): string {
  switch (status) {
    case 'not-started':
      return 'hsl(0 0% 45%)'
    case 'in-progress':
      return 'hsl(217 91% 60%)' // blue-500
    case 'completed':
      return 'hsl(142 76% 45%)' // green-500
    default:
      return 'hsl(0 0% 45%)'
  }
}

/**
 * Truncates text to maximum length with ellipsis.
 *
 * Used to ensure task titles fit within node dimensions.
 *
 * @param text - Text to truncate
 * @param maxLength - Maximum character length
 * @returns Truncated text with "..." if over limit
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength - 3) + '...'
}
