export interface EdgeProps {
  from: string
  to: string
  points: Array<{ x: number; y: number }>
  isHighlighted: boolean
}

/**
 * SVG edge component for dependency graph visualization.
 *
 * Renders a dependency edge as an SVG path with an arrow marker:
 * - Connects two nodes using path points from dagre
 * - Muted color by default, primary color when highlighted
 * - Arrow marker at end indicates dependency direction
 * - Smooth transitions on highlight state change
 *
 * Edge direction convention:
 * - "A depends-on B" = edge points FROM B TO A (dependency → dependent)
 * - Arrow points toward the dependent task
 */
export function Edge({ points, isHighlighted }: EdgeProps): React.JSX.Element {
  // Convert points array to SVG path data
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')

  // Determine stroke color and width based on highlight state
  const strokeColor = isHighlighted ? 'hsl(221 83% 53%)' : 'hsl(0 0% 45%)'
  const strokeWidth = isHighlighted ? 2.5 : 1.5
  const opacity = isHighlighted ? 1 : 0.4

  return (
    <path
      d={pathD}
      fill="none"
      stroke={strokeColor}
      strokeWidth={strokeWidth}
      opacity={opacity}
      markerEnd="url(#arrowhead)"
      style={{
        transition: 'all 0.2s ease',
        pointerEvents: 'none'
      }}
    />
  )
}
