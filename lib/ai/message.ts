/**
 * AI Message Generation Utility
 * Generates subject and body content for various automated communications.
 */

export function generateMessage(
  type: 'confirmation' | 'reminder' | 'update',
  lead: any,
  technician: any,
  data: any = null
) {
  switch (type) {
    case 'confirmation':
      return {
        subject: `Terminbestätigung: ${lead.service_type} mit LokShift`,
        text: `Hallo ${lead.name},\n\nvielen Dank für Ihre Anfrage. Wir haben einen passenden Techniker für Sie gefunden: ${technician.name}.\n\nWir werden uns in Kürze mit Ihnen in Verbindung setzen, um einen genauen Termin zu vereinbaren.`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #0064E0;">Vielen Dank für Ihre Anfrage, ${lead.name}!</h2>
            <p>Wir haben Ihre Anfrage für <strong>${lead.service_type}</strong> erhalten und einen Experten für Sie reserviert.</p>
            <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Ihr Techniker:</strong> ${technician.name}</p>
              <p style="margin: 5px 0 0 0;"><strong>Status:</strong> In Bearbeitung</p>
            </div>
            <p>Unser Team wird sich in Kürze bei Ihnen melden, um die nächsten Schritte zu besprechen.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="font-size: 12px; color: #666;">Dies ist eine automatisierte Nachricht von LokShift. Bitte antworten Sie nicht direkt auf diese E-Mail.</p>
          </div>
        `
      };
    
    default:
      return {
        subject: 'Nachricht von LokShift',
        text: 'Vielen Dank für Ihre Nachricht.',
        html: '<p>Vielen Dank für Ihre Nachricht.</p>'
      };
  }
}
