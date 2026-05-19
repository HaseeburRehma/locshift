/**
 * Zuschlag (supplements / allowances) calculator — mirrors the exact
 * formulas the client uses in their manual Stundenzettel Excel.
 *
 * SOURCE (from client template "Orkan Parlar Oktober Stundenzettel"):
 *
 *   I (25% Zuschlag)  — hours worked between 20:00 and 24:00
 *     IF(End>=Start, MAX(0,(MIN(End,1)-MAX(Start,20/24))*24),
 *                    MAX(0,(1-MAX(Start,20/24))*24))
 *
 *   J (40% Zuschlag)  — hours worked between 00:00 and 04:00
 *     IF(End>=Start, IF(Start<4/24, (MIN(End,4/24)-Start)*24, 0),
 *                    (MIN(End,4/24))*24)
 *
 *   K (Sonntagszuschlag) — full shift hours when the shift starts on a Sunday
 *     IF(WEEKDAY="So", (End-Start)*24, 0)
 *
 *   L (Feiertagszuschlag) — full shift hours on a configured public holiday
 *     IF(date IN holidays AND date NOT IN {25.12, 26.12}, hours, 0)
 *     NB: The template explicitly *excludes* Christmas Day and Boxing
 *     Day from the holiday list, because Rheinmaasrail pays those under
 *     a different bonus scheme.
 *
 *   M (Gastfahrt) — manually entered hours, not derived from times.
 *
 * In LokShift we store `is_gastfahrt` as a boolean per entry. When that
 * flag is set, the entry's net hours count toward the Gastfahrt total.
 *
 * All inputs use the same overnight convention as
 * `lib/time/shift-hours.ts`: if endTime < startTime, the shift wraps to
 * the next day. The math here intentionally mirrors the Excel formulas
 * so the LokShift output matches a manual calculation done from the
 * same start/end times.
 *
 * Pure module (no I/O); safe for both client and server.
 */

import { calculateShiftTimes } from './shift-hours'

/** Default German public holidays for 2025 — matches the client template. */
export const DEFAULT_HOLIDAYS_2025: string[] = [
  '2025-01-01', // Neujahr
  '2025-04-18', // Karfreitag
  '2025-04-21', // Ostermontag
  '2025-05-01', // Tag der Arbeit
  '2025-05-29', // Christi Himmelfahrt
  '2025-06-09', // Pfingstmontag
  '2025-06-19', // Fronleichnam
  '2025-10-03', // Tag der Deutschen Einheit
  '2025-11-01', // Allerheiligen
]

/**
 * Hours/dates that the client template excludes from the Feiertag
 * column even though they would otherwise count as holidays. Christmas
 * Day and Boxing Day are paid via a separate Weihnachtsgeld scheme.
 */
export const EXCLUDED_HOLIDAYS: string[] = ['2025-12-25', '2025-12-26']

export interface ZuschlagBreakdown {
  /** 25% night premium hours (20:00 – 24:00). */
  night25: number
  /** 40% night premium hours (00:00 – 04:00). */
  night40: number
  /** Hours worked on a Sunday. */
  sunday: number
  /** Hours worked on a designated public holiday. */
  holiday: number
  /** Hours flagged as Gastfahrt (passenger travel). */
  gastfahrt: number
}

const EMPTY: ZuschlagBreakdown = {
  night25: 0,
  night40: 0,
  sunday: 0,
  holiday: 0,
  gastfahrt: 0,
}

/**
 * Compute the hours of overlap between [start, end] (in minutes from
 * midnight, possibly extending past 1440 for overnight shifts) and a
 * fixed window [winStart, winEnd] in minutes.
 *
 * For overnight shifts, the shift end is start + duration which may be
 * up to 48*60. We test the window in two domains: today's [winStart,
 * winEnd] AND tomorrow's [winStart + 1440, winEnd + 1440].
 */
function overlapHours(
  shiftStart: number,
  shiftEnd: number,
  winStart: number,
  winEnd: number,
): number {
  // Today's window
  const a1 = Math.max(shiftStart, winStart)
  const b1 = Math.min(shiftEnd, winEnd)
  const today = Math.max(0, b1 - a1)
  // Tomorrow's window (for overnight shifts)
  const a2 = Math.max(shiftStart, winStart + 1440)
  const b2 = Math.min(shiftEnd, winEnd + 1440)
  const tomorrow = Math.max(0, b2 - a2)
  return (today + tomorrow) / 60
}

/**
 * Calculate all Zuschlag values for a single shift from its
 * raw start/end strings.
 *
 * @param date        YYYY-MM-DD of the shift start
 * @param startTime   "HH:mm"
 * @param endTime     "HH:mm" (may wrap past midnight)
 * @param breakMinutes Net break to subtract from the total
 * @param isGastfahrt If true, the net hours are recorded under Gastfahrt
 * @param holidays    Optional override list of YYYY-MM-DD holiday dates
 * @param excluded    Optional override list of dates to never count as holiday
 */
export function calculateZuschlag(
  date: string,
  startTime: string,
  endTime: string,
  breakMinutes: number = 0,
  isGastfahrt: boolean = false,
  holidays: string[] = DEFAULT_HOLIDAYS_2025,
  excluded: string[] = EXCLUDED_HOLIDAYS,
): ZuschlagBreakdown {
  if (!date || !startTime || !endTime) return { ...EMPTY }

  const shift = calculateShiftTimes(date, startTime, endTime, breakMinutes)
  const netHours = shift.netHours
  if (netHours <= 0) return { ...EMPTY }

  // Convert HH:mm to minutes-from-midnight, then push end into a
  // continuous timeline (so an overnight shift's end is > 1440).
  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)
  const startMin = sh * 60 + sm
  let endMin = eh * 60 + em
  if (shift.isOvernight) endMin += 1440

  // 25% night band: 20:00 – 24:00 → 1200..1440 minutes
  const night25 = overlapHours(startMin, endMin, 1200, 1440)
  // 40% night band: 00:00 – 04:00 → 0..240 minutes
  const night40 = overlapHours(startMin, endMin, 0, 240)

  // Weekday of the shift start (0 = Sunday). The Excel template tags
  // the whole shift to its start day even if it crosses midnight.
  const weekday = new Date(`${date}T00:00:00`).getDay()
  const sunday = weekday === 0 ? netHours : 0

  // Holiday: count only when the start date is in the holiday list AND
  // not on the excluded list (Xmas / Boxing Day).
  const isHoliday = holidays.includes(date) && !excluded.includes(date)
  const holiday = isHoliday ? netHours : 0

  const gastfahrt = isGastfahrt ? netHours : 0

  return { night25, night40, sunday, holiday, gastfahrt }
}

/** Sum a list of breakdowns into a single totals object. */
export function sumZuschlag(rows: ZuschlagBreakdown[]): ZuschlagBreakdown {
  return rows.reduce<ZuschlagBreakdown>(
    (acc, r) => ({
      night25: acc.night25 + r.night25,
      night40: acc.night40 + r.night40,
      sunday: acc.sunday + r.sunday,
      holiday: acc.holiday + r.holiday,
      gastfahrt: acc.gastfahrt + r.gastfahrt,
    }),
    { ...EMPTY },
  )
}
