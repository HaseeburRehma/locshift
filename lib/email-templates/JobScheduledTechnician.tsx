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

interface JobScheduledTechnicianProps {
  technicianName: string
  customerName: string
  customerPhone: string
  city: string
  postcode: string
  jobType: string
  description: string
  scheduledDate: string
  scheduledTime: string
  estimatedDuration: number
  notes: string
  jobId: string
}

export const JobScheduledTechnician = ({
  technicianName,
  customerName,
  customerPhone,
  city,
  postcode,
  jobType,
  description,
  scheduledDate,
  scheduledTime,
  estimatedDuration,
  notes,
  jobId,
}: JobScheduledTechnicianProps) => {
  const mapLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${postcode} ${city}`)}`
  return (
    <Html>
      <Head />
      <Preview>Neuer Auftrag zugewiesen</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>FixDone Dispatch</Heading>
          <Text style={h2}>Neuer Auftrag zugewiesen</Text>
          <Text style={text}>Hallo {technicianName},</Text>
          <Text style={text}>Ein neuer Auftrag wurde dir zugewiesen.</Text>
          
          <Section style={detailsBox}>
            <Text style={detailsText}><strong>📅 Termin:</strong> {scheduledDate} um {scheduledTime} Uhr</Text>
            <Text style={detailsText}><strong>⏱ Dauer:</strong> ca. {estimatedDuration} Min.</Text>
            <Text style={detailsText}><strong>👤 Kunde:</strong> {customerName}</Text>
            <Text style={detailsText}><strong>📞 Tel:</strong> <a href={`tel:${customerPhone}`}>{customerPhone}</a></Text>
            <Text style={detailsText}><strong>📍 Ort:</strong> {postcode} {city} (<a href={mapLink}>Karte</a>)</Text>
            <Hr style={hr} />
            <Text style={detailsText}><strong>🔧 Auftrag:</strong> {jobType}</Text>
            <Text style={detailsText}><strong>📝 Notizen:</strong> {notes || '-'}</Text>
            <Text style={detailsText}><strong>ℹ️ Beschreibung:</strong> {description || '-'}</Text>
          </Section>

          {/* This would link back to the FixDone Technician App deep link */}
          <Button href={`https://app.fixdone.de/jobs/${jobId}`} style={button}>
            Auftrag ansehen / starten
          </Button>
          
          <Hr style={hr} />
          <Text style={footer}>
            Automatische Benachrichtigung von FixDone Dispatch.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

const main = { backgroundColor: '#f6f9fc', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif' }
const container = { backgroundColor: '#ffffff', margin: '0 auto', padding: '20px 0 48px', marginBottom: '64px' }
const h1 = { fontSize: '24px', fontWeight: 'bold', textAlign: 'center' as const, color: '#333' }
const h2 = { fontSize: '20px', fontWeight: 'bold', padding: '0 48px', color: '#16a34a' }
const text = { fontSize: '16px', lineHeight: '24px', color: '#525f7f', padding: '0 48px' }
const detailsBox = { backgroundColor: '#f8fafc', padding: '24px', margin: '24px 48px', borderRadius: '8px' }
const detailsText = { fontSize: '14px', lineHeight: '24px', color: '#333', margin: '0' }
const button = { backgroundColor: '#2563eb', borderRadius: '5px', color: '#fff', fontSize: '16px', fontWeight: 'bold', textDecoration: 'none', textAlign: 'center' as const, display: 'block', padding: '12px 24px', margin: '32px 48px' }
const hr = { borderColor: '#e6ebf1', margin: '20px 0' }
const footer = { fontSize: '12px', color: '#8898aa', padding: '0 48px', lineHeight: '16px' }

export default JobScheduledTechnician
