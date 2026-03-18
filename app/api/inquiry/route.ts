import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const baseUrl = request.nextUrl.origin
        console.log('Orchestrator: Step 1 - Creating Lead')

        const adminClient = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        // 1. Create Lead directly via Admin Client (bypass RLS and avoid self-fetch timeouts)
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
                source: body.source || 'website'
            })
            .select()
            .single()

        if (leadError || !lead) {
            console.error('Failed to create lead:', leadError)
            return NextResponse.json({ error: leadError?.message || 'Failed to create lead' }, { status: 500 })
        }

        // 2. Notify Admin (new lead)
        try {
            const adminEmail = process.env.SMTP_USER || 'admin@fixdone.de'
            await fetch(`${baseUrl}/api/agents/message`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    job_id: null,
                    lead_id: lead.id,
                    template: 'custom',
                    channel: 'email',
                    custom_content: `Neuer Lead von ${lead.name} (${lead.email}).\nDetails: ${lead.description}`,
                    recipient: adminEmail
                }),
            })
        } catch (e) {
            console.error('Failed to notify admin about new lead', e)
        }

        // 3. Trigger AI Qualification
        console.log('Orchestrator: Step 3 - Qualifying Lead')
        let qualifiedLead = null
        try {
            const qualifyResponse = await fetch(`${baseUrl}/api/agents/qualify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lead_id: lead.id }),
            })
            if (qualifyResponse.ok) {
                qualifiedLead = await qualifyResponse.json()
            } else {
                console.error('Qualification failed:', await qualifyResponse.text())
            }
        } catch (e) {
            console.error('Failed to qualify lead:', e)
        }

        // 4. Trigger AI Matching
        console.log('Orchestrator: Step 4 - Matching Lead')
        let job = null
        try {
            const matchResponse = await fetch(`${baseUrl}/api/agents/match`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lead_id: lead.id }),
            })
            if (matchResponse.ok) {
                const matchData = await matchResponse.json()
                job = matchData.job
            } else {
                console.error('Match failed:', await matchResponse.text())
            }
        } catch (e) {
            console.error('Failed to match lead:', e)
        }

        // 5. Trigger Messaging (Confirmation/Welcome to Customer)
        if (job) {
            console.log('Orchestrator: Step 5 - Sending Confirmation')
            try {
                await fetch(`${baseUrl}/api/agents/message`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        job_id: job.id,
                        template: 'confirmation',
                        channel: 'email'
                    }),
                })
            } catch (e) {
                console.error('Failed to send confirmation:', e)
            }
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
