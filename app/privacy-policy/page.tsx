import { LegalLayout } from '@/components/legal/LegalLayout'

export const metadata = {
  title: 'Privacy Policy — LokShift',
  description:
    'Privacy policy for the LokShift application by Rhein Maas Rail GmbH, in accordance with the GDPR.',
}

export default function PrivacyPolicyPage() {
  return (
    <LegalLayout
      title="Privacy Policy"
      subtitle="How we process personal data in the LokShift application."
      lastUpdated="Last updated: 3 July 2026"
      otherLocaleHref="/datenschutz"
      otherLocaleLabel="Deutsch"
    >
      <section>
        <h2>1. Data Controller</h2>
        <p>
          Rhein Maas Rail GmbH<br />
          Josefstraße 157, 52080 Aachen, Germany<br />
          Email:{' '}
          <a href="mailto:lokshiftapp@gmail.com">lokshiftapp@gmail.com</a>
        </p>
      </section>

      <section>
        <h2>2. Data We Process</h2>
        <ul>
          <li>Identity data (name, email, phone, date of birth, gender)</li>
          <li>
            Employment data (role, working-time model, target hours)
          </li>
          <li>Time tracking (start/end time, breaks, per diem, location)</li>
          <li>Shift plans and assignments</li>
          <li>Chat messages and attachments (images, files, voice messages)</li>
          <li>Location data during an active shift (every 5 minutes)</li>
          <li>Device information for push notifications</li>
          <li>Profile picture (if uploaded)</li>
          <li>Qualifications and certificates (if recorded)</li>
        </ul>
      </section>

      <section>
        <h2>3. Legal Bases</h2>
        <p>Processing is based on:</p>
        <ul>
          <li>
            Art. 6 (1) (b) GDPR — Performance of a contract (employment
            contract)
          </li>
          <li>
            Art. 6 (1) (c) GDPR — Compliance with legal obligations (working
            time and tax law)
          </li>
          <li>
            Art. 6 (1) (f) GDPR — Legitimate interests (dispatch, security)
          </li>
          <li>
            Art. 6 (1) (a) GDPR — Consent (optional features such as biometric
            lock)
          </li>
        </ul>
      </section>

      <section>
        <h2>4. Storage and Data Processing</h2>
        <p>
          Application data is hosted on Supabase (EU servers). A data
          processing agreement pursuant to Art. 28 GDPR exists with the
          provider.
        </p>
        <p>
          Optional crash reporting is provided in anonymised form via Sentry
          (if enabled).
        </p>
      </section>

      <section>
        <h2>5. Location Data</h2>
        <p>
          While a shift is active, the app records your location every 5
          minutes. Transmission stops automatically at clock-out and can be
          disabled at any time in security settings. The data is shown only to
          your organisation's dispatch team for planning purposes.
        </p>
      </section>

      <section>
        <h2>6. Push Notifications</h2>
        <p>
          With your consent, we send push notifications via Apple Push
          Notification Service (APNs) and Firebase Cloud Messaging (FCM). You
          can disable them at any time in your device settings.
        </p>
      </section>

      <section>
        <h2>7. Retention</h2>
        <p>
          Personal data is stored for the duration of your employment.
          Timesheets and tax-relevant data are archived for 10 years pursuant
          to § 147 AO. Chat messages are retained for 12 months and then
          automatically deleted.
        </p>
      </section>

      <section>
        <h2>8. Your Rights</h2>
        <p>
          You have the right to information (Art. 15), rectification (Art.
          16), erasure (Art. 17), restriction (Art. 18), data portability
          (Art. 20), and objection (Art. 21).
        </p>
        <p>
          Inside the app you can go to "Settings → Data Export" at any time to
          download a complete copy of your data as a JSON file.
        </p>
      </section>

      <section>
        <h2>9. Data Protection Officer</h2>
        <p>
          A dedicated data protection officer is not legally required. For any
          privacy questions, please contact:{' '}
          <a href="mailto:lokshiftapp@gmail.com">lokshiftapp@gmail.com</a>
        </p>
      </section>

      <section>
        <h2>10. Right of Complaint</h2>
        <p>
          You have the right to lodge a complaint with a supervisory authority
          — for example, the State Commissioner for Data Protection and
          Freedom of Information of North Rhine-Westphalia (Germany).
        </p>
      </section>

      <section>
        <h2>11. Changes to This Policy</h2>
        <p>
          We reserve the right to adapt this privacy policy to reflect legal
          changes or new features.
        </p>
      </section>
    </LegalLayout>
  )
}
