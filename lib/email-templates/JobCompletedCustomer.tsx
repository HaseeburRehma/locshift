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

interface JobCompletedCustomerProps {
  customerName: string
  jobType: string
  completedAt: string
  technicianName: string
  reviewLink: string
}

export const JobCompletedCustomer = ({
  customerName,
  jobType,
  completedAt,
  technicianName,
  reviewLink,
}: JobCompletedCustomerProps) => (
  <Html>
    <Head />
    <Preview>Ihr Auftrag wurde abgeschlossen</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>FixDone</Heading>
        <Text style={h2}>Auftrag abgeschlossen ✅</Text>
        <Text style={text}>Guten Tag {customerName},</Text>
        <Text style={text}>
          Vielen Dank für Ihren Auftrag ({jobType}). Unser Techniker {technicianName} hat die Arbeiten am {completedAt} erfolgreich beendet.
        </Text>
        
        <Section style={detailsBox}>
          <Text style={detailsText}>War alles zu Ihrer Zufriedenheit?</Text>
          <Text style={detailsText}>Wir freuen uns sehr über eine kurze Bewertung bei Google!</Text>
        </Section>

        <Button href={reviewLink} style={button}>
          Jetzt bewerten ⭐⭐⭐⭐⭐
        </Button>
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
const h2 = { fontSize: '20px', fontWeight: 'bold', padding: '0 48px', color: '#16a34a' }
const text = { fontSize: '16px', lineHeight: '24px', color: '#525f7f', padding: '0 48px' }
const detailsBox = { backgroundColor: '#f8fafc', padding: '24px', margin: '24px 48px', borderRadius: '8px', textAlign: 'center' as const }
const detailsText = { fontSize: '14px', lineHeight: '24px', color: '#333', margin: '0' }
const button = { backgroundColor: '#eab308', borderRadius: '5px', color: '#fff', fontSize: '16px', fontWeight: 'bold', textDecoration: 'none', textAlign: 'center' as const, display: 'block', padding: '12px 24px', margin: '32px 48px' }
const hr = { borderColor: '#e6ebf1', margin: '20px 0' }
const footer = { fontSize: '12px', color: '#8898aa', padding: '0 48px', lineHeight: '16px' }

export default JobCompletedCustomer
