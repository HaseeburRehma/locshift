// Complete Supabase-typed schema for FixDone
// Matches: profiles, leads, technicians, jobs, messages tables

// ─── Enums ──────────────────────────────────────────────────────────────────

export type LeadStatus = 'new' | 'qualified' | 'scheduled' | 'assigned' | 'completed' | 'lost' | 'matched' | 'cancelled'
export type LeadUrgency = 'low' | 'medium' | 'high' | 'urgent'
export type JobStatus = 'pending' | 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
export type MessageDirection = 'inbound' | 'outbound'
export type MessageChannel = 'whatsapp' | 'sms' | 'email' | 'phone'
export type UserRole = 'admin' | 'manager' | 'dispatcher' | 'disponent' | 'technician' | 'viewer' | 'partner_admin' | 'partner_agent'
export type CommissionModel = 'per_lead' | 'percentage' | 'flat_monthly'
export type AssignmentType = 'assigned' | 'purchased' | 'auto_matched'
export type PartnerLeadStatus = 'pending' | 'accepted' | 'rejected' | 'converted' | 'expired'
export type MarketplaceStatus = 'active' | 'sold' | 'expired' | 'withdrawn'

// ... (skipping lines until end)

export interface QualificationResult {
  score: number
  recommended_action: 'dispatch_now' | 'schedule' | 'follow_up' | 'disqualify'
  qualification_reason: string
  ai_summary: string
  confidence: 'high' | 'medium' | 'low'
  job_type?: string
  urgency: LeadUrgency
  estimated_value: string | number | null
  priority: 'low' | 'medium' | 'high' | 'urgent'
}

// ─── Table Row Types ─────────────────────────────────────────────────────────

export interface ProfileRow {
  id: string
  email: string | null
  full_name: string | null
  company_name: string | null
  partner_id: string | null
  technician_id: string | null
  is_active: boolean
  permissions: any
  role: UserRole
  created_at: string
  updated_at: string
}

export interface ProfileInsert {
  id: string
  email?: string | null
  full_name?: string | null
  company_name?: string | null
  partner_id?: string | null
  technician_id?: string | null
  is_active?: boolean
  permissions?: any
  role?: UserRole
  created_at?: string
  updated_at?: string
}

export interface ProfileUpdate {
  email?: string | null
  full_name?: string | null
  company_name?: string | null
  partner_id?: string | null
  technician_id?: string | null
  is_active?: boolean
  permissions?: any
  role?: UserRole
  updated_at?: string
}

export interface LeadRow {
  id: string
  name: string
  email: string | null
  phone: string
  postcode: string | null
  city: string | null
  description: string
  service_type: string
  job_type: string | null
  urgency: LeadUrgency
  budget: string | null
  estimated_value: string | null
  priority: string | null
  status: LeadStatus
  source: string
  created_at: string
  updated_at: string
  // AI Fields (Phase 4)
  ai_score: number | null
  ai_summary: string | null
  ai_recommended_action: string | null
  ai_matched_technician_id: string | null
  ai_processed_at: string | null
  ai_model_version: string | null
  qualification_reason: string | null
  street: string | null
  house_number: string | null
  latitude: number | null
  longitude: number | null
  full_address: string | null
}

export interface LeadInsert {
  id?: string
  name: string
  email?: string | null
  phone: string
  postcode?: string | null
  city?: string | null
  description: string
  service_type: string
  job_type?: string | null
  urgency?: LeadUrgency
  budget?: string | null
  estimated_value?: string | null
  priority?: string | null
  status?: LeadStatus
  source?: string
  created_at?: string
  updated_at?: string
  // AI Fields (Phase 4)
  ai_score?: number | null
  ai_summary?: string | null
  ai_recommended_action?: string | null
  ai_matched_technician_id?: string | null
  ai_processed_at?: string | null
  ai_model_version?: string | null
  qualification_reason?: string | null
  street?: string | null
  house_number?: string | null
  latitude?: number | null
  longitude?: number | null
  full_address?: string | null
}

export interface LeadUpdate {
  name?: string
  email?: string | null
  phone?: string
  postcode?: string | null
  city?: string | null
  description?: string
  service_type?: string
  job_type?: string | null
  urgency?: LeadUrgency
  budget?: string | null
  estimated_value?: string | null
  priority?: string | null
  status?: LeadStatus
  source?: string
  updated_at?: string
  // AI Fields (Phase 4)
  ai_score?: number | null
  ai_summary?: string | null
  ai_recommended_action?: string | null
  ai_matched_technician_id?: string | null
  ai_processed_at?: string | null
  ai_model_version?: string | null
  qualification_reason?: string | null
  street?: string | null
  house_number?: string | null
  latitude?: number | null
  longitude?: number | null
  full_address?: string | null
}

export interface TechnicianRow {
  id: string
  name: string
  email: string | null
  phone: string
  service_area: string[] | null
  skills: string[] | null
  is_available: boolean
  is_active: boolean
  created_at: string
}

export interface TechnicianInsert {
  id?: string
  name: string
  email?: string | null
  phone: string
  service_area?: string[] | null
  skills?: string[] | null
  is_available?: boolean
  is_active?: boolean
  created_at?: string
}

export interface TechnicianUpdate {
  name?: string
  email?: string | null
  phone?: string
  service_area?: string[] | null
  skills?: string[] | null
  is_available?: boolean
  is_active?: boolean
}

export interface JobRow {
  id: string
  lead_id: string
  technician_id: string | null
  scheduled_time: string | null
  estimated_duration: number
  actual_duration: number | null
  notes: string | null
  status: JobStatus
  review_requested: boolean
  review_requested_at: string | null
  review_received: boolean
  review_rating: number | null
  review_text: string | null
  created_at: string
  updated_at: string
}

export interface JobInsert {
  id?: string
  lead_id: string
  technician_id?: string | null
  scheduled_time?: string | null
  estimated_duration?: number
  actual_duration?: number | null
  notes?: string | null
  status?: JobStatus
  review_requested?: boolean
  review_requested_at?: string | null
  review_received?: boolean
  review_rating?: number | null
  review_text?: string | null
  created_at?: string
  updated_at?: string
}

export interface JobUpdate {
  technician_id?: string | null
  scheduled_time?: string | null
  estimated_duration?: number
  actual_duration?: number | null
  notes?: string | null
  status?: JobStatus
  review_requested?: boolean
  review_requested_at?: string | null
  review_received?: boolean
  review_rating?: number | null
  review_text?: string | null
  updated_at?: string
}

export interface MessageRow {
  id: string
  job_id: string | null
  lead_id: string | null
  direction: MessageDirection
  channel: MessageChannel
  content: string
  status: 'pending' | 'sent' | 'delivered' | 'failed'
  sent_at: string | null
  created_at: string
}

export interface MessageInsert {
  id?: string
  job_id?: string | null
  lead_id?: string | null
  direction: MessageDirection
  channel: MessageChannel
  content: string
  status?: 'pending' | 'sent' | 'delivered' | 'failed'
  sent_at?: string | null
  created_at?: string
}

export interface MessageUpdate {
  status?: 'pending' | 'sent' | 'delivered' | 'failed'
  sent_at?: string | null
}

// ─── New Phase 3 Tables ──────────────────────────────────────────────────────

export interface PartnerRow {
  id: string
  company_name: string
  contact_name: string
  email: string
  phone: string | null
  service_areas: string[] | null
  service_types: string[] | null
  commission_model: CommissionModel | null
  commission_rate: number | null
  monthly_fee: number | null
  is_active: boolean
  stripe_customer_id: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface PartnerInsert {
  id?: string
  company_name: string
  contact_name: string
  email: string
  phone?: string | null
  service_areas?: string[] | null
  service_types?: string[] | null
  commission_model?: CommissionModel | null
  commission_rate?: number | null
  monthly_fee?: number | null
  is_active?: boolean
  stripe_customer_id?: string | null
  notes?: string | null
  created_at?: string
  updated_at?: string
}

export interface PartnerUpdate {
  company_name?: string
  contact_name?: string
  email?: string
  phone?: string | null
  service_areas?: string[] | null
  service_types?: string[] | null
  commission_model?: CommissionModel | null
  commission_rate?: number | null
  monthly_fee?: number | null
  is_active?: boolean
  stripe_customer_id?: string | null
  notes?: string | null
  updated_at?: string
}

export interface PartnerLeadRow {
  id: string
  partner_id: string
  lead_id: string
  assigned_by: string | null
  assignment_type: AssignmentType | null
  status: PartnerLeadStatus | null
  commission_amount: number | null
  commission_paid: boolean
  commission_paid_at: string | null
  partner_notes: string | null
  viewed_at: string | null
  accepted_at: string | null
  rejected_at: string | null
  rejection_reason: string | null
  expires_at: string | null
  created_at: string
  updated_at: string
}

export interface PartnerLeadInsert {
  id?: string
  partner_id: string
  lead_id: string
  assigned_by?: string | null
  assignment_type?: AssignmentType | null
  status?: PartnerLeadStatus | null
  commission_amount?: number | null
  commission_paid?: boolean
  commission_paid_at?: string | null
  partner_notes?: string | null
  viewed_at?: string | null
  accepted_at?: string | null
  rejected_at?: string | null
  rejection_reason?: string | null
  expires_at?: string | null
  created_at?: string
  updated_at?: string
}

export interface PartnerLeadUpdate {
  assignment_type?: AssignmentType | null
  status?: PartnerLeadStatus | null
  commission_amount?: number | null
  commission_paid?: boolean
  commission_paid_at?: string | null
  partner_notes?: string | null
  viewed_at?: string | null
  accepted_at?: string | null
  rejected_at?: string | null
  rejection_reason?: string | null
  expires_at?: string | null
  updated_at?: string
}

export interface LeadMarketplaceRow {
  id: string
  lead_id: string
  listed_by: string | null
  price: number
  is_exclusive: boolean
  max_claims: number | null
  current_claims: number | null
  status: MarketplaceStatus | null
  listed_at: string | null
  expires_at: string | null
  lead_preview: any | null
  created_at: string
}

export interface LeadMarketplaceInsert {
  id?: string
  lead_id: string
  listed_by?: string | null
  price: number
  is_exclusive?: boolean
  max_claims?: number | null
  current_claims?: number | null
  status?: MarketplaceStatus | null
  listed_at?: string | null
  expires_at?: string | null
  lead_preview?: any | null
  created_at?: string
}

export interface LeadMarketplaceUpdate {
  price?: number
  is_exclusive?: boolean
  max_claims?: number | null
  current_claims?: number | null
  status?: MarketplaceStatus | null
  expires_at?: string | null
  lead_preview?: any | null
}

export interface PartnerCreditRow {
  id: string
  partner_id: string
  amount: number
  transaction_type: string
  reference_id: string | null
  description: string | null
  balance_after: number | null
  created_at: string
}

export interface PartnerCreditInsert {
  id?: string
  partner_id: string
  amount: number
  transaction_type: string
  reference_id?: string | null
  description?: string | null
  balance_after?: number | null
  created_at?: string
}

export interface PartnerCreditUpdate {
  description?: string | null
}

// ─── New Phase 4 Tables ──────────────────────────────────────────────────────

export interface AutomationRuleRow {
  id: string
  name: string
  description: string | null
  is_active: boolean
  trigger_event: TriggerEvent
  trigger_conditions: Record<string, unknown>
  actions: AutomationAction[]
  execution_count: number
  last_executed_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface AutomationRuleInsert {
  id?: string
  name: string
  description?: string | null
  is_active?: boolean
  trigger_event: TriggerEvent
  trigger_conditions?: Record<string, unknown>
  actions: AutomationAction[]
  execution_count?: number
  last_executed_at?: string | null
  created_by?: string | null
  created_at?: string
  updated_at?: string
}

export interface AutomationRuleUpdate {
  name?: string
  description?: string | null
  is_active?: boolean
  trigger_event?: TriggerEvent
  trigger_conditions?: Record<string, unknown>
  actions?: AutomationAction[]
  updated_at?: string
}

export interface AutomationLogRow {
  id: string
  rule_id: string | null
  rule_name: string
  trigger_event: string
  trigger_entity_id: string
  trigger_entity_type: 'lead' | 'job'
  actions_executed: any | null
  results: any | null
  status: 'success' | 'partial' | 'failed' | null
  error_message: string | null
  executed_at: string
}

export interface AutomationLogInsert {
  id?: string
  rule_id?: string | null
  rule_name: string
  trigger_event: string
  trigger_entity_id: string
  trigger_entity_type: 'lead' | 'job'
  actions_executed?: any | null
  results?: any | null
  status?: 'success' | 'partial' | 'failed' | null
  error_message?: string | null
  executed_at?: string
}

export interface ReviewRow {
  id: string
  job_id: string | null
  lead_id: string | null
  technician_id: string | null
  rating: number | null
  title: string | null
  review_text: string | null
  customer_name: string
  is_published: boolean
  is_verified: boolean
  review_token: string
  token_used_at: string | null
  source: 'email' | 'whatsapp' | 'manual' | null
  admin_response: string | null
  admin_response_at: string | null
  created_at: string
  updated_at: string
}

export interface ReviewInsert {
  id?: string
  job_id?: string | null
  lead_id?: string | null
  technician_id?: string | null
  rating?: number | null
  title?: string | null
  review_text?: string | null
  customer_name: string
  is_published?: boolean
  is_verified?: boolean
  review_token?: string
  token_used_at?: string | null
  source?: 'email' | 'whatsapp' | 'manual' | null
  admin_response?: string | null
  admin_response_at?: string | null
  created_at?: string
  updated_at?: string
}

export interface ReviewUpdate {
  rating?: number | null
  title?: string | null
  review_text?: string | null
  is_published?: boolean
  token_used_at?: string | null
  admin_response?: string | null
  admin_response_at?: string | null
  updated_at?: string
}

export interface NotificationRow {
  id: string
  user_id: string
  title: string
  body: string | null
  type: string
  entity_type: 'lead' | 'job' | 'review' | 'partner_lead' | null
  entity_id: string | null
  action_url: string | null
  is_read: boolean
  read_at: string | null
  created_at: string
}

export interface NotificationInsert {
  id?: string
  user_id: string
  title: string
  body?: string | null
  type: string
  entity_type?: 'lead' | 'job' | 'review' | 'partner_lead' | null
  entity_id?: string | null
  action_url?: string | null
  is_read?: boolean
  read_at?: string | null
  created_at?: string
}

export interface NotificationUpdate {
  is_read?: boolean
  read_at?: string | null
}

export interface AnalyticsDailyRow {
  id: string
  date: string
  new_leads: number
  qualified_leads: number
  jobs_created: number
  jobs_completed: number
  revenue_estimated: number
  avg_lead_score: number | null
  technician_utilization: any | null
  conversion_rate: number | null
  avg_response_time_minutes: number | null
  notifications_sent: number
  created_at: string
}

export interface AnalyticsDailyInsert {
  id?: string
  date: string
  new_leads?: number
  qualified_leads?: number
  jobs_created?: number
  jobs_completed?: number
  revenue_estimated?: number
  avg_lead_score?: number | null
  technician_utilization?: any | null
  conversion_rate?: number | null
  avg_response_time_minutes?: number | null
  notifications_sent?: number
  created_at?: string
}

export interface AnalyticsDailyUpdate {
  new_leads?: number
  qualified_leads?: number
  jobs_created?: number
  jobs_completed?: number
  revenue_estimated?: number
  avg_lead_score?: number | null
  technician_utilization?: any | null
  conversion_rate?: number | null
  avg_response_time_minutes?: number | null
  notifications_sent?: number
}

// ─── Database Interface ──────────────────────────────────────────────────────

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow
        Insert: ProfileInsert
        Update: ProfileUpdate
      }
      leads: {
        Row: LeadRow
        Insert: LeadInsert
        Update: LeadUpdate
      }
      technicians: {
        Row: TechnicianRow
        Insert: TechnicianInsert
        Update: TechnicianUpdate
      }
      jobs: {
        Row: JobRow
        Insert: JobInsert
        Update: JobUpdate
      }
      messages: {
        Row: MessageRow
        Insert: MessageInsert
        Update: MessageUpdate
      }
      partners: {
        Row: PartnerRow
        Insert: PartnerInsert
        Update: PartnerUpdate
      }
      partner_leads: {
        Row: PartnerLeadRow
        Insert: PartnerLeadInsert
        Update: PartnerLeadUpdate
      }
      lead_marketplace: {
        Row: LeadMarketplaceRow
        Insert: LeadMarketplaceInsert
        Update: LeadMarketplaceUpdate
      }
      partner_credits: {
        Row: PartnerCreditRow
        Insert: PartnerCreditInsert
        Update: PartnerCreditUpdate
      }
      automation_rules: {
        Row: AutomationRuleRow
        Insert: AutomationRuleInsert
        Update: AutomationRuleUpdate
      }
      automation_logs: {
        Row: AutomationLogRow
        Insert: AutomationLogInsert
        Update: never
      }
      reviews: {
        Row: ReviewRow
        Insert: ReviewInsert
        Update: ReviewUpdate
      }
      notifications: {
        Row: NotificationRow
        Insert: NotificationInsert
        Update: NotificationUpdate
      }
      analytics_daily: {
        Row: AnalyticsDailyRow
        Insert: AnalyticsDailyInsert
        Update: AnalyticsDailyUpdate
      }
    }
    Views: Record<string, never>
    Functions: {
      get_my_role: {
        Args: Record<string, never>
        Returns: string
      }
      get_my_partner_id: {
        Args: Record<string, never>
        Returns: string
      }
      get_my_technician_id: {
        Args: Record<string, never>
        Returns: string
      }
    }
    Enums: {
      lead_status: LeadStatus
      lead_urgency: LeadUrgency
      job_status: JobStatus
      message_direction: MessageDirection
      message_channel: MessageChannel
      user_role: UserRole
      commission_model: CommissionModel
      assignment_type: AssignmentType
      partner_lead_status: PartnerLeadStatus
      marketplace_status: MarketplaceStatus
    }
  }
}

// ─── Standalone Types ────────────────────────────────────────────────────────

export type TriggerEvent =
  | 'lead_created' | 'lead_status_changed' | 'job_created'
  | 'job_status_changed' | 'job_completed' | 'lead_score_above'
  | 'lead_urgency_is' | 'no_response_after' | 'partner_purchased_lead'

export type ActionType =
  | 'send_whatsapp' | 'send_email' | 'assign_technician'
  | 'change_lead_status' | 'create_notification' | 'notify_admin'
  | 'update_lead_priority'

export interface AutomationAction {
  type: ActionType
  to?: 'customer' | 'technician' | 'admin'
  template?: string
  message?: string
  status?: string
  priority?: string
  title?: string
  body?: string
  for_roles?: UserRole[]
  method?: 'ai_best_match'
}

export interface TriggerConditions {
  urgency?: string
  score_threshold?: number
  status?: string
  service_type?: string
  city_in?: string[]
  hours_without_response?: number
}

export type NotificationType =
  | 'new_lead' | 'lead_qualified' | 'job_assigned' | 'job_completed'
  | 'partner_purchased' | 'review_received' | 'automation_fired'
  | 'technician_unavailable' | 'urgent_lead'



export interface MatchResult {
  technician_id: string
  technician_name: string
  score: number
  reason: string
  areaMatch: boolean
  skillMatch: boolean
  workloadScore: number
}

export interface AutomationFireResult {
  ruleId: string
  ruleName: string
  conditionsMatched: boolean
  actionsExecuted: number
  status: 'success' | 'partial' | 'failed'
  results: Record<string, unknown>
}
