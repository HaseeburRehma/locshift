import { LegalLayout } from '@/components/legal/LegalLayout'

export const metadata = {
  title: 'Allgemeine Geschäftsbedingungen — LokShift',
  description:
    'Nutzungsbedingungen für die LokShift-Anwendung der Rhein Maas Rail GmbH.',
}

export default function AgbPage() {
  return (
    <LegalLayout
      title="Allgemeine Geschäftsbedingungen"
      subtitle="Nutzungsbedingungen für die LokShift-Anwendung."
      lastUpdated="Stand: 3. Juli 2026"
      otherLocaleHref="/terms"
      otherLocaleLabel="English"
    >
      <section>
        <h2>§ 1 Geltungsbereich</h2>
        <p>
          Diese Nutzungsbedingungen regeln die Nutzung der LokShift-Anwendung
          (nachfolgend „App" oder „Anwendung") durch berechtigte Mitarbeiter
          und Disponenten der Kundenorganisation, mit der ein gültiger
          Lizenzvertrag besteht.
        </p>
      </section>

      <section>
        <h2>§ 2 Berechtigung</h2>
        <p>
          Der Zugang zur App ist nur über eine durch den Arbeitgeber
          bereitgestellte Einladung möglich. Das Konto darf nicht an Dritte
          weitergegeben werden.
        </p>
      </section>

      <section>
        <h2>§ 3 Pflichten des Nutzers</h2>
        <ul>
          <li>Anmeldedaten sind vertraulich zu behandeln.</li>
          <li>
            Erfasste Zeiten müssen der tatsächlichen Arbeitsleistung
            entsprechen.
          </li>
          <li>Standortdaten dürfen nicht manipuliert werden.</li>
          <li>
            Chat-Funktionen sind ausschließlich für dienstliche Kommunikation
            zu nutzen.
          </li>
          <li>
            Belästigungen, Diskriminierung oder rechtswidrige Inhalte sind
            untersagt.
          </li>
        </ul>
      </section>

      <section>
        <h2>§ 4 Verfügbarkeit</h2>
        <p>
          Wir bemühen uns um eine Verfügbarkeit von 99 %. Wartungsfenster
          werden rechtzeitig angekündigt. Ein dauerhaft störungsfreier Betrieb
          wird nicht zugesichert.
        </p>
      </section>

      <section>
        <h2>§ 5 Datenverarbeitung</h2>
        <p>
          Die Datenverarbeitung erfolgt im Rahmen der{' '}
          <a href="/datenschutz">Datenschutzerklärung</a> sowie eines
          gesonderten Auftragsverarbeitungsvertrags zwischen dem Arbeitgeber
          und der Rhein Maas Rail GmbH.
        </p>
      </section>

      <section>
        <h2>§ 6 Haftung</h2>
        <p>
          Wir haften nur für Schäden, die auf grober Fahrlässigkeit oder
          Vorsatz beruhen. Die Haftung für leichte Fahrlässigkeit ist — außer
          bei Verletzung wesentlicher Vertragspflichten — ausgeschlossen.
        </p>
      </section>

      <section>
        <h2>§ 7 Beendigung</h2>
        <p>
          Bei Ende des Arbeitsverhältnisses wird das Konto vom Arbeitgeber
          deaktiviert. Persönliche Daten werden gemäß Datenschutzerklärung
          gespeichert oder gelöscht.
        </p>
      </section>

      <section>
        <h2>§ 8 Änderungen</h2>
        <p>
          Wir behalten uns vor, diese Bedingungen anzupassen. Änderungen werden
          in der App angekündigt; die fortgesetzte Nutzung gilt als Zustimmung.
        </p>
      </section>

      <section>
        <h2>§ 9 Anwendbares Recht</h2>
        <p>
          Es gilt das Recht der Bundesrepublik Deutschland. Gerichtsstand ist
          Aachen, sofern der Nutzer Kaufmann ist.
        </p>
      </section>

      <section>
        <h2>§ 10 Salvatorische Klausel</h2>
        <p>
          Sollten einzelne Bestimmungen dieser Nutzungsbedingungen unwirksam
          sein, bleibt die Wirksamkeit der übrigen Bestimmungen unberührt.
        </p>
      </section>
    </LegalLayout>
  )
}
