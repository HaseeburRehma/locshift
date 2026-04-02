import twilio from 'twilio'

const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const fromWhatsApp = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886'

const client = accountSid && authToken ? twilio(accountSid, authToken) : null

// Note: To move from sandbox to production, you need to register a WhatsApp Business Account 
// through Twilio and get predefined message templates approved by Meta.
// https://www.twilio.com/docs/whatsapp/tutorial/connect-number-business-profile

export async function sendWhatsAppJobScheduledCustomer(params: {
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
    
    const message = `Hallo ${params.customerName} 👋\n\nIhr LokShift-Auftrag wurde bestätigt ✅\n\n🔧 Leistung: ${params.jobType}\n📅 Datum: ${params.scheduledDate}\n🕐 Uhrzeit: ${params.scheduledTime} Uhr\n👨🔧 Techniker: ${params.technicianName}\n📞 Bei Fragen: ${params.technicianPhone}\n\nWir freuen uns auf Ihren Auftrag!\n– Team LokShift`
    
    const response = await client.messages.create({
      body: message,
      from: fromWhatsApp,
      to: `whatsapp:${params.to}`
    })
    
    return { success: true, messageSid: response.sid }
  } catch (error: any) {
    console.error('WhatsApp Error (ScheduledCustomer):', error)
    return { success: false, error: error.message }
  }
}

export async function sendWhatsAppJobScheduledTechnician(params: {
  to: string,
  technicianName: string,
  customerName: string,
  customerPhone: string,
  city: string,
  jobType: string,
  scheduledDate: string,
  scheduledTime: string,
  notes: string
}): Promise<{ success: boolean, messageSid?: string, error?: string }> {
  try {
    if (!client) throw new Error('Twilio not configured')
    
    const message = `Hallo ${params.technicianName} 🔧\n\nNeuer Auftrag zugewiesen 📋\n\n👤 Kunde: ${params.customerName}\n📞 Tel: ${params.customerPhone}\n📍 Ort: ${params.city}\n🔧 Auftrag: ${params.jobType}\n📅 ${params.scheduledDate} um ${params.scheduledTime} Uhr\n📝 Notizen: ${params.notes || '-'}\n\nBitte bestätigen Sie Ihre Ankunft über die App.\n– LokShift Disposition`
    
    const response = await client.messages.create({
      body: message,
      from: fromWhatsApp,
      to: `whatsapp:${params.to}`
    })
    
    return { success: true, messageSid: response.sid }
  } catch (error: any) {
    console.error('WhatsApp Error (ScheduledTechnician):', error)
    return { success: false, error: error.message }
  }
}

export async function sendWhatsAppJobCompleted(params: {
  to: string, customerName: string, jobType: string, reviewLink: string
}): Promise<{ success: boolean, messageSid?: string, error?: string }> {
  try {
    if (!client) throw new Error('Twilio not configured')
    
    const message = `Hallo ${params.customerName} 👋\n\nIhr Auftrag für ${params.jobType} wurde erfolgreich abgeschlossen ✅\n\nWir würden uns sehr über eine kurze Bewertung freuen:\n${params.reviewLink}\n\nVielen Dank!\n– Team LokShift`
    
    const response = await client.messages.create({
      body: message,
      from: fromWhatsApp,
      to: `whatsapp:${params.to}`
    })
    
    return { success: true, messageSid: response.sid }
  } catch (error: any) {
    console.error('WhatsApp Error (Completed):', error)
    return { success: false, error: error.message }
  }
}

export async function sendWhatsAppReminder(params: {
  to: string, customerName: string, scheduledDate: string,
  scheduledTime: string, technicianName: string
}): Promise<{ success: boolean, messageSid?: string, error?: string }> {
  try {
    if (!client) throw new Error('Twilio not configured')
    
    const message = `Hallo ${params.customerName} 👋\n\nErinnerung: Ihr LokShift-Termin findet morgen, den ${params.scheduledDate} um ${params.scheduledTime} Uhr statt.\nTechniker: ${params.technicianName}\n\nBei Änderungen rufen Sie uns rechtzeitig an.\n– Team LokShift`
    
    const response = await client.messages.create({
      body: message,
      from: fromWhatsApp,
      to: `whatsapp:${params.to}`
    })
    
    return { success: true, messageSid: response.sid }
  } catch (error: any) {
    console.error('WhatsApp Error (Reminder):', error)
    return { success: false, error: error.message }
  }
}
