import { LegalLayout } from '@/components/legal/LegalLayout'

export const metadata = {
  title: 'Terms of Service — LokShift',
  description: 'Terms of service for the LokShift application by Rhein Maas Rail GmbH.',
}

export default function TermsPage() {
  return (
    <LegalLayout
      title="Terms of Service"
      subtitle="Terms governing the use of the LokShift application."
      lastUpdated="Last updated: 3 July 2026"
      otherLocaleHref="/agb"
      otherLocaleLabel="Deutsch"
    >
      <section>
        <h2>§ 1 Scope</h2>
        <p>
          These terms govern the use of the LokShift application (the "App")
          by authorised employees and dispatchers of a customer organisation
          that holds a valid licence agreement.
        </p>
      </section>

      <section>
        <h2>§ 2 Eligibility</h2>
        <p>
          Access to the App is available only via an invitation provided by
          your employer. Accounts must not be shared with third parties.
        </p>
      </section>

      <section>
        <h2>§ 3 User Obligations</h2>
        <ul>
          <li>Keep your credentials confidential.</li>
          <li>Recorded times must correspond to actual work performed.</li>
          <li>Location data must not be manipulated.</li>
          <li>Chat features are for professional communication only.</li>
          <li>
            Harassment, discrimination, or otherwise unlawful content is
            prohibited.
          </li>
        </ul>
      </section>

      <section>
        <h2>§ 4 Availability</h2>
        <p>
          We aim for 99% uptime. Maintenance windows are announced in advance.
          Uninterrupted operation is not guaranteed.
        </p>
      </section>

      <section>
        <h2>§ 5 Data Processing</h2>
        <p>
          Data processing occurs in accordance with the{' '}
          <a href="/privacy-policy">Privacy Policy</a> and a separate data
          processing agreement between the employer and Rhein Maas Rail GmbH.
        </p>
      </section>

      <section>
        <h2>§ 6 Liability</h2>
        <p>
          We are liable only for damages caused by gross negligence or intent.
          Liability for slight negligence is excluded except in cases of
          breach of material contractual obligations.
        </p>
      </section>

      <section>
        <h2>§ 7 Termination</h2>
        <p>
          When the employment relationship ends, your employer deactivates
          your account. Personal data is retained or deleted in accordance
          with the Privacy Policy.
        </p>
      </section>

      <section>
        <h2>§ 8 Changes</h2>
        <p>
          We reserve the right to modify these terms. Changes will be
          announced within the App; continued use constitutes acceptance.
        </p>
      </section>

      <section>
        <h2>§ 9 Governing Law</h2>
        <p>
          These terms are governed by the laws of the Federal Republic of
          Germany. The place of jurisdiction is Aachen, provided the user is a
          merchant.
        </p>
      </section>

      <section>
        <h2>§ 10 Severability</h2>
        <p>
          Should any provision of these terms be or become invalid, the
          validity of the remaining provisions shall not be affected.
        </p>
      </section>
    </LegalLayout>
  )
}
