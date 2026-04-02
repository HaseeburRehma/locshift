import * as React from 'react'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Hr,
  Link,
} from '@react-email/components'

interface ReviewRequestEmailProps {
  customerName: string
  jobType: string
  technicianName: string
  reviewUrl: string
}

export const ReviewRequestEmail = ({
  customerName,
  jobType,
  technicianName,
  reviewUrl,
}: ReviewRequestEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Wie war Ihr Erlebnis mit LokShift?</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>⭐ Wie war Ihr Erlebnis?</Heading>
          <Text style={text}>Guten Tag {customerName},</Text>
          <Text style={text}>
            Ihr Auftrag (<strong>{jobType}</strong>) wurde erfolgreich abgeschlossen.
            Wir hoffen, dass Sie mit dem Service von <strong>{technicianName}</strong> zufrieden waren.
          </Text>
          
          <Section style={starsSection}>
            <Text style={starsLabel}>Ihre Bewertung abgeben:</Text>
            <div style={starsContainer}>
              <Link href={`${reviewUrl}?rating=1`} style={starBtn}>⭐ 1</Link>
              <Link href={`${reviewUrl}?rating=2`} style={starBtn}>⭐ 2</Link>
              <Link href={`${reviewUrl}?rating=3`} style={starBtn}>⭐ 3</Link>
              <Link href={`${reviewUrl}?rating=4`} style={starBtn}>⭐ 4</Link>
              <Link href={`${reviewUrl}?rating=5`} style={starBtn}>⭐ 5</Link>
            </div>
          </Section>

          <Button style={button} href={reviewUrl}>
            Jetzt bewerten
          </Button>

          <Hr style={hr} />
          <Text style={footer}>
            LokShift · Professioneller Elektro-Service<br />
            info@fixdone.de · www.fixdone.de
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '40px 20px',
  maxWidth: '600px',
  borderRadius: '8px',
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
}

const h1 = {
  color: '#ffffff',
  backgroundColor: '#2563eb',
  fontSize: '24px',
  fontWeight: 'bold',
  textAlign: 'center' as const,
  margin: '0 0 30px',
  padding: '20px',
  borderRadius: '4px',
}

const text = {
  color: '#334155',
  fontSize: '16px',
  lineHeight: '24px',
}

const starsSection = {
  textAlign: 'center' as const,
  margin: '40px 0',
}

const starsLabel = {
  fontSize: '14px',
  color: '#64748b',
  marginBottom: '10px',
}

const starsContainer = {
  display: 'flex',
  justifyContent: 'center',
  gap: '10px',
}

const starBtn = {
  padding: '12px 16px',
  borderRadius: '8px',
  backgroundColor: '#f1f5f9',
  color: '#334155',
  textDecoration: 'none',
  fontSize: '18px',
  border: '1px solid #e2e8f0',
}

const button = {
  backgroundColor: '#2563eb',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  width: '100%',
  padding: '15px 0',
  marginTop: '20px',
}

const hr = {
  borderColor: '#e2e8f0',
  margin: '40px 0 20px',
}

const footer = {
  color: '#94a3b8',
  fontSize: '12px',
  textAlign: 'center' as const,
}
