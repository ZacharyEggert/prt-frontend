import { useState, useCallback, useEffect, useRef } from 'react'

interface ViewBox {
  x: number
  y: number
  width: number
  height: number
}

interface UseViewBoxOptions {
  contentWidth: number
  contentHeight: number
  minZoom?: number
  maxZoom?: number
  padding?: number
}

interface UseViewBoxReturn {
  containerRef: React.RefCallback<HTMLDivElement>
  viewBox: string
  zoom: number
  isPanning: boolean
  didPanRef: React.RefObject<boolean>
  resetView: () => void
  zoomIn: () => void
  zoomOut: () => void
}

const PAN_THRESHOLD = 5
const ZOOM_STEP = 1.2

export function useViewBox(options: UseViewBoxOptions): UseViewBoxReturn {
  const { contentWidth, contentHeight, minZoom = 1.0, maxZoom = 10.0, padding = 40 } = options

  const [viewBox, setViewBox] = useState<ViewBox>({ x: 0, y: 0, width: 1, height: 1 })
  const [isPanning, setIsPanning] = useState(false)

  const containerElRef = useRef<HTMLDivElement | null>(null)
  const viewBoxRef = useRef(viewBox)
  const contentDimsRef = useRef({ contentWidth, contentHeight })
  const panStartRef = useRef<{
    clientX: number
    clientY: number
    viewBoxX: number
    viewBoxY: number
  } | null>(null)
  const panDistanceRef = useRef(0)
  const didPanRef = useRef(false)
  const initializedForRef = useRef<string | null>(null)

  // Keep refs in sync
  useEffect(() => {
    viewBoxRef.current = viewBox
  }, [viewBox])

  useEffect(() => {
    contentDimsRef.current = { contentWidth, contentHeight }
  }, [contentWidth, contentHeight])

  const updateViewBox = useCallback((next: ViewBox) => {
    viewBoxRef.current = next
    setViewBox(next)
  }, [])

  const computeFitViewFor = useCallback(
    (el: HTMLDivElement, cw: number, ch: number): ViewBox | null => {
      if (cw <= 0 || ch <= 0) return null

      const rect = el.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return null

      const paddedW = cw + padding * 2
      const paddedH = ch + padding * 2
      const scaleX = rect.width / paddedW
      const scaleY = rect.height / paddedH
      const scale = Math.min(scaleX, scaleY, 1)

      const w = rect.width / scale
      const h = rect.height / scale
      const x = cw / 2 - w / 2
      const y = ch / 2 - h / 2

      return { x, y, width: w, height: h }
    },
    [padding]
  )

  const computeFitView = useCallback((): ViewBox | null => {
    const el = containerElRef.current
    if (!el) return null
    return computeFitViewFor(el, contentWidth, contentHeight)
  }, [contentWidth, contentHeight, computeFitViewFor])

  // Clamp viewBox dimensions to zoom limits
  const clampViewBox = useCallback(
    (vb: ViewBox, containerRect: DOMRect): ViewBox => {
      const paddedW = contentWidth + padding * 2
      const maxViewWidth = paddedW / minZoom
      const minViewWidth = paddedW / maxZoom
      const aspect = containerRect.height / containerRect.width

      const w = Math.max(minViewWidth, Math.min(maxViewWidth, vb.width))
      const h = w * aspect

      return { x: vb.x, y: vb.y, width: w, height: h }
    },
    [contentWidth, padding, minZoom, maxZoom]
  )

  // Ref callback for container
  const containerRef = useCallback((el: HTMLDivElement | null) => {
    containerElRef.current = el
  }, [])

  // ResizeObserver handles both initialization and aspect ratio maintenance.
  // The callback fires asynchronously, so setState is safe here.
  useEffect(() => {
    const el = containerElRef.current
    if (!el) return

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      const { width: cw, height: ch } = entry.contentRect
      if (cw === 0 || ch === 0) return

      const dims = contentDimsRef.current
      const dimsKey = `${dims.contentWidth}:${dims.contentHeight}`

      // Initialize or re-initialize when content dimensions change.
      // Default to 1:1 zoom centered on the content (not fit-all).
      if (
        initializedForRef.current !== dimsKey &&
        dims.contentWidth > 0 &&
        dims.contentHeight > 0
      ) {
        const w = cw
        const h = ch
        const x = dims.contentWidth / 2 - w / 2
        const y = dims.contentHeight / 2 - h / 2
        updateViewBox({ x, y, width: w, height: h })
        initializedForRef.current = dimsKey
        return
      }

      // Otherwise just maintain aspect ratio on container resize
      const vb = viewBoxRef.current
      const newHeight = vb.width * (ch / cw)
      updateViewBox({ ...vb, height: newHeight })
    })

    observer.observe(el)
    return () => observer.disconnect()
  }, [contentWidth, contentHeight, computeFitViewFor, updateViewBox])

  // Wheel event handler (zoom)
  useEffect(() => {
    const el = containerElRef.current
    if (!el) return

    const handleWheel = (e: WheelEvent): void => {
      if (!e.metaKey && !e.ctrlKey) return
      e.preventDefault()

      const vb = viewBoxRef.current
      const rect = el.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top

      // Cursor position in content coordinates
      const contentX = vb.x + (mouseX / rect.width) * vb.width
      const contentY = vb.y + (mouseY / rect.height) * vb.height

      // Zoom factor from scroll delta
      const factor = Math.pow(1.002, -e.deltaY)

      const newWidth = vb.width / factor
      const newHeight = vb.height / factor

      const clamped = clampViewBox({ x: vb.x, y: vb.y, width: newWidth, height: newHeight }, rect)

      // Keep cursor point fixed
      const newX = contentX - (mouseX / rect.width) * clamped.width
      const newY = contentY - (mouseY / rect.height) * clamped.height

      updateViewBox({ x: newX, y: newY, width: clamped.width, height: clamped.height })
    }

    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [clampViewBox, updateViewBox])

  // Pointer event handlers (pan)
  useEffect(() => {
    const el = containerElRef.current
    if (!el) return

    const handlePointerDown = (e: PointerEvent): void => {
      if (e.button !== 0) return
      el.setPointerCapture(e.pointerId)
      const vb = viewBoxRef.current
      panStartRef.current = {
        clientX: e.clientX,
        clientY: e.clientY,
        viewBoxX: vb.x,
        viewBoxY: vb.y
      }
      panDistanceRef.current = 0
      didPanRef.current = false
      setIsPanning(true)
    }

    const handlePointerMove = (e: PointerEvent): void => {
      const start = panStartRef.current
      if (!start) return

      const dx = e.clientX - start.clientX
      const dy = e.clientY - start.clientY
      panDistanceRef.current = Math.abs(dx) + Math.abs(dy)

      if (panDistanceRef.current >= PAN_THRESHOLD) {
        didPanRef.current = true
      }

      const rect = el.getBoundingClientRect()
      const vb = viewBoxRef.current
      const vbDx = (dx / rect.width) * vb.width
      const vbDy = (dy / rect.height) * vb.height

      updateViewBox({
        ...vb,
        x: start.viewBoxX - vbDx,
        y: start.viewBoxY - vbDy
      })
    }

    const handlePointerUp = (): void => {
      panStartRef.current = null
      setIsPanning(false)
    }

    el.addEventListener('pointerdown', handlePointerDown)
    el.addEventListener('pointermove', handlePointerMove)
    el.addEventListener('pointerup', handlePointerUp)
    return () => {
      el.removeEventListener('pointerdown', handlePointerDown)
      el.removeEventListener('pointermove', handlePointerMove)
      el.removeEventListener('pointerup', handlePointerUp)
    }
  }, [updateViewBox])

  const zoom = contentWidth > 0 && viewBox.width > 0 ? contentWidth / viewBox.width : 1

  const resetView = useCallback(() => {
    const fit = computeFitView()
    if (fit) updateViewBox(fit)
  }, [computeFitView, updateViewBox])

  const zoomIn = useCallback(() => {
    const el = containerElRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const vb = viewBoxRef.current

    const centerX = vb.x + vb.width / 2
    const centerY = vb.y + vb.height / 2

    const clamped = clampViewBox(
      { x: vb.x, y: vb.y, width: vb.width / ZOOM_STEP, height: vb.height / ZOOM_STEP },
      rect
    )

    updateViewBox({
      x: centerX - clamped.width / 2,
      y: centerY - clamped.height / 2,
      width: clamped.width,
      height: clamped.height
    })
  }, [clampViewBox, updateViewBox])

  const zoomOut = useCallback(() => {
    const el = containerElRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const vb = viewBoxRef.current

    const centerX = vb.x + vb.width / 2
    const centerY = vb.y + vb.height / 2

    const clamped = clampViewBox(
      { x: vb.x, y: vb.y, width: vb.width * ZOOM_STEP, height: vb.height * ZOOM_STEP },
      rect
    )

    updateViewBox({
      x: centerX - clamped.width / 2,
      y: centerY - clamped.height / 2,
      width: clamped.width,
      height: clamped.height
    })
  }, [clampViewBox, updateViewBox])

  const viewBoxString = `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`

  return {
    containerRef,
    viewBox: viewBoxString,
    zoom,
    isPanning,
    didPanRef,
    resetView,
    zoomIn,
    zoomOut
  }
}
