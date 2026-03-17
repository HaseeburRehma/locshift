import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { withTimeout } from '@/lib/supabase/with-timeout'
import { AutomationsTabs } from '@/components/automations/AutomationsTabs'
import { CreateRuleButton } from '@/components/automations/CreateRuleButton'
import { Zap } from 'lucide-react'
import type { AutomationRuleRow, AutomationLogRow } from '@/lib/types/database.types'

export default async function AutomationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await withTimeout(
    supabase.auth.getUser(),
    5000,
    { data: { user: null }, error: null } as any
  )
  if (!user) redirect('/auth/login')

  const fallback = { data: [] as any[], error: null }

  const [rulesResult, logsResult] = await Promise.allSettled([
    withTimeout(
      supabase
        .from('automation_rules')
        .select('*')
        .order('is_active', { ascending: false })
        .order('created_at', { ascending: false }) as any,
      8000,
      fallback
    ),
    withTimeout(
      supabase
        .from('automation_logs')
        .select('*')
        .order('executed_at', { ascending: false })
        .limit(20) as any,
      8000,
      fallback
    ),
  ])

  const rules: AutomationRuleRow[] =
    rulesResult.status === 'fulfilled' ? (rulesResult.value.data ?? []) : []

  const logs: AutomationLogRow[] =
    logsResult.status === 'fulfilled' ? (logsResult.value.data ?? []) : []

  const activeCount = rules.filter((r) => r.is_active).length

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-border/50">
        <div className="space-y-2">
          <h1 className="text-4xl font-black tracking-tight flex items-center gap-3">
            <div className="h-10 w-10 flex items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
              <Zap className="h-6 w-6" />
            </div>
            AI Automations
            <span className="px-3 py-1 rounded-full text-sm font-bold bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
              {activeCount} ACTIVE
            </span>
          </h1>
          <p className="text-muted-foreground font-medium">
            Design and manage AI-powered workflows to reduce manual work.
          </p>
        </div>

        <CreateRuleButton />
      </div>

      {/* Content tabs */}
      <AutomationsTabs rules={rules} logs={logs} />
    </div>
  )
}
