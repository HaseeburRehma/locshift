import { LegalLayout } from '@/components/legal/LegalLayout'

export const metadata = {
  title: 'Datenschutzerklärung — LokShift',
  description:
    'Datenschutzerklärung der LokShift-Anwendung der Rhein Maas Rail GmbH nach DSGVO.',
}

export default function DatenschutzPage() {
  return (
    <LegalLayout
      title="Datenschutzerklärung"
      subtitle="Wie wir personenbezogene Daten in der LokShift-Anwendung verarbeiten."
      lastUpdated="Stand: 3. Juli 2026"
      otherLocaleHref="/privacy-policy"
      otherLocaleLabel="English"
    >
      <section>
        <h2>1. Verantwortlicher</h2>
        <p>
          Rhein Maas Rail GmbH<br />
          Josefstraße 157, 52080 Aachen, Deutschland<br />
          E-Mail:{' '}
          <a href="mailto:lokshiftapp@gmail.com">lokshiftapp@gmail.com</a>
        </p>
      </section>

      <section>
        <h2>2. Welche Daten wir verarbeiten</h2>
        <ul>
          <li>Stammdaten (Name, E-Mail, Telefon, Geburtsdatum, Geschlecht)</li>
          <li>Beschäftigungsdaten (Rolle, Arbeitszeitmodell, Soll-Stunden)</li>
          <li>Zeiterfassung (Start-/Endzeit, Pausen, Spesen, Ort)</li>
          <li>Einsatzpläne und Schichtdaten</li>
          <li>
            Chat-Nachrichten und Anhänge (Bilder, Dateien, Sprachnachrichten)
          </li>
          <li>Standortdaten während aktiver Schichten (alle 5 Minuten)</li>
          <li>Geräteinformationen für Push-Benachrichtigungen</li>
          <li>Profilbild (sofern hochgeladen)</li>
          <li>Qualifikationen und Zertifikate (sofern erfasst)</li>
        </ul>
      </section>

      <section>
        <h2>3. Rechtsgrundlagen</h2>
        <p>Die Verarbeitung erfolgt auf Grundlage von:</p>
        <ul>
          <li>Art. 6 Abs. 1 lit. b DSGVO — Vertragserfüllung (Arbeitsvertrag)</li>
          <li>
            Art. 6 Abs. 1 lit. c DSGVO — Erfüllung gesetzlicher Pflichten
            (Arbeitszeitgesetz, Steuerrecht)
          </li>
          <li>
            Art. 6 Abs. 1 lit. f DSGVO — Berechtigte Interessen (Disposition,
            Sicherheit)
          </li>
          <li>
            Art. 6 Abs. 1 lit. a DSGVO — Einwilligung (optionale Funktionen wie
            biometrische Sperre)
          </li>
        </ul>
      </section>

      <section>
        <h2>4. Speicherort und Auftragsverarbeitung</h2>
        <p>
          Die Anwendungsdaten werden bei Supabase gehostet (Server in der EU).
          Mit dem Anbieter besteht ein Auftragsverarbeitungsvertrag nach Art. 28
          DSGVO.
        </p>
        <p>
          Optionales Crash-Reporting erfolgt anonymisiert über Sentry (sofern
          aktiviert).
        </p>
      </section>

      <section>
        <h2>5. Standortdaten</h2>
        <p>
          Während einer aktiven Schicht erfasst die App alle 5 Minuten Ihre
          Position. Die Übertragung endet automatisch beim Ausstempeln und kann
          jederzeit in den Sicherheitseinstellungen deaktiviert werden. Die
          Daten werden ausschließlich der Disposition Ihrer Organisation zur
          Einsatzplanung angezeigt.
        </p>
      </section>

      <section>
        <h2>6. Push-Benachrichtigungen</h2>
        <p>
          Mit Ihrer Einwilligung versenden wir Push-Benachrichtigungen über
          Apple Push Notification Service (APNs) bzw. Firebase Cloud Messaging
          (FCM). Sie können diese in den Geräteeinstellungen jederzeit
          deaktivieren.
        </p>
      </section>

      <section>
        <h2>7. Speicherdauer</h2>
        <p>
          Personenbezogene Daten werden für die Dauer des Arbeitsverhältnisses
          gespeichert. Stundenzettel und steuerlich relevante Daten werden
          gemäß § 147 AO 10 Jahre archiviert. Chat-Nachrichten werden 12 Monate
          aufbewahrt, danach automatisch gelöscht.
        </p>
      </section>

      <section>
        <h2>8. Ihre Rechte</h2>
        <p>
          Sie haben das Recht auf Auskunft (Art. 15), Berichtigung (Art. 16),
          Löschung (Art. 17), Einschränkung (Art. 18), Datenübertragbarkeit
          (Art. 20) und Widerspruch (Art. 21).
        </p>
        <p>
          In der App können Sie unter „Einstellungen → Daten-Export" jederzeit
          eine vollständige Kopie Ihrer Daten als JSON-Datei herunterladen.
        </p>
      </section>

      <section>
        <h2>9. Datenschutzbeauftragter</h2>
        <p>
          Ein Datenschutzbeauftragter ist gesetzlich nicht erforderlich. Bei
          Fragen zum Datenschutz wenden Sie sich an:{' '}
          <a href="mailto:lokshiftapp@gmail.com">lokshiftapp@gmail.com</a>
        </p>
      </section>

      <section>
        <h2>10. Beschwerderecht</h2>
        <p>
          Sie haben das Recht, sich bei einer Aufsichtsbehörde zu beschweren —
          z. B. beim Landesbeauftragten für Datenschutz und
          Informationsfreiheit Nordrhein-Westfalen.
        </p>
      </section>

      <section>
        <h2>11. Änderungen dieser Erklärung</h2>
        <p>
          Wir behalten uns vor, diese Datenschutzerklärung an geänderte
          Rechtslagen oder Funktionen anzupassen.
        </p>
      </section>
    </LegalLayout>
  )
}
