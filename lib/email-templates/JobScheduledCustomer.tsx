import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
  Button,
} from '@react-email/components'
import * as React from 'react'

interface JobScheduledCustomerProps {
  customerName: string
  jobType: string
  scheduledDate: string
  scheduledTime: string
  technicianName: string
  technicianPhone: string
  estimatedDuration: number
  jobId: string
}

export const JobScheduledCustomer = ({
  customerName,
  jobType,
  scheduledDate,
  scheduledTime,
  technicianName,
  technicianPhone,
  estimatedDuration,
  jobId,
}: JobScheduledCustomerProps) => (
  <Html>
    <Head />
    <Preview>Ihr Auftrag wurde bestätigt</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>LokShift</Heading>
        <Text style={h2}>Ihr Auftrag wurde bestätigt</Text>
        <Text style={text}>Guten Tag {customerName},</Text>
        <Text style={text}>
          Ihr Auftrag für "{jobType}" wurde erfolgreich geplant. Unser Techniker freut sich darauf, Ihnen zu helfen.
        </Text>
        <Section style={detailsBox}>
          <Text style={detailsText}><strong>📅 Datum:</strong> {scheduledDate}</Text>
          <Text style={detailsText}><strong>🕐 Uhrzeit:</strong> {scheduledTime} Uhr</Text>
          <Text style={detailsText}><strong>👨🔧 Techniker:</strong> {technicianName}</Text>
          <Text style={detailsText}><strong>📞 Techniker Tel:</strong> {technicianPhone}</Text>
          <Text style={detailsText}><strong>⏱ Geschätzte Dauer:</strong> {estimatedDuration} Minuten</Text>
        </Section>
        {/* Placeholder link for calendar, will be passed as param ideally */}
        <Button href={`https://calendar.google.com/calendar/r/eventedit`} style={button}>
          Zum Termin hinzufügen
        </Button>
        <Hr style={hr} />
        <Text style={footer}>
          Bei Fragen: info@fixdone.de | +49 211 1234567<br />
          <a href="#" style={link}>Abmelden</a>
        </Text>
      </Container>
    </Body>
  </Html>
)

const main = { backgroundColor: '#f6f9fc', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif' }
const container = { backgroundColor: '#ffffff', margin: '0 auto', padding: '20px 0 48px', marginBottom: '64px' }
const h1 = { fontSize: '24px', fontWeight: 'bold', textAlign: 'center' as const, color: '#333' }
const h2 = { fontSize: '20px', fontWeight: 'bold', padding: '0 48px', color: '#333' }
const text = { fontSize: '16px', lineHeight: '24px', color: '#525f7f', padding: '0 48px' }
const detailsBox = { backgroundColor: '#f8fafc', padding: '24px', margin: '24px 48px', borderRadius: '8px' }
const detailsText = { fontSize: '14px', lineHeight: '24px', color: '#333', margin: '0' }
const button = { backgroundColor: '#2563eb', borderRadius: '5px', color: '#fff', fontSize: '16px', fontWeight: 'bold', textDecoration: 'none', textAlign: 'center' as const, display: 'block', padding: '12px 24px', margin: '32px 48px' }
const hr = { borderColor: '#e6ebf1', margin: '20px 0' }
const footer = { fontSize: '12px', color: '#8898aa', padding: '0 48px', lineHeight: '16px' }
const link = { color: '#8898aa', textDecoration: 'underline' }

export default JobScheduledCustomer
