import { createClient } from '@/lib/supabase/server'
import { AutomationRuleInsert } from '@/lib/types/database.types'

export const DEFAULT_AUTOMATION_RULES: AutomationRuleInsert[] = [
  {
    name: "Auto-qualify new leads",
    description: "Runs AI qualification on every new lead",
    trigger_event: "lead_created",
    trigger_conditions: {}, 
    actions: [
      { type: "change_lead_status", status: "qualified" },
      { type: "notify_admin", 
        message: "New lead received and auto-qualified: {{lead.name}}" }
    ],
    is_active: true
  },
  {
    name: "Urgent lead — immediate alert",
    description: "Alerts admins when an urgent lead is received",
    trigger_event: "lead_created",
    trigger_conditions: { urgency: "urgent" },
    actions: [
      { type: "notify_admin", 
        message: "🚨 URGENT lead: {{lead.name}} in {{lead.city}}" },
      { type: "create_notification", 
        title: "Urgent Lead Received",
        body: "A new urgent lead requires immediate attention from {{lead.name}}.",
        for_roles: ["admin", "manager", "dispatcher"]
      }
    ],
    is_active: true
  },
  {
    name: "Job completed — request review",
    description: "Triggers a review request notification when a job is marked completed",
    trigger_event: "job_completed",
    trigger_conditions: {},
    actions: [
      { type: "create_notification", 
        title: "Job Completed",
        body: "A review request will be sent to the customer for the job in {{lead.city}}.",
        for_roles: ["admin", "manager"]
      }
    ],
    is_active: true
  },
  {
    name: "High score lead — auto assign",
    description: "Auto-assigns best technician if AI score is above 80",
    trigger_event: "lead_created",
    trigger_conditions: { score_threshold: 80 },
    actions: [
      { type: "assign_technician", method: "ai_best_match" },
      { type: "change_lead_status", status: "assigned" }
    ],
    is_active: true
  }
]

export async function seedDefaultRules() {
  const supabase = await createClient()
  
  const { count } = await supabase
    .from('automation_rules')
    .select('*', { count: 'exact', head: true })

  if (count === 0) {
    const { error } = await supabase
      .from('automation_rules')
      .insert(DEFAULT_AUTOMATION_RULES)
    
    if (error) {
      console.error('[seedDefaultRules] Error seeding:', error)
    } else {
      console.log(`[seedDefaultRules] Seeded ${DEFAULT_AUTOMATION_RULES.length} rules.`)
    }
  }
}
