import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { qualifyLead } from '@/app/api/agents/qualify/route'
import { matchTechnician } from '@/app/api/agents/match/route'
import { generateMessage } from '@/app/api/agents/message/route'
import { sendEmail } from '@/lib/mail'
import type { Lead, Technician } from '@/lib/types'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        
        const adminClient = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        console.log('Inquiry: Step 1 - Creating Lead')
        // 1. Create Lead directly via Admin Client
        const { data: lead, error: leadError } = await adminClient
            .from('leads')
            .insert({
                name: body.name,
                email: body.email,
                phone: body.phone,
                street: body.street,
                house_no: body.house_no,
                postcode: body.postcode,
                city: body.city,
                service_type: body.service_type || 'electrician',
                budget: body.budget,
                description: body.description,
                source: body.source || 'website',
                status: 'new'
            })
            .select()
            .single()

        if (leadError || !lead) {
            console.error('Lead creation failed:', leadError)
            return NextResponse.json({ error: leadError?.message || 'Failed to create lead' }, { status: 500 })
        }

        // 2. Notify Admin immediately
        try {
            const adminEmail = process.env.SMTP_USER || 'admin@fixdone.de'
            await sendEmail({
                to: adminEmail,
                subject: `Neuer Lead: ${lead.name}`,
                text: `Ein neuer Lead wurde erstellt:\n\nName: ${lead.name}\nE-Mail: ${lead.email}\nTelefon: ${lead.phone}\nBeschreibung: ${lead.description}\n\nLink: ${request.nextUrl.origin}/dashboard/leads/${lead.id}`
            })
        } catch (e) {
            console.error('Admin notification failed:', e)
        }

        // 3. AI Qualification (Direct Call)
        console.log('Inquiry: Step 3 - AI Qualification')
        let qualifiedData = null
        try {
            qualifiedData = qualifyLead(lead as Lead)
            if (qualifiedData) {
                await adminClient
                    .from('leads')
                    .update({
                        job_type: qualifiedData.job_type,
                        urgency: qualifiedData.urgency,
                        estimated_value: qualifiedData.estimated_value,
                        priority: qualifiedData.priority,
                        status: 'qualified',
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', lead.id)
            }
        } catch (e) {
            console.error('AI Qualification failed:', e)
        }

        // 4. AI Matching (Direct Call)
        console.log('Inquiry: Step 4 - AI Matching')
        let job = null
        try {
            const { data: techs } = await adminClient
                .from('technicians')
                .select('*')
                .eq('is_active', true)
                .eq('is_available', true)

            const matchResult = matchTechnician(lead as Lead, (techs || []) as Technician[])
            if (matchResult) {
                const { data: newJob, error: jobError } = await adminClient
                    .from('jobs')
                    .insert({
                        lead_id: lead.id,
                        technician_id: matchResult.technician_id,
                        status: 'awaiting_approval',
                        notes: matchResult.reason,
                        estimated_duration: 120
                    })
                    .select()
                    .single()

                if (!jobError && newJob) {
                    job = newJob
                    await adminClient
                        .from('leads')
                        .update({ status: 'matched', updated_at: new Date().toISOString() })
                        .eq('id', lead.id)

                    // 5. Send Confirmation to Customer (Direct Call)
                    console.log('Inquiry: Step 5 - Sending Customer Confirmation')
                    const { data: technician } = await adminClient
                        .from('technicians')
                        .select('*')
                        .eq('id', job.technician_id)
                        .single()

                    const messageContent = generateMessage(
                        'confirmation',
                        lead as any,
                        technician as any,
                        null
                    )

                    const emailSent = await sendEmail({
                        to: lead.email,
                        subject: messageContent.subject,
                        text: messageContent.text,
                        html: messageContent.html
                    })

                    // Store message log
                    await adminClient.from('messages').insert({
                        job_id: job.id,
                        lead_id: lead.id,
                        direction: 'outbound',
                        channel: 'email',
                        content: messageContent.text,
                        status: emailSent.success ? 'sent' : 'failed',
                        sent_at: emailSent.success ? new Date().toISOString() : null
                    })
                }
            }
        } catch (e) {
            console.error('AI Matching/Confirmation failed:', e)
        }

        return NextResponse.json({
            success: true,
            lead_id: lead.id,
            job_id: job?.id
        })

    } catch (error: any) {
        console.error('Inquiry Orchestration Error:', error)
        return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 })
    }
}

