import { createClient } from '@/lib/supabase/server'
import { 
  TriggerEvent, 
  AutomationAction, 
  TriggerConditions, 
  AutomationFireResult,
  LeadRow,
  JobRow
} from '@/lib/types/database.types'
import { sendWhatsAppJobScheduledCustomer } from '@/lib/notifications/whatsapp'
import { createNotification } from '@/lib/notifications/inApp'
import { matchTechnician } from '../ai/matchTechnician'

export async function fireAutomationRules(
  event: TriggerEvent,
  entityId: string,
  entityType: 'lead' | 'job',
  context?: Record<string, unknown>
): Promise<AutomationFireResult[]> {
  const supabase = await createClient()

  // 1. Fetch active rules
  const { data: rules } = await supabase
    .from('automation_rules')
    .select('*')
    .eq('trigger_event', event)
    .eq('is_active', true)

  if (!rules?.length) return []

  // 2. Fetch entity
  const table = entityType === 'lead' ? 'leads' : 'jobs'
  const { data: entity } = await supabase
    .from(table)
    .select(entityType === 'lead' ? '*' : '*, leads(*)')
    .eq('id', entityId)
    .single()

  if (!entity) return []

  const fireResults: AutomationFireResult[] = []

  for (const rule of rules) {
    const matched = evaluateConditions(rule.trigger_conditions, entity)
    
    if (!matched) {
      fireResults.push({
        ruleId: rule.id,
        ruleName: rule.name,
        conditionsMatched: false,
        actionsExecuted: 0,
        status: 'success',
        results: {}
      })
      continue
    }

    // 3. Execute actions
    const executionResults = await executeActions(rule.actions, entity, context, supabase)
    const successCount = executionResults.filter(r => r.status === 'fulfilled').length
    const status = successCount === rule.actions.length ? 'success' : successCount > 0 ? 'partial' : 'failed'

    // 4. Log
    await supabase.from('automation_logs').insert({
      rule_id: rule.id,
      rule_name: rule.name,
      trigger_event: event,
      trigger_entity_id: entityId,
      trigger_entity_type: entityType,
      actions_executed: rule.actions,
      results: executionResults,
      status
    })

    // 5. Update rule
    await supabase.from('automation_rules')
      .update({ 
        execution_count: (rule.execution_count || 0) + 1,
        last_executed_at: new Date().toISOString()
      })
      .eq('id', rule.id)

    fireResults.push({
      ruleId: rule.id,
      ruleName: rule.name,
      conditionsMatched: true,
      actionsExecuted: rule.actions.length,
      status,
      results: { details: executionResults }
    })
  }

  return fireResults
}

function evaluateConditions(
  conditions: TriggerConditions,
  entity: any
): boolean {
  if (!conditions || Object.keys(conditions).length === 0) return true

  const checks: boolean[] = []

  if (conditions.urgency) checks.push(entity.urgency === conditions.urgency)
  if (conditions.score_threshold) checks.push((entity.ai_score ?? 0) >= conditions.score_threshold)
  if (conditions.status) checks.push(entity.status === conditions.status)
  if (conditions.service_type) checks.push(entity.service_type === conditions.service_type)
  if (conditions.city_in) checks.push(conditions.city_in.includes(entity.city))
  
  // hours_without_response is complex, needs its own async check if needed, 
  // but usually it's a separate trigger. For now we assume true if not specifically handled.

  return checks.every(c => c === true)
}

async function executeActions(
  actions: AutomationAction[],
  entity: any,
  context: Record<string, unknown> | undefined,
  supabase: any
): Promise<any[]> {
  const results = await Promise.allSettled(actions.map(async (action) => {
    switch (action.type) {
      case 'change_lead_status':
        return await supabase.from('leads')
          .update({ status: action.status, updated_at: new Date().toISOString() })
          .eq('id', entity.id)

      case 'notify_admin':
        return await createNotification({
          forRoles: ['admin', 'manager', 'dispatcher'],
          title: 'Automation Alert',
          body: interpolate(action.message ?? '', entity),
          type: 'automation_fired',
          entityType: 'lead',
          entityId: entity.id,
          actionUrl: `/dashboard/leads/${entity.id}`
        })

      case 'create_notification':
        return await createNotification({
          forRoles: action.for_roles ?? ['admin', 'manager'],
          title: interpolate(action.title ?? '', entity),
          body: interpolate(action.body ?? '', entity),
          type: 'automation_fired',
          entityType: 'lead',
          entityId: entity.id,
          actionUrl: `/dashboard/leads/${entity.id}`
        })

      case 'assign_technician':
        if (action.method === 'ai_best_match') {
          const { data: techs } = await supabase.from('technicians').select('*').eq('is_active', true)
          const { data: jobCounts } = await supabase.rpc('get_technician_job_counts')
          const countsMap = jobCounts?.reduce((acc: any, curr: any) => ({ ...acc, [curr.technician_id]: curr.count }), {}) ?? {}
          
          const matches = await matchTechnician(entity, techs ?? [], countsMap)
          const match = matches[0] // Best match
          
          if (match) {
            await supabase.from('leads').update({ ai_matched_technician_id: match.technician_id }).eq('id', entity.id)
            return { matched: true, technician_id: match.technician_id }
          }
        }
        return { matched: false }

      case 'update_lead_priority':
        return await supabase.from('leads').update({ priority: action.priority }).eq('id', entity.id)

      default:
        return { status: 'unsupported_action' }
    }
  }))

  return results.map(r => r.status === 'fulfilled' ? { status: 'fulfilled', value: r.value } : { status: 'rejected', reason: r.reason })
}

function interpolate(text: string, entity: any): string {
  return text
    .replace(/{{lead\.name}}/g, entity.name ?? '')
    .replace(/{{lead\.city}}/g, entity.city ?? '')
    .replace(/{{lead\.description}}/g, entity.description ?? '')
    .replace(/{{job\.scheduled_time}}/g, entity.scheduled_time ?? '')
}
