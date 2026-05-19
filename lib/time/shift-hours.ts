/**
 * Shift duration helpers — single source of truth for converting a
 * (date, start "HH:mm", end "HH:mm", break minutes) tuple into:
 *   - the correct end-date when the shift wraps past midnight
 *   - the full ISO timestamps to store in start_time / end_time
 *   - the net worked hours after break deduction
 *
 * THE OVERNIGHT BUG (fixed here):
 *   If a shift starts at 23:00 and ends at 06:00 the next day, the old
 *   code built BOTH timestamps with the same date, so `end - start`
 *   went negative and Math.max(0, …) clamped it to 0. The whole shift
 *   was lost.
 *
 *   Fix: if end "HH:mm" < start "HH:mm" we treat the end as falling on
 *   the following calendar day. This matches the Excel formula the
 *   client uses on their manual Stundenzettel:
 *     IF(End >= Start, End - Start, (1 - Start) + End) * 24
 *
 * Edge cases:
 *   - end == start  → treated as same-day, 0 hours worked (zero-length
 *     shift). The form should still reject it via validation, but the
 *     helper is defensive.
 *   - missing / malformed times → returns netHours = 0 so callers can
 *     short-circuit without crashing.
 *
 * Pure module (no I/O) so it imports cleanly into client, server, and
 * PDF export.
 */

export interface ShiftTimes {
  /** ISO string suitable for `time_entries.start_time` (timestamptz). */
  startISO: string
  /** ISO string suitable for `time_entries.end_time` — may be next day. */
  endISO: string
  /** YYYY-MM-DD of the start (always == input date). */
  startDate: string
  /** YYYY-MM-DD of the end (== startDate, OR startDate + 1 if overnight). */
  endDate: string
  /** True when the shift wraps past midnight. */
  isOvernight: boolean
  /** Gross worked hours (no break deduction). */
  grossHours: number
  /** Net worked hours after break deduction (clamped >= 0). */
  netHours: number
}

/** Returns true when "HH:mm" b is strictly earlier than "HH:mm" a. */
function isEndBeforeStart(start: string, end: string): boolean {
  // Lexicographic comparison works for zero-padded "HH:mm".
  return end < start
}

/** Add `n` calendar days to a YYYY-MM-DD string and return YYYY-MM-DD. */
function addDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00`)
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

/**
 * Compute everything a caller needs from a (date, start, end, break) tuple.
 *
 * Returns zeroed-out values for grossHours/netHours when inputs are
 * obviously broken (missing/malformed times) so callers can still build
 * a row without crashing.
 */
export function calculateShiftTimes(
  date: string,
  startTime: string,
  endTime: string,
  breakMinutes: number = 0,
): ShiftTimes {
  // Defensive defaults
  if (!date || !startTime || !endTime || !/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime)) {
    const safeStartISO = `${date || new Date().toISOString().split('T')[0]}T${startTime || '00:00'}:00`
    return {
      startISO: safeStartISO,
      endISO: safeStartISO,
      startDate: date,
      endDate: date,
      isOvernight: false,
      grossHours: 0,
      netHours: 0,
    }
  }

  const isOvernight = isEndBeforeStart(startTime, endTime)
  const endDate = isOvernight ? addDays(date, 1) : date

  const startISO = `${date}T${startTime}:00`
  const endISO = `${endDate}T${endTime}:00`

  const startMs = new Date(startISO).getTime()
  const endMs = new Date(endISO).getTime()
  const grossHours = Math.max(0, (endMs - startMs) / 3_600_000)
  const netHours = Math.max(0, grossHours - (breakMinutes || 0) / 60)

  return {
    startISO,
    endISO,
    startDate: date,
    endDate,
    isOvernight,
    grossHours,
    netHours,
  }
}

/**
 * Thin convenience wrapper that returns only the net hours value.
 * Useful for live previews and validations.
 */
export function calculateNetHours(
  date: string,
  startTime: string,
  endTime: string,
  breakMinutes: number = 0,
): number {
  return calculateShiftTimes(date, startTime, endTime, breakMinutes).netHours
}
