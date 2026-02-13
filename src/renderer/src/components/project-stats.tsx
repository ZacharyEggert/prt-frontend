import type { RoadmapStats } from 'project-roadmap-tracking/dist/services/roadmap.service'
import { Card, CardHeader, CardTitle, CardContent } from '@renderer/components/ui/card'
import { Badge } from '@renderer/components/ui/badge'
import { cn } from '@renderer/lib/utils'

interface ProjectStatsProps {
  stats: RoadmapStats
}

type BadgeProps = {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'ghost' | 'link'
  className?: string
}

function getStatusBadgeProps(status: string): BadgeProps {
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

function getTypeBadgeProps(type: string): BadgeProps {
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

function getPriorityBadgeProps(priority: string): BadgeProps {
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

function formatLabel(key: string): string {
  return key
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function ProjectStats({ stats }: ProjectStatsProps): React.JSX.Element {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Status Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(stats.byStatus).map(([status, count]) => {
              const badgeProps = getStatusBadgeProps(status)
              return (
                <div key={status} className="flex items-center justify-between gap-2">
                  <Badge variant={badgeProps.variant} className={cn(badgeProps.className)}>
                    {formatLabel(status)}
                  </Badge>
                  <span className="text-muted-foreground font-medium">{count}</span>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Type Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Type</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(stats.byType).map(([type, count]) => {
              const badgeProps = getTypeBadgeProps(type)
              return (
                <div key={type} className="flex items-center justify-between gap-2">
                  <Badge variant={badgeProps.variant} className={cn(badgeProps.className)}>
                    {formatLabel(type)}
                  </Badge>
                  <span className="text-muted-foreground font-medium">{count}</span>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Priority Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Priority</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(stats.byPriority).map(([priority, count]) => {
              const badgeProps = getPriorityBadgeProps(priority)
              return (
                <div key={priority} className="flex items-center justify-between gap-2">
                  <Badge variant={badgeProps.variant} className={cn(badgeProps.className)}>
                    {formatLabel(priority)}
                  </Badge>
                  <span className="text-muted-foreground font-medium">{count}</span>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
