import { Resend } from 'resend'
import { JobScheduledCustomer } from '../email-templates/JobScheduledCustomer'
import { JobScheduledTechnician } from '../email-templates/JobScheduledTechnician'
import { JobCompletedCustomer } from '../email-templates/JobCompletedCustomer'
import { JobReminderCustomer } from '../email-templates/JobReminderCustomer'

const resend = new Resend(process.env.RESEND_API_KEY || 're_mock_key')
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@fixdone.de'

export async function sendJobScheduledCustomer(params: {
  to: string, customerName: string, jobType: string,
  scheduledDate: string, scheduledTime: string,
  technicianName: string, technicianPhone: string,
  estimatedDuration: number, jobId: string
}): Promise<{ success: boolean, messageId?: string, error?: string }> {
  try {
    const data = await resend.emails.send({
      from: `FixDone <${FROM_EMAIL}>`,
      to: params.to,
      subject: `Ihre Terminbestätigung: ${params.jobType}`,
      react: JobScheduledCustomer({ ...params }),
    })
    return { success: true, messageId: data.data?.id }
  } catch (error: any) {
    console.error('Email Error (ScheduledCustomer):', error)
    return { success: false, error: error.message }
  }
}

export async function sendJobScheduledTechnician(params: {
  to: string, technicianName: string, customerName: string,
  customerPhone: string, city: string, postcode: string,
  jobType: string, description: string, scheduledDate: string,
  scheduledTime: string, estimatedDuration: number,
  notes: string, jobId: string
}): Promise<{ success: boolean, messageId?: string, error?: string }> {
  try {
    const data = await resend.emails.send({
      from: `FixDone Dispatch <${FROM_EMAIL}>`,
      to: params.to,
      subject: `Neuer Auftrag: ${params.jobType} in ${params.city}`,
      react: JobScheduledTechnician({ ...params }),
    })
    return { success: true, messageId: data.data?.id }
  } catch (error: any) {
    console.error('Email Error (ScheduledTechnician):', error)
    return { success: false, error: error.message }
  }
}

export async function sendJobCompletedCustomer(params: {
  to: string, customerName: string, jobType: string,
  completedAt: string, technicianName: string, reviewLink: string
}): Promise<{ success: boolean, messageId?: string, error?: string }> {
  try {
    const data = await resend.emails.send({
      from: `FixDone <${FROM_EMAIL}>`,
      to: params.to,
      subject: `Auftrag abgeschlossen: ${params.jobType}`,
      react: JobCompletedCustomer({ ...params }),
    })
    return { success: true, messageId: data.data?.id }
  } catch (error: any) {
    console.error('Email Error (CompletedCustomer):', error)
    return { success: false, error: error.message }
  }
}

export async function sendJobReminder(params: {
  to: string, customerName: string, jobType: string,
  scheduledDate: string, scheduledTime: string,
  technicianName: string, technicianPhone: string
}): Promise<{ success: boolean, messageId?: string, error?: string }> {
  try {
    const data = await resend.emails.send({
      from: `FixDone <${FROM_EMAIL}>`,
      to: params.to,
      subject: `Erinnerung: Termin morgen um ${params.scheduledTime} Uhr`,
      react: JobReminderCustomer({ ...params }),
    })
    return { success: true, messageId: data.data?.id }
  } catch (error: any) {
    console.error('Email Error (ReminderCustomer):', error)
    return { success: false, error: error.message }
  }
}
