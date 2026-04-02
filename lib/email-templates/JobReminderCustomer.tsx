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
} from '@react-email/components'
import * as React from 'react'

interface JobReminderCustomerProps {
  customerName: string
  jobType: string
  scheduledDate: string
  scheduledTime: string
  technicianName: string
  technicianPhone: string
}

export const JobReminderCustomer = ({
  customerName,
  jobType,
  scheduledDate,
  scheduledTime,
  technicianName,
  technicianPhone,
}: JobReminderCustomerProps) => (
  <Html>
    <Head />
    <Preview>Erinnerung: Ihr Termin ist morgen</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>LokShift</Heading>
        <Text style={h2}>Erinnerung an Ihren Termin 📅</Text>
        <Text style={text}>Guten Tag {customerName},</Text>
        <Text style={text}>
          Wir möchten Sie daran erinnern, dass Ihr LokShift-Termin für "{jobType}" morgen um {scheduledTime} Uhr stattfindet.
        </Text>
        
        <Section style={detailsBox}>
          <Text style={detailsText}><strong>📅 Datum:</strong> {scheduledDate}</Text>
          <Text style={detailsText}><strong>🕐 Uhrzeit:</strong> {scheduledTime} Uhr</Text>
          <Text style={detailsText}><strong>👨🔧 Techniker:</strong> {technicianName}</Text>
          <Text style={detailsText}><strong>📞 Techniker Tel:</strong> {technicianPhone}</Text>
        </Section>

        <Text style={text}>
          Falls Sie den Termin verschieben müssen, kontaktieren Sie uns bitte schnellstmöglich unter +49 211 1234567.
        </Text>

        <Hr style={hr} />
        <Text style={footer}>
          Bei Fragen: info@fixdone.de | +49 211 1234567<br />
        </Text>
      </Container>
    </Body>
  </Html>
)

const main = { backgroundColor: '#f6f9fc', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif' }
const container = { backgroundColor: '#ffffff', margin: '0 auto', padding: '20px 0 48px', marginBottom: '64px' }
const h1 = { fontSize: '24px', fontWeight: 'bold', textAlign: 'center' as const, color: '#333' }
const h2 = { fontSize: '20px', fontWeight: 'bold', padding: '0 48px', color: '#3b82f6' }
const text = { fontSize: '16px', lineHeight: '24px', color: '#525f7f', padding: '0 48px' }
const detailsBox = { backgroundColor: '#f8fafc', padding: '24px', margin: '24px 48px', borderRadius: '8px' }
const detailsText = { fontSize: '14px', lineHeight: '24px', color: '#333', margin: '0' }
const hr = { borderColor: '#e6ebf1', margin: '20px 0' }
const footer = { fontSize: '12px', color: '#8898aa', padding: '0 48px', lineHeight: '16px' }

export default JobReminderCustomer
