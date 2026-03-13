import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const baseUrl = request.nextUrl.origin
        console.log('Orchestrator: Using baseUrl:', baseUrl)
        console.log('Orchestrator: Step 1 - Creating Lead')

        // 1. Create Lead
        const leadResponse = await fetch(`${baseUrl}/api/leads`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        })
        console.log('Orchestrator: Lead response status:', leadResponse.status)

        if (!leadResponse.ok) {
            const error = await leadResponse.json()
            return NextResponse.json({ error: error.error || 'Failed to create lead' }, { status: leadResponse.status })
        }

        let lead;
        try {
            lead = await leadResponse.json()
        } catch (e) {
            const text = await leadResponse.text()
            console.error('Failed to parse lead response as JSON. Content:', text.substring(0, 100))
            throw new Error('Failed to create lead: Invalid response format')
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
            console.error('Failed to notify admin about new lead')
        }

        // 3. Trigger AI Qualification
        console.log('Orchestrator: Step 3 - Qualifying Lead')
        const qualifyResponse = await fetch(`${baseUrl}/api/agents/qualify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lead_id: lead.id }),
        })
        console.log('Orchestrator: Qualify response status:', qualifyResponse.status)

        const qualifiedLead = qualifyResponse.ok ? await qualifyResponse.json() : null

        // 4. Trigger AI Matching
        console.log('Orchestrator: Step 4 - Matching Lead')
        const matchResponse = await fetch(`${baseUrl}/api/agents/match`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lead_id: lead.id }),
        })
        console.log('Orchestrator: Match response status:', matchResponse.status)

        let job = null
        if (matchResponse.ok) {
            try {
                const matchData = await matchResponse.json()
                job = matchData.job
            } catch (e) {
                console.error('Failed to parse match response')
            }
        } else {
            console.error('Auto-matching failed for lead:', lead.id)
        }

        // 5. Trigger Messaging (Confirmation/Welcome to Customer)
        if (job) {
            console.log('Orchestrator: Step 5 - Sending Confirmation')
            await fetch(`${baseUrl}/api/agents/message`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    job_id: job.id,
                    template: 'confirmation',
                    channel: 'email'
                }),
            })
        }

        return NextResponse.json({
            success: true,
            lead_id: lead.id,
            job_id: job?.id
        })
    } catch (error) {
        console.error('Inquiry Orchestration Error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
