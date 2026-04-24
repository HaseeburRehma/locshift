// Phase 3 verification script — parse-diagnostic pass using the
// project's own TypeScript compiler to catch syntax + obvious
// reference mistakes without triggering a full tsc build (which
// exceeds the sandbox timeout).
//
// Safe to delete.

const path = require('path')
const fs = require('fs')
const ts = require('typescript')

const ROOT = __dirname

const files = [
  // Types + SQL types are parsed as .ts; SQL files are only existence-checked.
  'lib/types.ts',
  // Phase 3 sources
  'hooks/useOperationalLocations.ts',
  'components/shared/BetriebsstelleSelector.tsx',
  'app/dashboard/settings/betriebsstellen/page.tsx',
  'components/shared/PlanForm.tsx',
  'components/time/TimeEntryForm.tsx',
  'components/time/TimeEntryDetails.tsx',
  'components/time/TimesList.tsx',
  'app/dashboard/times/page.tsx',
  'hooks/times/useTimeMutations.ts',
  'hooks/plans/usePlans.ts',
  'lib/pdf/exportPdf.ts',
  'app/dashboard/settings/page.tsx',
  // Phase 4 sources
  'hooks/calendar/useCreateEvent.ts',
  'hooks/calendar/useCalendarEvents.ts',
  'components/calendar/NewEventSheet.tsx',
  'components/calendar/CalendarEventItem.tsx',
  'components/calendar/CalendarEventList.tsx',
  'app/api/calendar/reminders/route.ts',
  'lib/notifications/service.ts',
  // Phase 5 sources — CR #2 (optional location), #4/#5/#6 (PDF export on times page)
  // Note: TimesList.tsx / times/page.tsx / pdf/exportPdf.ts are already listed
  // above (they were also touched in Phase 3); they get re-checked by nature.
  'app/dashboard/reports/page.tsx',
  // Phase 6 sources — German-first localisation sweep
  'lib/i18n.tsx',
  'components/time/MonthlyBreakdown.tsx',
  // Phase 7 — Full dashboard translation pass + calendar error fix
  'app/dashboard/page.tsx',
  'app/dashboard/live/page.tsx',
  'components/dashboard/PersonnelMonitor.tsx',
  'app/dashboard/plans/page.tsx',
  'app/dashboard/time-account/page.tsx',
  'components/time/PersonnelTimeAccounts.tsx',
  'app/dashboard/per-diem/page.tsx',
  'app/dashboard/customers/page.tsx',
  'app/dashboard/users/page.tsx',
  'components/dashboard/user-management-panel.tsx',
  'components/notifications/NotificationPanel.tsx',
  'components/layout/NotificationBell.tsx',
  'hooks/useCustomers.ts',
  'components/shared/PlanForm.tsx',
  'components/time/ClockInOutCard.tsx',
]

const sqlFiles = [
  'scripts/phase3_betriebsstellen.sql',
  'scripts/phase3_gastfahrt.sql',
  'scripts/phase4_calendar_reminders.sql',
  'scripts/phase4_shared_events_rls.sql',
]

let ok = true

for (const rel of files) {
  const full = path.join(ROOT, rel)
  if (!fs.existsSync(full)) {
    console.error(`[MISSING] ${rel}`)
    ok = false
    continue
  }
  const source = fs.readFileSync(full, 'utf-8')
  const sf = ts.createSourceFile(
    rel,
    source,
    ts.ScriptTarget.Latest,
    true,
    rel.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  )
  const diags = sf.parseDiagnostics || []
  if (diags.length === 0) {
    console.log(`[OK]      ${rel}`)
  } else {
    ok = false
    console.error(`[PARSE]   ${rel} — ${diags.length} error(s)`)
    for (const d of diags.slice(0, 5)) {
      const msg = ts.flattenDiagnosticMessageText(d.messageText, '\n')
      const loc = d.file && d.start != null
        ? sf.getLineAndCharacterOfPosition(d.start)
        : null
      console.error(
        `           ${loc ? `L${loc.line + 1}:${loc.character + 1}` : '?'}  ${msg}`,
      )
    }
  }
}

for (const rel of sqlFiles) {
  const full = path.join(ROOT, rel)
  if (!fs.existsSync(full)) {
    console.error(`[MISSING] ${rel}`)
    ok = false
  } else {
    const sz = fs.statSync(full).size
    console.log(`[SQL]     ${rel} (${sz} bytes)`)
  }
}

console.log(ok ? '\nALL PASS' : '\nFAILURES')
process.exit(ok ? 0 : 1)
