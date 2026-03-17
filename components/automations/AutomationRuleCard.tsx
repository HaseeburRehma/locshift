'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Switch } from '@/components/ui/switch'
import { EditRuleButton } from './EditRuleButton'
import { DeleteRuleButton } from './DeleteRuleButton'
import {
  UserPlus, RefreshCw, Briefcase, CheckCircle, TrendingUp,
  AlertTriangle, Clock, ShoppingCart,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import type { AutomationRuleRow, AutomationAction } from '@/lib/types/database.types'

const TRIGGER_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  lead_created:           { label: 'New Lead Created',    color: 'blue',   icon: UserPlus    },
  lead_status_changed:    { label: 'Lead Status Changed', color: 'orange', icon: RefreshCw   },
  job_created:            { label: 'Job Created',         color: 'indigo', icon: Briefcase   },
  job_status_changed:     { label: 'Job Status Changed',  color: 'indigo', icon: RefreshCw   },
  job_completed:          { label: 'Job Completed',       color: 'green',  icon: CheckCircle },
  lead_score_above:       { label: 'High Score Lead',     color: 'violet', icon: TrendingUp  },
  lead_urgency_is:        { label: 'Urgent Lead',         color: 'red',    icon: AlertTriangle },
  no_response_after:      { label: 'No Response',         color: 'amber',  icon: Clock       },
  partner_purchased_lead: { label: 'Partner Purchase',    color: 'purple', icon: ShoppingCart },
}

const ACTION_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  send_whatsapp:       { label: 'WhatsApp',      icon: '💬', color: 'emerald' },
  send_email:          { label: 'Email',          icon: '📧', color: 'blue'    },
  assign_technician:   { label: 'Auto-assign',   icon: '🔧', color: 'orange'  },
  change_lead_status:  { label: 'Update Status', icon: '🔄', color: 'slate'   },
  create_notification: { label: 'Notification',  icon: '🔔', color: 'violet'  },
  notify_admin:        { label: 'Alert Admin',   icon: '⚠️', color: 'red'     },
  update_lead_priority:{ label: 'Set Priority',  icon: '🎯', color: 'amber'   },
}

// Inline color utility — tailwind dynamic classes need to be typed out
function triggerBgClass(color: string) {
  const map: Record<string, string> = {
    blue: 'bg-blue-500/10', orange: 'bg-orange-500/10', indigo: 'bg-indigo-500/10',
    green: 'bg-green-500/10', violet: 'bg-violet-500/10', red: 'bg-red-500/10',
    amber: 'bg-amber-500/10', purple: 'bg-purple-500/10',
  }
  return map[color] ?? 'bg-gray-100'
}

function triggerTextClass(color: string) {
  const map: Record<string, string> = {
    blue: 'text-blue-600', orange: 'text-orange-600', indigo: 'text-indigo-600',
    green: 'text-green-600', violet: 'text-violet-600', red: 'text-red-600',
    amber: 'text-amber-600', purple: 'text-purple-600',
  }
  return map[color] ?? 'text-gray-500'
}

function actionBgClass(color: string) {
  const map: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    orange: 'bg-orange-50 text-orange-700 border-orange-200',
    slate: 'bg-slate-50 text-slate-700 border-slate-200',
    violet: 'bg-violet-50 text-violet-700 border-violet-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
  }
  return map[color] ?? 'bg-gray-100 text-gray-700 border-gray-200'
}

export function AutomationRuleCard({ rule }: { rule: AutomationRuleRow }) {
  const [isActive, setIsActive] = useState(rule.is_active)
  const [isToggling, setIsToggling] = useState(false)

  const trigger = TRIGGER_CONFIG[rule.trigger_event]
  const Icon = trigger?.icon

  const toggleActive = async () => {
    setIsToggling(true)
    const prev = isActive
    setIsActive(!prev)
    try {
      const res = await fetch('/api/automations/rules', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: rule.id, is_active: !prev }),
      })
      if (!res.ok) throw new Error('Toggle failed')
      toast.success(!prev ? 'Rule activated' : 'Rule paused')
    } catch {
      setIsActive(prev)
      toast.error('Failed to update rule')
    } finally {
      setIsToggling(false)
    }
  }

  return (
    <div
      className={cn(
        'bg-white dark:bg-gray-900 rounded-2xl p-5 border transition-all hover:shadow-md',
        isActive
          ? 'border-gray-100 dark:border-gray-800'
          : 'border-gray-100 dark:border-gray-800 opacity-60'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div
            className={cn(
              'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0',
              triggerBgClass(trigger?.color ?? 'gray')
            )}
          >
            {Icon && <Icon className={cn('w-4 h-4', triggerTextClass(trigger?.color ?? 'gray'))} />}
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-sm leading-tight truncate">{rule.name}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{trigger?.label ?? rule.trigger_event}</p>
          </div>
        </div>
        <div className="flex-shrink-0 ml-2">
          <Switch
            checked={isActive}
            onCheckedChange={toggleActive}
            disabled={isToggling}
            className="scale-90"
          />
        </div>
      </div>

      {/* Description */}
      {rule.description && (
        <p className="text-xs text-muted-foreground mb-3 leading-relaxed line-clamp-2">
          {rule.description}
        </p>
      )}

      {/* Conditions */}
      {rule.trigger_conditions && Object.keys(rule.trigger_conditions).length > 0 && (
        <div className="text-xs bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2 mb-3 text-muted-foreground">
          <span className="font-semibold text-foreground">When: </span>
          {Object.entries(rule.trigger_conditions)
            .map(([k, v]) => `${k} = ${v}`)
            .join(' AND ')}
        </div>
      )}

      {/* Action chips */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {(rule.actions as AutomationAction[]).map((action, i) => {
          const ac = ACTION_CONFIG[action.type]
          return (
            <span
              key={i}
              className={cn(
                'inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium border',
                actionBgClass(ac?.color ?? 'gray')
              )}
            >
              <span>{ac?.icon}</span>
              {ac?.label ?? action.type}
            </span>
          )
        })}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800">
        <div className="text-xs text-muted-foreground">
          Fired <span className="font-semibold text-foreground">{rule.execution_count}</span> times
          {rule.last_executed_at && (
            <span className="ml-1">
              · {formatDistanceToNow(new Date(rule.last_executed_at), { addSuffix: true })}
            </span>
          )}
        </div>
        <div className="flex gap-1">
          <EditRuleButton rule={rule} />
          <DeleteRuleButton ruleId={rule.id} ruleName={rule.name} />
        </div>
      </div>
    </div>
  )
}
