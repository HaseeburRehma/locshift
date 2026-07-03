import { LegalLayout } from '@/components/legal/LegalLayout'

export const metadata = {
  title: 'Impressum — LokShift',
  description:
    'Anbieterkennzeichnung gemäß § 5 TMG der Rhein Maas Rail GmbH für die LokShift-Anwendung.',
}

export default function ImpressumPage() {
  return (
    <LegalLayout
      title="Impressum"
      subtitle="Anbieterkennzeichnung gemäß § 5 TMG."
    >
      <section>
        <h2>Angaben gemäß § 5 TMG</h2>
        <p>
          Rhein Maas Rail GmbH<br />
          Josefstraße 157<br />
          52080 Aachen<br />
          Deutschland
        </p>
      </section>

      <section>
        <h2>Vertretungsberechtigt</h2>
        <p>Ali Adem Altay, Geschäftsführer</p>
      </section>

      <section>
        <h2>Kontakt</h2>
        <p>
          E-Mail:{' '}
          <a href="mailto:lokshiftapp@gmail.com">lokshiftapp@gmail.com</a>
        </p>
      </section>

      <section>
        <h2>Registereintrag</h2>
        <p>
          Handelsregister: HRB 28426<br />
          Registergericht: Amtsgericht Aachen
        </p>
      </section>

      <section>
        <h2>Umsatzsteuer-ID</h2>
        <p>
          Umsatzsteuer-Identifikationsnummer nach § 27a UStG:
          <br />
          DE451905461
        </p>
      </section>

      <section>
        <h2>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
        <p>
          Ali Adem Altay<br />
          Josefstraße 157, 52080 Aachen
        </p>
      </section>

      <section>
        <h2>Streitschlichtung</h2>
        <p>
          Die Europäische Kommission stellt eine Plattform zur
          Online-Streitbeilegung (OS) bereit:{' '}
          <a
            href="https://ec.europa.eu/consumers/odr/"
            target="_blank"
            rel="noopener noreferrer"
          >
            https://ec.europa.eu/consumers/odr/
          </a>
          . Wir sind nicht bereit oder verpflichtet, an
          Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle
          teilzunehmen.
        </p>
      </section>

      <section>
        <h2>Haftung für Inhalte</h2>
        <p>
          Als Diensteanbieter sind wir für eigene Inhalte auf diesen Seiten
          nach den allgemeinen Gesetzen verantwortlich. Wir sind jedoch nicht
          verpflichtet, übermittelte oder gespeicherte fremde Informationen zu
          überwachen.
        </p>
      </section>

      <section>
        <h2>Urheberrecht</h2>
        <p>
          Die durch die Seitenbetreiber erstellten Inhalte und Werke auf
          diesen Seiten unterliegen dem deutschen Urheberrecht.
          Vervielfältigung, Bearbeitung, Verbreitung und jede Art der
          Verwertung außerhalb der Grenzen des Urheberrechts bedürfen der
          schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers.
        </p>
      </section>
    </LegalLayout>
  )
}
