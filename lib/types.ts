// RBAC Types
export type UserRole = 'admin' | 'manager' | 'dispatcher' | 'technician' | 'viewer'

export interface Profile {
  id: string
  email: string | null
  full_name: string | null
  role: UserRole
  created_at: string
  updated_at: string
}

export interface UserWithProfile {
  id: string
  email: string
  profile: Profile | null
}

// Role permissions
export const ROLE_PERMISSIONS: Record<UserRole, {
  canManageLeads: boolean
  canManageTechnicians: boolean
  canManageJobs: boolean
  canSendMessages: boolean
  canRunAgents: boolean
  canViewReports: boolean
  canManageUsers: boolean
}> = {
  admin: {
    canManageLeads: true,
    canManageTechnicians: true,
    canManageJobs: true,
    canSendMessages: true,
    canRunAgents: true,
    canViewReports: true,
    canManageUsers: true,
  },
  manager: {
    canManageLeads: true,
    canManageTechnicians: true,
    canManageJobs: true,
    canSendMessages: true,
    canRunAgents: true,
    canViewReports: true,
    canManageUsers: false,
  },
  dispatcher: {
    canManageLeads: true,
    canManageTechnicians: false,
    canManageJobs: true,
    canSendMessages: true,
    canRunAgents: true,
    canViewReports: false,
    canManageUsers: false,
  },
  technician: {
    canManageLeads: false,
    canManageTechnicians: false,
    canManageJobs: false,
    canSendMessages: false,
    canRunAgents: false,
    canViewReports: false,
    canManageUsers: false,
  },
  viewer: {
    canManageLeads: false,
    canManageTechnicians: false,
    canManageJobs: false,
    canSendMessages: false,
    canRunAgents: false,
    canViewReports: false,
    canManageUsers: false,
  },
}

export interface Lead {
  id: string
  name: string
  email: string | null
  phone: string
  street: string | null
  house_no: string | null
  postcode: string | null
  city: string | null
  description: string
  service_type: string
  job_type: string | null
  urgency: 'low' | 'medium' | 'high'
  budget: string | null
  estimated_value: string | null
  priority: string | null
  status: 'new' | 'qualified' | 'matched' | 'scheduled' | 'completed' | 'cancelled'
  source: string
  created_at: string
  updated_at: string
}

export interface Technician {
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

export interface Job {
  id: string
  lead_id: string
  technician_id: string | null
  scheduled_time: string | null
  estimated_duration: number
  actual_duration: number | null
  notes: string | null
  status: 'pending' | 'awaiting_approval' | 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
  review_requested: boolean
  review_requested_at: string | null
  review_received: boolean
  review_rating: number | null
  review_text: string | null
  created_at: string
  updated_at: string
  // Joined data
  lead?: Lead
  technician?: Technician
}

export interface Message {
  id: string
  job_id: string | null
  lead_id: string | null
  direction: 'inbound' | 'outbound'
  channel: 'sms' | 'email' | 'whatsapp'
  content: string
  status: 'pending' | 'sent' | 'delivered' | 'failed'
  sent_at: string | null
  created_at: string
}

export interface QualificationResult {
  is_qualified: boolean
  job_type: string
  urgency: 'low' | 'medium' | 'high'
  estimated_value: string
  priority: string
  reasoning: string
}

export interface MatchResult {
  technician_id: string
  technician_name: string
  match_score: number
  reasoning: string
}
