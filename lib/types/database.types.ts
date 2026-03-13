// Complete Supabase-typed schema for FixDone
// Matches: profiles, leads, technicians, jobs, messages tables

// ─── Enums ──────────────────────────────────────────────────────────────────

export type LeadStatus = 'new' | 'qualified' | 'scheduled' | 'assigned' | 'completed' | 'lost' | 'matched' | 'cancelled'
export type LeadUrgency = 'low' | 'medium' | 'high' | 'urgent'
export type JobStatus = 'pending' | 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
export type MessageDirection = 'inbound' | 'outbound'
export type MessageChannel = 'whatsapp' | 'sms' | 'email' | 'phone'
export type UserRole = 'admin' | 'manager' | 'dispatcher' | 'technician' | 'viewer'

// ─── Table Row Types ─────────────────────────────────────────────────────────

export interface ProfileRow {
  id: string
  email: string | null
  full_name: string | null
  role: UserRole
  created_at: string
  updated_at: string
}

export interface ProfileInsert {
  id: string
  email?: string | null
  full_name?: string | null
  role?: UserRole
  created_at?: string
  updated_at?: string
}

export interface ProfileUpdate {
  email?: string | null
  full_name?: string | null
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
  estimated_value: string | null
  priority: string | null
  status: LeadStatus
  source: string
  created_at: string
  updated_at: string
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
  estimated_value?: string | null
  priority?: string | null
  status?: LeadStatus
  source?: string
  created_at?: string
  updated_at?: string
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
  estimated_value?: string | null
  priority?: string | null
  status?: LeadStatus
  source?: string
  updated_at?: string
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
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      lead_status: LeadStatus
      lead_urgency: LeadUrgency
      job_status: JobStatus
      message_direction: MessageDirection
      message_channel: MessageChannel
      user_role: UserRole
    }
  }
}
