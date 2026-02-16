import { cn } from '@renderer/lib/utils'
import { Button } from '@renderer/components/ui/button'

interface FeedbackStateAction {
  label: string
  onClick: () => void
  variant?: React.ComponentProps<typeof Button>['variant']
  disabled?: boolean
}

interface FeedbackStateProps {
  variant: 'empty' | 'error' | 'loading'
  title: string
  description: string
  icon?: React.ReactNode
  primaryAction?: FeedbackStateAction
  secondaryAction?: FeedbackStateAction
  className?: string
}

export function FeedbackState({
  variant,
  title,
  description,
  icon,
  primaryAction,
  secondaryAction,
  className
}: FeedbackStateProps): React.JSX.Element {
  const isError = variant === 'error'

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-md border border-dashed p-8 text-center',
        isError ? 'border-destructive/40 bg-destructive/5' : 'border-border bg-muted/20',
        className
      )}
    >
      {icon ? (
        <div
          className={cn(
            'flex items-center justify-center',
            isError ? 'text-destructive' : 'text-muted-foreground'
          )}
        >
          {icon}
        </div>
      ) : null}

      <div className="space-y-1">
        <h3
          className={cn('text-lg font-semibold', isError ? 'text-destructive' : 'text-foreground')}
        >
          {title}
        </h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      {(primaryAction || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
          {primaryAction ? (
            <Button
              type="button"
              onClick={primaryAction.onClick}
              variant={primaryAction.variant ?? 'default'}
              disabled={primaryAction.disabled}
            >
              {primaryAction.label}
            </Button>
          ) : null}
          {secondaryAction ? (
            <Button
              type="button"
              onClick={secondaryAction.onClick}
              variant={secondaryAction.variant ?? 'outline'}
              disabled={secondaryAction.disabled}
            >
              {secondaryAction.label}
            </Button>
          ) : null}
        </div>
      )}
    </div>
  )
}
