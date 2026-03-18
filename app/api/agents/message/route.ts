import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/mail'

export type MessageTemplate = 'confirmation' | 'reminder' | 'review_request' | 'custom'

interface MessageRequest {
  job_id: string | null
  lead_id?: string
  recipient?: string
  template: MessageTemplate
  channel?: 'sms' | 'email' | 'whatsapp'
  custom_content?: string
}

// Generate message content based on template and job data
export function generateMessage(
  template: MessageTemplate,
  lead: { name: string; description: string; email?: string },
  technician: { name: string; phone: string } | null,
  scheduledTime: string | null,
  customContent?: string
): { subject: string; text: string; html?: string } {
  const customerName = lead.name.split(' ')[0] // First name only

  switch (template) {
    case 'confirmation':
      return {
        subject: 'Bestätigung Ihrer Anfrage - fixdone.de',
        text: `Hallo ${customerName},\n\nVielen Dank für Ihre Anfrage bei fixdone.de!\n\nWir haben ${technician?.name || 'einen Techniker'} für Ihren Auftrag eingeteilt.\n\n${scheduledTime ? `Termin: ${new Date(scheduledTime).toLocaleString('de-DE', { dateStyle: 'full', timeStyle: 'short' })}` : 'Wir melden uns zeitnah zur Terminvereinbarung.'}\n\nBei Fragen erreichen Sie uns jederzeit.\n\nMit freundlichen Grüßen,\nIhr fixdone.de Team`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; rounded: 8px;">
            <h2 style="color: #0c0a09;">Hallo ${customerName},</h2>
            <p>Vielen Dank für Ihre Anfrage bei <strong>fixdone.de</strong>!</p>
            <p>Wir haben <strong>${technician?.name || 'einen Techniker'}</strong> für Ihren Auftrag eingeteilt.</p>
            <div style="background-color: #f4f4f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <strong>Status:</strong> Eingeplant<br>
              <strong>Termin:</strong> ${scheduledTime ? `${new Date(scheduledTime).toLocaleString('de-DE', { dateStyle: 'full', timeStyle: 'short' })}` : 'Wird zeitnah vereinbart'}
            </div>
            <p>Bei Fragen erreichen Sie uns jederzeit unter dieser E-Mail-Adresse.</p>
            <p>Mit freundlichen Grüßen,<br>Ihr fixdone.de Team</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 12px; color: #71717a;">Dies ist eine automatisierte Nachricht von fixdone.de - Ihr Partner für Heimservices.</p>
          </div>
        `
      }

    case 'reminder':
      return {
        subject: 'Terminerinnerung - fixdone.de',
        text: `Hallo ${customerName},\n\nErinnerung: Morgen ist Ihr Termin mit ${technician?.name || 'unserem Techniker'}.\n\n${scheduledTime ? `Zeit: ${new Date(scheduledTime).toLocaleString('de-DE', { timeStyle: 'short' })} Uhr` : ''}\n\nBitte stellen Sie sicher, dass jemand vor Ort ist.\n\nMit freundlichen Grüßen,\nIhr fixdone.de Team`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; rounded: 8px;">
            <h2 style="color: #0c0a09;">Terminerinnerung</h2>
            <p>Hallo ${customerName}, morgen ist Ihr Termin mit unserem Techniker.</p>
            <div style="background-color: #f4f4f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <strong>Techniker:</strong> ${technician?.name || 'Fachmann'}<br>
              <strong>Zeit:</strong> ${scheduledTime ? `${new Date(scheduledTime).toLocaleString('de-DE', { timeStyle: 'short' })} Uhr` : 'Morgen'}
            </div>
            <p>Wir freuen uns auf den Termin!</p>
            <p>Mit freundlichen Grüßen,<br>Ihr fixdone.de Team</p>
          </div>
        `
      }

    case 'review_request':
      const reviewUrl = `https://fixdone.de/review/${lead.name.replace(/\s+/g, '-').toLowerCase()}`
      return {
        subject: 'Wie war Ihr Service? - fixdone.de',
        text: `Hallo ${customerName},\n\nWir hoffen, dass Sie mit der Arbeit von ${technician?.name || 'unserem Techniker'} zufrieden waren.\n\nWürden Sie uns kurz Ihr Feedback geben?\n\nBewerten Sie uns hier: ${reviewUrl}\n\nVielen Dank!\nIhr fixdone.de Team`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; rounded: 8px;">
            <h2 style="color: #0c0a09;">Ihr Feedback ist uns wichtig</h2>
            <p>Hallo ${customerName}, wir hoffen, dass alles zu Ihrer Zufriedenheit erledigt wurde.</p>
            <p>Würden Sie sich eine Minute Zeit nehmen, um unsere Arbeit zu bewerten?</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${reviewUrl}" style="background-color: #0c0a09; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Jetzt bewerten</a>
            </div>
            <p>Vielen Dank!<br>Ihr fixdone.de Team</p>
          </div>
        `
      }

    case 'custom':
      return {
        subject: 'Nachricht von fixdone.de',
        text: customContent || ''
      }

    default:
      return { subject: '', text: '' }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: MessageRequest = await request.json()
    const { job_id, template, channel = 'sms', custom_content } = body

    if (!template || (!job_id && !body.lead_id)) {
      return NextResponse.json({ error: 'job_id or lead_id and template are required' }, { status: 400 })
    }

    const supabase = await createClient()

    let jobData = null
    let leadData = null
    let technicianData = null

    if (job_id) {
      const { data: job, error: jobError } = await supabase
        .from('jobs')
        .select(`*, lead:leads(*), technician:technicians(*)`)
        .eq('id', job_id)
        .single()
      
      if (jobError || !job) {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 })
      }
      jobData = job
      leadData = job.lead
      technicianData = job.technician
    } else if (body.lead_id) {
      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .select('*')
        .eq('id', body.lead_id)
        .single()
      
      if (leadError || !lead) {
        return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
      }
      leadData = lead
    } else {
       return NextResponse.json({ error: 'job_id or lead_id required' }, { status: 400 })
    }

    // Generate message content
    const { subject, text, html } = generateMessage(
      template,
      leadData,
      technicianData,
      jobData?.scheduled_time || null,
      custom_content
    )

    // Store message in database
    const { data: message, error: msgError } = await supabase
      .from('messages')
      .insert({
        job_id: job_id || null,
        lead_id: leadData.id,
        direction: 'outbound',
        channel,
        content: text,
        status: 'pending'
      })
      .select()
      .single()

    if (msgError) {
      return NextResponse.json({ error: 'Failed to create message' }, { status: 500 })
    }

    // Send via real email if channel is email
    let sentAt = null
    const targetEmail = body.recipient || leadData?.email

    if (channel === 'email' && targetEmail) {
      const emailResult = await sendEmail({
        to: targetEmail,
        subject,
        text,
        html
      })

      if (emailResult.success) {
        sentAt = new Date().toISOString()
      }
    } else {
      // Simulate sending for other channels for now
      sentAt = new Date().toISOString()
    }

    // Update message status
    await supabase
      .from('messages')
      .update({
        status: sentAt ? 'sent' : 'failed',
        sent_at: sentAt
      })
      .eq('id', message.id)

    // Update job if review request
    if (template === 'review_request' && jobData) {
      await supabase
        .from('jobs')
        .update({
          review_requested: true,
          review_requested_at: new Date().toISOString()
        })
        .eq('id', job_id)
    }

    return NextResponse.json({
      success: true,
      message: { ...message, status: sentAt ? 'sent' : 'failed', content: text }
    })
  } catch (error) {
    console.error('Messaging Agent Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
