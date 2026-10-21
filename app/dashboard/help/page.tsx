'use client'

/**
 * Anleitungen (Kundenfeedback Punkt 15) — short step-by-step guides for
 * employees and for admin/dispatch, each step linked to the screen.
 */

import React, { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, BookOpen, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUser } from '@/lib/user-context'

interface Guide {
  title: string
  summary: string
  steps: string[]
  href?: string
  linkLabel?: string
}

const EMPLOYEE: Guide[] = [
  {
    title: 'Meine Woche ansehen und Schichten bestätigen',
    summary: 'Alle Einsätze der Woche mit Beginn, Ende, Kunde, Start- und Zielbetriebsstelle.',
    steps: [
      'Menü „Meine Woche“ öffnen – die aktuelle Kalenderwoche wird angezeigt.',
      'Mit den Pfeilen oben zur Vor- oder Folgewoche wechseln.',
      'Neue Schichten sind als „Offen“ markiert: „Bestätigen“ tippen. Passt eine Schicht nicht, über „Details“ → „Ablehnen“ einen Grund angeben.',
      'Änderungen der Disposition erscheinen automatisch; Sie erhalten zusätzlich eine Nachricht per App und E-Mail.',
    ],
    href: '/dashboard/plans/my-week',
    linkLabel: 'Meine Woche öffnen',
  },
  {
    title: 'Schicht starten, Pause und beenden',
    summary: 'Zeiterfassung direkt auf der Übersicht.',
    steps: [
      'Auf der Übersicht „Schicht starten“ tippen. Die geplante Schicht wird automatisch zugeordnet.',
      'Für eine Pause „Pause machen“, danach „Fortsetzen“ tippen. Ohne Pause bleibt die Pause bei 0 Minuten – das ist erlaubt.',
      'Am Ende „Beenden“ tippen. Die Zeit stoppt, und die Abschlussansicht öffnet sich.',
    ],
    href: '/dashboard',
    linkLabel: 'Zur Übersicht',
  },
  {
    title: 'Abschlussansicht: Zeiten prüfen und absenden',
    summary: 'Geplant, erfasst und abzusendende Werte nebeneinander.',
    steps: [
      'Prüfen Sie Beginn, Ende und Pause. Die Arbeitszeit wird sofort berechnet (z. B. 22:00–08:00 = 10,00 Std.; Ende am Folgetag wird erkannt).',
      '„Planzeit übernehmen“ setzt Beginn und Ende auf die geplanten Zeiten.',
      'Haben Sie länger gearbeitet, tragen Sie die tatsächlichen Zeiten ein.',
      '„Übernachtung“ einschalten, falls zutreffend – die Spesen werden angepasst.',
      '„Schicht absenden“ tippen. Danach sind Änderungen nur noch per Korrekturantrag möglich.',
    ],
  },
  {
    title: 'Schichtende vergessen – was tun?',
    summary: 'Beispiel: geplant 10:00–18:00, beendet erst um 23:00.',
    steps: [
      'Schicht wie gewohnt mit „Beenden“ stoppen (auch nachträglich).',
      'In der Abschlussansicht „Planzeit übernehmen“ tippen → 10:00–18:00, ohne Pause 8,00 Std.',
      '„Schicht absenden“. Die ursprünglich erfasste Zeit (23:00) bleibt für die Disposition im Verlauf sichtbar.',
      'Bereits abgesendet? Dann unter „Zeiterfassung“ den Eintrag öffnen und „Korrektur beantragen“.',
    ],
  },
  {
    title: 'Korrektur nach dem Absenden beantragen',
    summary: 'Änderungen werden erst nach Freigabe durch Disposition oder Admin wirksam.',
    steps: [
      '„Zeiterfassung“ öffnen und den Eintrag antippen.',
      '„Korrektur beantragen“ wählen, die richtigen Werte eintragen und kurz begründen.',
      'Bis zur Entscheidung gelten die bisherigen Werte; der Antrag ist als „Korrektur offen“ markiert.',
      'Sie werden über Genehmigung oder Ablehnung benachrichtigt.',
    ],
    href: '/dashboard/times',
    linkLabel: 'Zur Zeiterfassung',
  },
  {
    title: 'Eigene Stunden und Monatsnachweis',
    summary: 'Alle Tage, Zuschläge, Spesen und Sonderzahlungen eines Monats.',
    steps: [
      'Menü „Monatsnachweis“ öffnen und den Monat wählen.',
      'Offene oder nicht freigegebene Einträge sind markiert.',
      'Über „PDF“ oder „Excel“ den Nachweis herunterladen. 7,50 Std. entsprechen 7 Std. 30 Min.',
    ],
    href: '/dashboard/times/monthly',
    linkLabel: 'Monatsnachweis öffnen',
  },
]

const MANAGER: Guide[] = [
  {
    title: 'Übersicht: Wer ist laut Planung im Einsatz?',
    summary: 'Die Startseite zeigt alle laut Plan aktiven Personen – auch ohne Check-in.',
    steps: [
      'Status je Person: noch nicht eingecheckt, eingecheckt, bereits beendet oder Planzeit überschritten.',
      'Darunter: offene Freigaben, unbesetzte und abgelehnte Schichten sowie bald ablaufende Fristen.',
    ],
    href: '/dashboard',
    linkLabel: 'Zur Übersicht',
  },
  {
    title: 'Schichten anlegen und zuweisen',
    summary: 'Einzeln, für mehrere Tage/Mitarbeiter oder direkt aus der Wochenplanung.',
    steps: [
      '„Wochenplanung“ öffnen und in der Zeile des Mitarbeiters auf das „+“ des Tages klicken – Datum und Mitarbeiter sind vorausgefüllt.',
      'Schichtbezeichnung, Zeiten, Kunde sowie Start- und Zielbetriebsstelle (Suche nach Name oder Kürzel) eintragen.',
      'Endet die Schicht nach Mitternacht, wird sie automatisch dem Folgetag zugeordnet.',
      '„Unbesetzt“ wählen, wenn noch niemand feststeht. Der Mitarbeiter wird per App und E-Mail informiert.',
    ],
    href: '/dashboard/plans/week',
    linkLabel: 'Zur Wochenplanung',
  },
  {
    title: 'Schicht umverteilen (A → B)',
    summary: 'Per Drag & Drop oder über „Mitarbeiter ändern“.',
    steps: [
      'Schicht in der Wochenplanung auf die Zeile des neuen Mitarbeiters (gleicher Tag) ziehen – oder Schicht anklicken → „Mitarbeiter ändern“.',
      'Vor dem Speichern werden alte und neue Zuordnung angezeigt, dazu Warnungen zu Überschneidungen, Abwesenheit und abgelaufenen Nachweisen.',
      '„Umverteilung speichern“: A erhält eine Nachricht über den Entzug, B über die neue Schicht (App + E-Mail).',
      'Begonnene oder abgeschlossene Schichten sind gesperrt und lassen sich nur mit Bestätigung umverteilen.',
    ],
    href: '/dashboard/plans/week',
    linkLabel: 'Zur Wochenplanung',
  },
  {
    title: 'Freigaben und Korrekturanträge',
    summary: 'Alles, was geprüft werden muss, an einer Stelle.',
    steps: [
      '„Freigaben“ öffnen.',
      'Korrekturanträge: bisherige und beantragte Werte vergleichen, optional Hinweis eingeben, dann „Genehmigen & übernehmen“ oder „Ablehnen“.',
      'Abgesendete Zeiten einzeln oder gesammelt freigeben. Einträge mit Fehlern (z. B. 0 Stunden) können erst nach Korrektur freigegeben werden.',
      'Nicht abgesendete oder noch laufende Schichten: „Erinnern“ sendet dem Mitarbeiter eine Nachricht.',
      'Jede Änderung wird mit alten und neuen Werten, Bearbeiter, Zeitpunkt und Begründung protokolliert (Verlauf im Eintrag).',
    ],
    href: '/dashboard/times/approvals',
    linkLabel: 'Zu den Freigaben',
  },
  {
    title: 'Stunden stellvertretend erfassen',
    summary: 'Zeiten für einen Lokführer eintragen.',
    steps: [
      '„Zeiterfassung“ → „Eintrag hinzufügen“.',
      'Mitarbeiter und Datum wählen; unter „Geplante Schicht übernehmen“ eine Schicht auswählen – Zeiten und Details werden vorausgefüllt.',
      'Pause eintragen (0 ist erlaubt) und speichern, optional „Direkt freigeben“.',
      'Bei möglicher Doppelerfassung erscheint eine Warnung. Der Mitarbeiter sieht den Eintrag als „stellvertretend erfasst“.',
    ],
    href: '/dashboard/times',
    linkLabel: 'Zur Zeiterfassung',
  },
  {
    title: 'Monatsnachweis, Spesen und Sonderzahlungen',
    summary: 'Ein Nachweis pro Mitarbeiter und Monat – identisch in App, PDF und Excel.',
    steps: [
      '„Monatsnachweis“ öffnen, Mitarbeiter und Monat wählen.',
      'Kopf: Soll-Stunden, Erstellungsdatum und Freigabestatus. Tageszeilen mit Zuschlägen 25 %/40 %, Sonn-/Feiertag, Gastfahrt und Spesen.',
      'Sonderzahlungen unter „Sonderzahlungen“ anlegen (einmalig, monatlich oder anteilig) – sie erscheinen automatisch im passenden Monat.',
      'PDF (Querformat, Kopfzeile auf jeder Seite) oder Excel exportieren.',
    ],
    href: '/dashboard/times/monthly',
    linkLabel: 'Monatsnachweis öffnen',
  },
  {
    title: 'Auswertungen: alle Lokführer & Mehrmonatsreport',
    summary: 'Monat für alle Lokführer oder ein Mitarbeiter über mehrere Monate.',
    steps: [
      '„Berichte“ → „Gesamtauswertung“: Monat wählen – eine Zeile je Mitarbeiter plus Summen.',
      '„Mehrmonatsreport“: Mitarbeiter und Zeitraum (z. B. Januar bis Juni) wählen – Monatszeilen, Summen und Diagramme.',
      'Export als PDF oder Excel. Die Werte entsprechen den Monatsnachweisen.',
    ],
    href: '/dashboard/reports/overview',
    linkLabel: 'Zu den Auswertungen',
  },
  {
    title: 'Personalakte und Fristen',
    summary: 'Tauglichkeit und weitere Nachweise mit Ablaufdatum.',
    steps: [
      '„Personal & Fristen“ → „Nachweis hinzufügen“: Mitarbeiter, Dokumentart, Ablaufdatum, Datei und Erinnerungen wählen.',
      'Erinnerungen gehen automatisch an Admin und Disposition (Standard: 4 und 2 Wochen vorher sowie am Ablaufdatum).',
      'Nach Erneuerung „Erneuern“ wählen: neuer Nachweis wird gespeichert, der alte archiviert – offene Erinnerungen sind erledigt.',
      'Vertrauliche Unterlagen sind nur für Admins sichtbar.',
    ],
    href: '/dashboard/personnel',
    linkLabel: 'Zu Personal & Fristen',
  },
  {
    title: 'Betriebsstellen importieren und suchen',
    summary: 'Hunderte Betriebsstellen aus PDF, CSV oder Excel übernehmen.',
    steps: [
      '„Einstellungen“ → „Betriebsstellen“ → „Importieren“ und die Datei wählen.',
      'In der Vorschau jede Zeile prüfen und bei Bedarf Kürzel, Name oder Art korrigieren. Dubletten sind markiert.',
      '„Importieren“ speichert die ausgewählten Zeilen. Danach lassen sich Betriebsstellen jederzeit einzeln ergänzen.',
      'In Schicht- und Zeitformularen nach Name, Namensteil oder Kürzel suchen.',
    ],
    href: '/dashboard/settings/betriebsstellen',
    linkLabel: 'Zu den Betriebsstellen',
  },
]

export default function HelpPage() {
  const { isAdmin, isDispatcher } = useUser()
  const isManager = isAdmin || isDispatcher
  const [tab, setTab] = useState<'employee' | 'manager'>(isManager ? 'manager' : 'employee')
  const [open, setOpen] = useState<number | null>(0)
  const guides = tab === 'manager' ? MANAGER : EMPLOYEE

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6">
      <div>
        <h1 className="flex items-center gap-3 text-2xl md:text-3xl font-bold tracking-tight text-[#0064E0]">
          <BookOpen className="w-7 h-7" /> Anleitung
        </h1>
        <p className="text-sm text-slate-400 font-medium">Kurzanleitungen zu den wichtigsten Abläufen in LokShift.</p>
      </div>

      {isManager && (
        <div className="inline-flex rounded-xl bg-slate-100 p-1">
          {([
            ['manager', 'Admin & Disposition'],
            ['employee', 'Mitarbeiter'],
          ] as const).map(([k, label]) => (
            <button
              key={k}
              onClick={() => { setTab(k); setOpen(0) }}
              className={cn('px-4 h-9 rounded-lg text-sm font-bold', tab === k ? 'bg-white text-[#0064E0] shadow-sm' : 'text-slate-500')}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-3">
        {guides.map((g, i) => (
          <div key={g.title} className="rounded-2xl border border-slate-200 bg-white">
            <button onClick={() => setOpen(open === i ? null : i)} className="flex w-full items-center gap-4 px-5 py-4 text-left">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-black text-[#0064E0]">{i + 1}</span>
              <span className="flex-1">
                <span className="block text-sm font-black text-slate-900">{g.title}</span>
                <span className="block text-xs text-slate-500">{g.summary}</span>
              </span>
              <ChevronDown className={cn('w-5 h-5 text-slate-400 transition-transform', open === i && 'rotate-180')} />
            </button>
            {open === i && (
              <div className="border-t border-slate-100 px-5 py-4 space-y-3">
                <ol className="space-y-2">
                  {g.steps.map((s, n) => (
                    <li key={n} className="flex gap-3 text-sm text-slate-700">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-black text-slate-600">{n + 1}</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ol>
                {g.href && (
                  <Link href={g.href} className="inline-flex items-center gap-1 text-sm font-bold text-[#0064E0] hover:underline">
                    {g.linkLabel} <ArrowRight className="w-4 h-4" />
                  </Link>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
