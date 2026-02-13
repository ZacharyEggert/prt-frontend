import type { RoadmapStats } from 'project-roadmap-tracking/dist/services/roadmap.service'
import type { STATUS, TASK_TYPE, PRIORITY } from 'project-roadmap-tracking/dist/util/types'
import { Card, CardHeader, CardTitle, CardContent } from '@renderer/components/ui/card'
import { Badge } from '@renderer/components/ui/badge'
import { cn } from '@renderer/lib/utils'
import {
  getStatusBadgeProps,
  getTypeBadgeProps,
  getPriorityBadgeProps,
  formatLabel
} from '@renderer/lib/task-utils'

interface ProjectStatsProps {
  stats: RoadmapStats
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
              const badgeProps = getStatusBadgeProps(status as STATUS)
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
              const badgeProps = getTypeBadgeProps(type as TASK_TYPE)
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
              const badgeProps = getPriorityBadgeProps(priority as PRIORITY)
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
