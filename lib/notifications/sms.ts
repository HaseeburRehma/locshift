import twilio from 'twilio'

const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const fromSms = process.env.TWILIO_SMS_FROM || '+4915123456789'

const client = accountSid && authToken ? twilio(accountSid, authToken) : null

export async function sendSmsJobScheduled(params: {
  to: string,
  customerName: string,
  jobType: string,
  scheduledDate: string,
  scheduledTime: string,
  technicianName: string,
  technicianPhone: string
}): Promise<{ success: boolean, messageSid?: string, error?: string }> {
  try {
    if (!client) throw new Error('Twilio not configured')
    
    const message = `LokShift: Ihr Termin für ${params.jobType} ist bestätigt! Am ${params.scheduledDate} um ${params.scheduledTime} Uhr. Techniker: ${params.technicianName} (${params.technicianPhone}).`
    
    const response = await client.messages.create({
      body: message,
      from: fromSms,
      to: params.to
    })
    
    return { success: true, messageSid: response.sid }
  } catch (error: any) {
    console.error('SMS Error (Scheduled):', error)
    return { success: false, error: error.message }
  }
}

export async function sendSmsCompleted(params: {
  to: string, customerName: string, jobType: string, reviewLink: string
}): Promise<{ success: boolean, messageSid?: string, error?: string }> {
  try {
    if (!client) throw new Error('Twilio not configured')
    
    const message = `LokShift: Auftrag abgeschlossen! Wir danken für das Vertrauen. Bewerten Sie uns gerne: ${params.reviewLink}`
    
    const response = await client.messages.create({
      body: message,
      from: fromSms,
      to: params.to
    })
    
    return { success: true, messageSid: response.sid }
  } catch (error: any) {
    console.error('SMS Error (Completed):', error)
    return { success: false, error: error.message }
  }
}

export async function sendSmsReminder(params: {
  to: string, customerName: string, scheduledDate: string,
  scheduledTime: string, technicianName: string
}): Promise<{ success: boolean, messageSid?: string, error?: string }> {
  try {
    if (!client) throw new Error('Twilio not configured')
    
    const message = `LokShift Erinnerung: Ihr Termin ist morgen (${params.scheduledDate}) um ${params.scheduledTime} Uhr mit ${params.technicianName}.`
    
    const response = await client.messages.create({
      body: message,
      from: fromSms,
      to: params.to
    })
    
    return { success: true, messageSid: response.sid }
  } catch (error: any) {
    console.error('SMS Error (Reminder):', error)
    return { success: false, error: error.message }
  }
}
