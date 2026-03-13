'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import type { Lead, Technician } from '@/lib/types'

// ─── Zod Schemas ─────────────────────────────────────────────────────────────

const LeadStatusSchema = z.enum([
  'new', 'qualified', 'matched', 'scheduled', 'assigned', 'completed', 'cancelled',
])

const LeadUrgencySchema = z.enum(['low', 'medium', 'high'])

const JobStatusSchema = z.enum([
  'pending', 'awaiting_approval', 'scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled',
])

const MessageChannelSchema = z.enum(['whatsapp', 'sms', 'email'])

const AssignTechnicianSchema = z.object({
  leadId: z.string().uuid(),
  technicianId: z.string().uuid(),
  scheduledTime: z.string().datetime({ offset: true }).or(z.string().min(1)),
  estimatedDuration: z.coerce.number().int().min(30).max(480),
  notes: z.string().optional(),
})

const SendMessageSchema = z.object({
  leadId: z.string().uuid(),
  jobId: z.string().uuid().optional(),
  channel: MessageChannelSchema,
  content: z.string().min(10, 'Message must be at least 10 characters'),
})

const CreateLeadSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().min(6, 'Phone is required'),
  email: z.string().email().optional().or(z.literal('')),
  street: z.string().optional(),
  house_no: z.string().optional(),
  postcode: z.string().optional(),
  city: z.string().optional(),
  description: z.string().min(20, 'Description must be at least 20 characters'),
  service_type: z.string().min(1),
  job_type: z.string().optional(),
  urgency: LeadUrgencySchema.default('medium'),
  budget: z.string().optional(),
  estimated_value: z.string().optional(),
  source: z.string().default('other'),
})

const UpdateJobStatusSchema = z.object({
  jobId: z.string().uuid(),
  status: JobStatusSchema,
  leadId: z.string().uuid().optional(),
})

// ─── Action Result Type ───────────────────────────────────────────────────────

type ActionResult<T = undefined> =
  | { success: true; data?: T; error?: undefined }
  | { success: false; error: string; data?: undefined }

// ─── Update Lead Status ───────────────────────────────────────────────────────

export async function updateLeadStatus(
  leadId: string,
  status: Lead['status'],
): Promise<ActionResult> {
  const parsed = LeadStatusSchema.safeParse(status)
  if (!parsed.success) {
    return { success: false, error: 'Invalid status value' }
  }

  try {
    const supabase = await createClient()
    const { error } = await supabase
      .from('leads')
      .update({ status: parsed.data, updated_at: new Date().toISOString() })
      .eq('id', leadId)

    if (error) return { success: false, error: error.message }

    revalidatePath('/dashboard/leads')
    revalidatePath(`/dashboard/leads/${leadId}`)
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

// ─── Assign Technician ────────────────────────────────────────────────────────

export async function assignTechnician(
  input: z.infer<typeof AssignTechnicianSchema>,
): Promise<ActionResult<{ jobId: string }>> {
  const parsed = AssignTechnicianSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? 'Validation error' }
  }

  const { leadId, technicianId, scheduledTime, estimatedDuration, notes } = parsed.data

  try {
    const supabase = await createClient()

    // Create the job
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .insert({
        lead_id: leadId,
        technician_id: technicianId,
        scheduled_time: new Date(scheduledTime).toISOString(),
        estimated_duration: estimatedDuration,
        notes: notes ?? null,
        status: 'scheduled',
        review_requested: false,
        review_received: false,
      })
      .select('id')
      .single()

    if (jobError) return { success: false, error: jobError.message }

    // Update lead status to 'assigned'
    const { error: leadError } = await supabase
      .from('leads')
      .update({ status: 'assigned', updated_at: new Date().toISOString() })
      .eq('id', leadId)

    if (leadError) return { success: false, error: leadError.message }

    revalidatePath('/dashboard/leads')
    revalidatePath(`/dashboard/leads/${leadId}`)
    revalidatePath('/dashboard/jobs')
    return { success: true, data: { jobId: job.id } }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

// ─── Update Job Status ────────────────────────────────────────────────────────

export async function updateJobStatus(
  jobId: string,
  status: string,
  leadId?: string,
): Promise<ActionResult> {
  const parsed = UpdateJobStatusSchema.safeParse({ jobId, status, leadId })
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? 'Validation error' }
  }

  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('jobs')
      .update({ status: parsed.data.status, updated_at: new Date().toISOString() })
      .eq('id', jobId)

    if (error) return { success: false, error: error.message }

    // Sync lead status when job completes
    if (leadId && parsed.data.status === 'completed') {
      await supabase
        .from('leads')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('id', leadId)
    }

    revalidatePath('/dashboard/jobs')
    if (leadId) revalidatePath(`/dashboard/leads/${leadId}`)
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

// ─── Send Message ─────────────────────────────────────────────────────────────

export async function sendMessage(
  input: z.infer<typeof SendMessageSchema>,
): Promise<ActionResult> {
  const parsed = SendMessageSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? 'Validation error' }
  }

  const { leadId, jobId, channel, content } = parsed.data

  try {
    const supabase = await createClient()

    const { error } = await supabase.from('messages').insert({
      lead_id: leadId,
      job_id: jobId ?? null,
      direction: 'outbound',
      channel,
      content,
      status: 'sent',
      sent_at: new Date().toISOString(),
    })

    if (error) return { success: false, error: error.message }

    revalidatePath(`/dashboard/leads/${leadId}`)
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

// ─── Create Lead ──────────────────────────────────────────────────────────────

export async function createLead(
  input: z.infer<typeof CreateLeadSchema>,
): Promise<ActionResult<{ leadId: string }>> {
  const parsed = CreateLeadSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? 'Validation error' }
  }

  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('leads')
      .insert({
        name: parsed.data.name,
        phone: parsed.data.phone,
        email: parsed.data.email || null,
        street: parsed.data.street || null,
        house_no: parsed.data.house_no || null,
        postcode: parsed.data.postcode || null,
        city: parsed.data.city || null,
        description: parsed.data.description,
        service_type: parsed.data.service_type,
        job_type: parsed.data.job_type || null,
        urgency: parsed.data.urgency,
        budget: parsed.data.budget || null,
        estimated_value: parsed.data.estimated_value || null,
        source: parsed.data.source,
        status: 'new',
        priority: 'schedule',
      })
      .select('id')
      .single()

    if (error) return { success: false, error: error.message }

    revalidatePath('/dashboard/leads')
    return { success: true, data: { leadId: data.id } }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}
