'use client'

import { useState, useEffect } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { AutomationRuleCard } from './AutomationRuleCard'
import { CreateRuleButton } from './CreateRuleButton'
import { createClient } from '@/lib/supabase/client'
import { formatDistanceToNow } from 'date-fns'
import {
  Zap, Clock, CheckCircle, AlertTriangle, History,
  LayoutTemplate, ChevronDown, ChevronUp, Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import type { AutomationRuleRow, AutomationLogRow } from '@/lib/types/database.types'

// ─── Templates ─────────────────────────────────────────────────────────────

const TEMPLATES = [
  {
    name: 'Urgent Lead Alert',
    description: 'Immediately notify admin via WhatsApp when a lead is marked urgent.',
    trigger_event: 'lead_urgency_is',
    trigger_conditions: { urgency: 'urgent' },
    actions: [{ type: 'notify_admin', message: 'New urgent lead arrived!' }],
    icon: AlertTriangle,
    color: 'red',
  },
  {
    name: 'Auto-qualify New Leads',
    description: 'Run AI qualification on every new lead that enters the system.',
    trigger_event: 'lead_created',
    trigger_conditions: {},
    actions: [{ type: 'assign_technician', method: 'ai_best_match' }],
    icon: Zap,
    color: 'violet',
  },
  {
    name: 'Request Review on Completion',
    description: 'Send review request email and WhatsApp message when a job is completed.',
    trigger_event: 'job_completed',
    trigger_conditions: {},
    actions: [
      { type: 'send_email', to: 'customer', template: 'review_request' },
      { type: 'send_whatsapp', to: 'customer', message: 'How was our service? Leave a quick review!' },
    ],
    icon: CheckCircle,
    color: 'green',
  },
  {
    name: '24h No Response Follow-up',
    description: 'Follow up with customers who have not been contacted within 24 hours.',
    trigger_event: 'no_response_after',
    trigger_conditions: { hours_without_response: 24 },
    actions: [{ type: 'send_whatsapp', to: 'customer', message: 'Hi! We noticed your request is pending. Can we help?' }],
    icon: Clock,
    color: 'amber',
  },
  {
    name: 'High Score Auto-assign',
    description: 'Automatically assign a technician when a lead scores above 75.',
    trigger_event: 'lead_score_above',
    trigger_conditions: { score_threshold: 75 },
    actions: [{ type: 'assign_technician', method: 'ai_best_match' }],
    icon: CheckCircle,
    color: 'blue',
  },
  {
    name: 'Partner Purchase Notification',
    description: 'Notify admin when a partner purchases a lead from the marketplace.',
    trigger_event: 'partner_purchased_lead',
    trigger_conditions: {},
    actions: [{ type: 'notify_admin', message: 'A partner just purchased a lead!' }, { type: 'create_notification', title: 'Partner Purchase', body: 'A partner purchased a lead from the marketplace' }],
    icon: Zap,
    color: 'purple',
  },
]

function iconBgClass(color: string) {
  const map: Record<string, string> = {
    red: 'bg-red-100 text-red-600', violet: 'bg-violet-100 text-violet-600',
    green: 'bg-green-100 text-green-600', amber: 'bg-amber-100 text-amber-600',
    blue: 'bg-blue-100 text-blue-600', purple: 'bg-purple-100 text-purple-600',
  }
  return map[color] ?? 'bg-gray-100 text-gray-600'
}

function statusBadge(status: string | null) {
  if (status === 'success')
    return <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">Success</span>
  if (status === 'partial')
    return <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700">Partial</span>
  return <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700">Failed</span>
}

// ─── History Tab ─────────────────────────────────────────────────────────────

function HistoryTab({ initialLogs }: { initialLogs: AutomationLogRow[] }) {
  const [logs, setLogs] = useState(initialLogs)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('automation_logs_realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'automation_logs' },
        (payload: any) => {
          setLogs((prev) => [payload.new as AutomationLogRow, ...prev.slice(0, 19)])
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-16">
        <History className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
        <p className="text-muted-foreground">No automation history yet.</p>
        <p className="text-sm text-muted-foreground/60 mt-1">Logs will appear here when rules fire.</p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 dark:border-gray-800">
            <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Time</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Rule</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Trigger</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actions</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
            <th className="w-8 px-4"></th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log, i) => (
            <>
              <tr
                key={log.id}
                className={cn(
                  'hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors',
                  i < logs.length - 1 && 'border-b border-gray-50 dark:border-gray-800'
                )}
                onClick={() => toggleExpand(log.id)}
              >
                <td className="px-6 py-4 text-muted-foreground text-xs">
                  {formatDistanceToNow(new Date(log.executed_at), { addSuffix: true })}
                </td>
                <td className="px-4 py-4 font-medium">{log.rule_name}</td>
                <td className="px-4 py-4 text-muted-foreground text-xs capitalize">
                  {log.trigger_event.replace(/_/g, ' ')}
                </td>
                <td className="px-4 py-4">
                  <span className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                    {Array.isArray(log.actions_executed) ? log.actions_executed.length : '–'} actions
                  </span>
                </td>
                <td className="px-4 py-4">{statusBadge(log.status)}</td>
                <td className="px-4 py-4">
                  {expanded.has(log.id) ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                </td>
              </tr>
              {expanded.has(log.id) && (
                <tr key={`${log.id}-expand`} className="bg-gray-50 dark:bg-gray-800/50">
                  <td colSpan={6} className="px-6 py-4">
                    {log.error_message && (
                      <p className="text-xs text-red-600 mb-2 font-mono">{log.error_message}</p>
                    )}
                    <pre className="text-xs text-muted-foreground overflow-auto max-h-32">
                      {JSON.stringify(log.results ?? log.actions_executed, null, 2)}
                    </pre>
                  </td>
                </tr>
              )}
            </>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Templates Tab ───────────────────────────────────────────────────────────

function TemplatesTab() {
  const [seeding, setSeeding] = useState<string | null>(null)

  const useTemplate = async (template: typeof TEMPLATES[number]) => {
    setSeeding(template.name)
    try {
      const res = await fetch('/api/automations/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: template.name,
          description: template.description,
          trigger_event: template.trigger_event,
          trigger_conditions: template.trigger_conditions,
          actions: template.actions,
          is_active: true,
        }),
      })
      if (!res.ok) throw new Error('Failed to create rule')
      toast.success(`"${template.name}" template applied!`)
    } catch {
      toast.error('Failed to create automation from template')
    } finally {
      setSeeding(null)
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {TEMPLATES.map((template) => {
        const Icon = template.icon
        return (
          <div
            key={template.name}
            className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-100 dark:border-gray-800 hover:shadow-md transition-all"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0', iconBgClass(template.color))}>
                <Icon className="w-4 h-4" />
              </div>
              <h3 className="font-semibold text-sm">{template.name}</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-4 leading-relaxed">{template.description}</p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => useTemplate(template)}
              disabled={seeding === template.name}
              className="w-full rounded-xl text-xs gap-1.5"
            >
              {seeding === template.name ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <LayoutTemplate className="w-3 h-3" />
              )}
              Use Template
            </Button>
          </div>
        )
      })}
    </div>
  )
}

// ─── Main Tabs ────────────────────────────────────────────────────────────────

export function AutomationsTabs({
  rules,
  logs,
}: {
  rules: AutomationRuleRow[]
  logs: AutomationLogRow[]
}) {
  const activeRules = rules.filter((r) => r.is_active)
  const allRules = rules

  return (
    <Tabs defaultValue="rules">
      <div className="flex items-center bg-white dark:bg-gray-900 p-2 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm mb-6">
        <TabsList className="bg-transparent h-10 gap-1 flex-1">
          <TabsTrigger value="rules" className="rounded-xl px-6 font-bold data-[state=active]:bg-zinc-100 dark:data-[state=active]:bg-gray-800 data-[state=active]:shadow-none transition-all">
            Active Rules
            {activeRules.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">{activeRules.length}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="history" className="rounded-xl px-6 font-bold data-[state=active]:bg-zinc-100 dark:data-[state=active]:bg-gray-800 data-[state=active]:shadow-none transition-all">
            History
          </TabsTrigger>
          <TabsTrigger value="templates" className="rounded-xl px-6 font-bold data-[state=active]:bg-zinc-100 dark:data-[state=active]:bg-gray-800 data-[state=active]:shadow-none transition-all">
            Templates
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="rules">
        {allRules.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-3xl bg-violet-50 flex items-center justify-center mx-auto mb-4">
              <Zap className="w-8 h-8 text-violet-400" />
            </div>
            <h3 className="font-bold text-lg mb-2">No automations yet</h3>
            <p className="text-muted-foreground text-sm mb-6">
              Create your first automation to start saving time.
            </p>
            <CreateRuleButton />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allRules.map((rule) => (
              <AutomationRuleCard key={rule.id} rule={rule} />
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="history">
        <HistoryTab initialLogs={logs} />
      </TabsContent>

      <TabsContent value="templates">
        <TemplatesTab />
      </TabsContent>
    </Tabs>
  )
}
