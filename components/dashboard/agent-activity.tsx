'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Bot, CheckCircle, UserPlus, MessageSquare, Clock } from 'lucide-react'
import { useTranslation } from '@/lib/i18n'

interface Activity {
  id: string
  type: 'qualify' | 'match' | 'message'
  description: string
  timestamp: Date
}

interface AgentActivityProps {
  activities: Activity[]
}

export function AgentActivity({ activities }: AgentActivityProps) {
  const { locale } = useTranslation()

  const activityConfig = {
    qualify: { icon: CheckCircle, color: 'text-chart-3', label: locale === 'en' ? 'Qualification' : 'Qualifizierung' },
    match: { icon: UserPlus, color: 'text-primary', label: locale === 'en' ? 'Assignment' : 'Zuweisung' },
    message: { icon: MessageSquare, color: 'text-accent', label: locale === 'en' ? 'Message' : 'Nachricht' }
  }

  const formatTime = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)

    if (minutes < 1) return locale === 'en' ? 'Just now' : 'Gerade eben'
    if (minutes < 60) return locale === 'en' ? `${minutes}m ago` : `Vor ${minutes} Min.`

    const hours = Math.floor(minutes / 60)
    if (hours < 24) return locale === 'en' ? `${hours}h ago` : `Vor ${hours} Std.`

    return date.toLocaleDateString(locale === 'en' ? 'en-US' : 'de-DE', { day: '2-digit', month: '2-digit' })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          {locale === 'en' ? 'Agent Activity' : 'Agent-Aktivität'}
        </CardTitle>
        <CardDescription>
          {locale === 'en' ? 'Automated actions' : 'Automatisierte Aktionen'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Clock className="h-8 w-8 mb-2" />
            <p className="text-sm">{locale === 'en' ? 'No activities' : 'Keine Aktivitäten'}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activities.slice(0, 10).map((activity) => {
              const config = activityConfig[activity.type]
              const Icon = config.icon
              return (
                <div key={activity.id} className="flex items-start gap-3">
                  <div className={`mt-0.5 ${config.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{activity.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatTime(activity.timestamp)}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
