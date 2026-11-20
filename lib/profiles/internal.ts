/**
 * Internal (test/support) accounts — QA data cleanup before handover.
 *
 * profiles.is_internal = TRUE hides an account from every client-facing
 * view: employee lists and pickers, Wochenplanung, reports, Sonderzahlungen,
 * Spesen, Zeiterfassung, Fristen and the dashboard.
 *
 * Hidden for everyone by default — also for our own internal admin account,
 * which the client uses for acceptance (QA 20.11.). Internal staff can show
 * them again for a test run with the switch in Einstellungen; the choice is
 * stored per browser and off by default.
 */

const PREF_KEY = 'lokshift.showTestAccounts'

interface Viewer {
  is_internal?: boolean | null
}

interface Filterable<Q> {
  eq(column: string, value: unknown): Q
}

/** The browser-local opt-in of internal staff (false on the server). */
export function readShowTestAccounts(): boolean {
  try {
    return typeof window !== 'undefined' && window.localStorage.getItem(PREF_KEY) === '1'
  } catch {
    return false
  }
}

export function writeShowTestAccounts(on: boolean): void {
  try {
    if (on) window.localStorage.setItem(PREF_KEY, '1')
    else window.localStorage.removeItem(PREF_KEY)
  } catch {
    /* storage blocked: stays hidden */
  }
}

/** True only for internal staff who switched test accounts on. */
export function seesInternal(viewer: Viewer | null | undefined): boolean {
  return !!viewer?.is_internal && readShowTestAccounts()
}

/** Adds `is_internal = false` unless the viewer opted in to see test accounts. */
export function hideInternal<Q extends Filterable<Q>>(query: Q, viewer: Viewer | null | undefined): Q {
  return seesInternal(viewer) ? query : query.eq('is_internal', false)
}

/** Client-side variant for already loaded profile rows. */
export function visibleProfiles<T extends { is_internal?: boolean | null }>(rows: T[], viewer: Viewer | null | undefined): T[] {
  return seesInternal(viewer) ? rows : rows.filter((r) => r.is_internal !== true)
}

/** Client-side filter for rows that carry a joined `employee` profile. */
export function visibleByEmployee<T extends { employee?: { is_internal?: boolean | null } | null }>(rows: T[], viewer: Viewer | null | undefined): T[] {
  return seesInternal(viewer) ? rows : rows.filter((r) => r.employee?.is_internal !== true)
}
