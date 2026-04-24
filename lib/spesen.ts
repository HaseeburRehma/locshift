/**
 * Meal-allowance ("Spesen") calculation — German workforce rules.
 *
 * Reference: §9 Abs. 4a EStG (2026 pauschalen).
 * Defaults used by Rheinmaasrail:
 *   partial day  (>8h away, no overnight stay)           →  €14
 *   full day     (overnight stay, away from home)        →  €28
 *     (Anreisetag / Abreisetag still pay at partial rate.)
 *
 * Policy in LokShift:
 *   - Rates are **organization-configurable** (organizations.spesen_rate_partial / _full).
 *   - Spesen is computed **per time-entry**, not per plan. Actual worked
 *     hours are the source of truth.
 *   - A shift that crosses midnight stays as a single entry; the
 *     overnight_stay flag is the deciding factor.
 *   - Shifts <= 8h with no overnight earn no Spesen.
 *
 * This module intentionally has no I/O and no side effects so it can be
 * imported from both server and client (e.g. PDF export).
 */

export interface SpesenRates {
  partial: number
  full: number
}

export const DEFAULT_SPESEN_RATES: SpesenRates = {
  partial: 14,
  full: 28,
}

/**
 * Calculate meal allowance in EUR for a single time entry.
 *
 * @param hoursWorked   Net hours the employee was away from their
 *                      regular place of work (after break deduction).
 * @param overnightStay True when the entry is part of a trip that
 *                      required an overnight stay away from home.
 * @param rates         Org-configured rates (falls back to defaults).
 */
export function calculateSpesen(
  hoursWorked: number,
  overnightStay: boolean,
  rates: Partial<SpesenRates> = {},
): number {
  const partial = rates.partial ?? DEFAULT_SPESEN_RATES.partial
  const full = rates.full ?? DEFAULT_SPESEN_RATES.full

  if (overnightStay) return full
  if (hoursWorked > 8) return partial
  return 0
}

/**
 * Localized label for the rate tier that was applied, used in UI tooltips
 * and PDF footers.
 */
export function spesenTierLabel(
  amount: number,
  rates: Partial<SpesenRates> = {},
  locale: 'de' | 'en' = 'de',
): string {
  const partial = rates.partial ?? DEFAULT_SPESEN_RATES.partial
  const full = rates.full ?? DEFAULT_SPESEN_RATES.full

  if (amount >= full) return locale === 'de' ? 'Vollsatz (Übernachtung)' : 'Full (overnight)'
  if (amount >= partial) return locale === 'de' ? 'Teilsatz (>8 Std.)' : 'Partial (>8h)'
  return locale === 'de' ? 'Kein Anspruch' : 'None'
}
