import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'

interface ZoomControlsProps {
  zoom: number
  onZoomIn: () => void
  onZoomOut: () => void
  onReset: () => void
}

export function ZoomControls({
  zoom,
  onZoomIn,
  onZoomOut,
  onReset
}: ZoomControlsProps): React.JSX.Element {
  return (
    <div
      className="absolute bottom-3 right-3 flex items-center gap-1 bg-background/80 backdrop-blur-sm border rounded-md px-1 py-1 shadow-sm"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <Button variant="ghost" size="icon-xs" onClick={onZoomOut} aria-label="Zoom out">
        <ZoomOut className="size-3.5" />
      </Button>
      <span className="text-xs text-muted-foreground w-12 text-center select-none tabular-nums">
        {Math.round(zoom * 100)}%
      </span>
      <Button variant="ghost" size="icon-xs" onClick={onZoomIn} aria-label="Zoom in">
        <ZoomIn className="size-3.5" />
      </Button>
      <Button variant="ghost" size="icon-xs" onClick={onReset} aria-label="Fit to view">
        <Maximize2 className="size-3" />
      </Button>
    </div>
  )
}
