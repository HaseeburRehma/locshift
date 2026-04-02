import { google } from 'googleapis'

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
)

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
})

const calendar = google.calendar({ version: 'v3', auth: oauth2Client })
const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary'

export async function createJobCalendarEvent(params: {
  customerName: string,
  technicianName: string,
  jobType: string,
  city: string,
  postcode: string,
  scheduledDateTime: Date,
  estimatedDurationMinutes: number,
  notes: string,
  jobId: string
}): Promise<{ success: boolean, eventId?: string, eventLink?: string, error?: string }> {
  try {
    const startTime = params.scheduledDateTime
    const endTime = new Date(startTime.getTime() + params.estimatedDurationMinutes * 60000)

    const event = {
      summary: `${params.jobType} - ${params.customerName} - ${params.city}`,
      location: `${params.postcode} ${params.city}, Deutschland`,
      description: `Job ID: ${params.jobId}\nTechniker: ${params.technicianName}\nKunde: ${params.customerName}\n\nNotizen:\n${params.notes || '-'}`,
      start: {
        dateTime: startTime.toISOString(),
        timeZone: 'Europe/Berlin',
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: 'Europe/Berlin',
      },
      colorId: '5', // yellow for scheduled
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 },
          { method: 'popup', minutes: 60 },
        ],
      },
    }

    const res = await calendar.events.insert({
      calendarId,
      requestBody: event,
    })

    return { success: true, eventId: res.data.id || undefined, eventLink: res.data.htmlLink || undefined }
  } catch (error: any) {
    console.error('Calendar Error (Create):', error)
    return { success: false, error: error.message }
  }
}

export async function updateJobCalendarEvent(eventId: string, updates: {
  status?: 'confirmed' | 'cancelled',
  startTime?: Date,
  endTime?: Date
}): Promise<{ success: boolean, error?: string }> {
  try {
    const patchBody: any = {
      colorId: updates.status === 'confirmed' ? '10' : updates.status === 'cancelled' ? '11' : undefined
    }

    if (updates.startTime) patchBody.start = { dateTime: updates.startTime.toISOString(), timeZone: 'Europe/Berlin' }
    if (updates.endTime) patchBody.end = { dateTime: updates.endTime.toISOString(), timeZone: 'Europe/Berlin' }
    if (updates.status === 'cancelled') patchBody.status = 'cancelled'

    await calendar.events.patch({
      calendarId,
      eventId,
      requestBody: patchBody,
    })

    return { success: true }
  } catch (error: any) {
    console.error('Calendar Error (Update):', error)
    return { success: false, error: error.message }
  }
}

export async function deleteJobCalendarEvent(eventId: string): Promise<{ success: boolean, error?: string }> {
  try {
    await calendar.events.delete({
      calendarId,
      eventId,
    })
    return { success: true }
  } catch (error: any) {
    console.error('Calendar Error (Delete):', error)
    return { success: false, error: error.message }
  }
}

export function generateCustomerCalendarLink(params: {
  jobType: string, city: string,
  scheduledDateTime: Date, estimatedDurationMinutes: number,
  customerName: string
}): string {
  const startTime = params.scheduledDateTime.toISOString().replace(/-|:|\.\d\d\d/g, "")
  const endTimeDate = new Date(params.scheduledDateTime.getTime() + params.estimatedDurationMinutes * 60000)
  const endTime = endTimeDate.toISOString().replace(/-|:|\.\d\d\d/g, "")
  
  const text = encodeURIComponent(`LokShift: ${params.jobType}`)
  const details = encodeURIComponent(`Termin für ${params.customerName}`)
  const location = encodeURIComponent(`${params.city}, Deutschland`)

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${startTime}/${endTime}&details=${details}&location=${location}`
}
