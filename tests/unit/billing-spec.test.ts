/**
 * LokShift Dev Spec – Billing Rules (Rhein Maas Rail, Nov 2026).
 * The worked examples of the spec are asserted literally.
 */
import { describe, expect, it } from 'vitest'
import { generateGermanHolidays, holidayName, GERMAN_STATES } from '@/lib/time/holidays'
import {
  calculateSurcharges,
  calculateZuschlag,
  DEFAULT_SURCHARGE_RULES,
  resolveSurchargeRules,
  rulesForState,
  surchargePctAt,
  weightedSurchargeHours,
} from '@/lib/time/zuschlag'
import { calculateSpesen } from '@/lib/spesen'
import { buildMonthlyReport, payRateOn, type ReportEntry } from '@/lib/reports/monthly-report'
import { toInstantIso, calculateShiftTimes } from '@/lib/time/shift-hours'

const R = DEFAULT_SURCHARGE_RULES
const at = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3))

describe('Section 1 – night surcharges', () => {
  it('20–24 = 25 %, 00–04 = 40 %, 04–20 = 0 % (weekday)', () => {
    expect(surchargePctAt('2026-11-24', at('19:59'))).toBe(0)
    expect(surchargePctAt('2026-11-24', at('20:00'))).toBe(25)
    expect(surchargePctAt('2026-11-24', at('23:59'))).toBe(25)
    expect(surchargePctAt('2026-11-25', at('00:00'))).toBe(40)
    expect(surchargePctAt('2026-11-25', at('03:59'))).toBe(40)
    expect(surchargePctAt('2026-11-25', at('04:00'))).toBe(0)
  })
  it('22:00–02:00 is split at midnight: 2 h × 25 % + 2 h × 40 %', () => {
    const z = calculateZuschlag('2026-11-24', '22:00', '02:00')
    expect(z.minutes.night25).toBe(120)
    expect(z.minutes.night40).toBe(120)
  })
  it('to the minute: 19:47–20:13 = 13 min at 25 %', () => {
    expect(calculateZuschlag('2026-11-24', '19:47', '20:13').minutes.night25).toBe(13)
  })
})

describe('Section 2 – Sunday and holiday surcharges', () => {
  it('rates per day', () => {
    expect(surchargePctAt('2026-11-22', at('10:00'))).toBe(50) // Sunday
    expect(surchargePctAt('2026-10-03', at('10:00'))).toBe(50) // Tag der Deutschen Einheit (Sat)
    expect(surchargePctAt('2026-12-25', at('10:00'))).toBe(150)
    expect(surchargePctAt('2026-12-26', at('10:00'))).toBe(150)
    expect(surchargePctAt('2026-12-24', at('10:00'))).toBe(0)
  })
  it('31 December is split at 12:00', () => {
    expect(surchargePctAt('2026-12-31', at('11:59'))).toBe(0)
    expect(surchargePctAt('2026-12-31', at('12:00'))).toBe(125)
    const z = calculateZuschlag('2026-12-31', '08:00', '16:00')
    expect(z.minutes.newYearsEve).toBe(240)
    expect(weightedSurchargeHours(z.minutes)).toBe(5) // 4 h × 125 %
  })
  it('holidays depend on the employee’s Bundesland', () => {
    // Allerheiligen 01.11.2027 (Monday): NW yes, NI no; Reformationstag 31.10.2025 (Friday): NI yes, NW no.
    const nw = rulesForState(R, 'NW')
    const ni = rulesForState(R, 'NI')
    expect(calculateZuschlag('2027-11-01', '08:00', '16:00', 0, false, nw).minutes.holiday).toBe(480)
    expect(calculateZuschlag('2027-11-01', '08:00', '16:00', 0, false, ni).minutes.holiday).toBe(0)
    expect(calculateZuschlag('2025-10-31', '08:00', '16:00', 0, false, ni).minutes.holiday).toBe(480)
    expect(calculateZuschlag('2025-10-31', '08:00', '16:00', 0, false, nw).minutes.holiday).toBe(0)
  })
  it('an unknown state code falls back to the organisation’s', () => {
    expect(rulesForState(R, 'XX').holidayState).toBe('NW')
    expect(resolveSurchargeRules({ surcharges: { holiday_state: 'BY' } }, null).holidayState).toBe('BY')
    expect(resolveSurchargeRules({ surcharges: { holiday_state: 'BY' } }, 'HH').holidayState).toBe('HH')
  })
})

describe('Section 3 – combining surcharges (worked examples)', () => {
  it('Group A never adds up: holiday on a Sunday = 50 %, 25.12. on a Sunday = 150 %', () => {
    // 2027-03-28 Ostersonntag is a Sunday, Ostermontag not; use Pfingstsonntag BB (holiday + Sunday).
    expect(surchargePctAt('2026-05-24', at('10:00'), rulesForState(R, 'BB'))).toBe(50)
    // 25.12.2022 was a Sunday.
    expect(surchargePctAt('2022-12-25', at('10:00'))).toBe(150)
  })
  it.each([
    ['Sunday 22:00', '2026-11-22', '22:00', 75],
    ['Sunday 02:00', '2026-11-22', '02:00', 90],
    ['25 Dec 22:00', '2026-12-25', '22:00', 175],
    ['26 Dec 02:00', '2026-12-26', '02:00', 190],
    ['31 Dec 22:00', '2026-12-31', '22:00', 150],
  ])('%s → %i %%', (_l, date, time, pct) => {
    expect(surchargePctAt(date, at(time))).toBe(pct)
  })
  it('a shift across several windows is calculated segment by segment', () => {
    // Sat 31.10.2026 18:00 → Sun 01.11.2026 06:00 (NW: Allerheiligen on a Sunday)
    const z = calculateZuschlag('2026-10-31', '18:00', '06:00')
    expect(z.minutes).toEqual({ night25: 240, night40: 240, sunday: 0, holiday: 360, christmas: 0, newYearsEve: 0 })
    // 20–24 Sat: 4 h × 25 %; 00–04 Sun+holiday: 4 h × (50 + 40) %; 04–06: 2 h × 50 %
    expect(weightedSurchargeHours(z.minutes)).toBe(1 + 3.6 + 1)
  })
  it('31.12. 22:00 → 01.01. 06:00: Silvester 125 % + 25 %, then Neujahr 50 % + 40 %', () => {
    const z = calculateZuschlag('2026-12-31', '22:00', '06:00')
    expect(z.minutes).toEqual({ night25: 120, night40: 240, sunday: 0, holiday: 360, christmas: 0, newYearsEve: 120 })
  })
})

describe('Section 4 – Spesen', () => {
  it('under 8 h 0 €, 8 h or more 14 €, 8 h or more with overnight 28 € — never additive', () => {
    expect(calculateSpesen(7.98, false)).toBe(0)
    expect(calculateSpesen(7.98, true)).toBe(0)
    expect(calculateSpesen(8, false)).toBe(14)
    expect(calculateSpesen(8, true)).toBe(28)
    expect(calculateSpesen(12, true)).toBe(28)
  })
  it('7:59 h is under 8 h (minute rule)', () => {
    expect(calculateSpesen(calculateShiftTimes('2026-11-24', '08:00', '15:59').netHours, false)).toBe(0)
    expect(calculateSpesen(calculateShiftTimes('2026-11-24', '08:00', '16:00').netHours, false)).toBe(14)
  })
})

function entry(date: string, start: string, end: string, extra: Partial<ReportEntry> = {}): ReportEntry {
  const s = calculateShiftTimes(date, start, end, Number(extra.break_minutes) || 0)
  return {
    id: `${date}-${start}-${Math.random()}`,
    employee_id: 'e1',
    date,
    start_time: s.startISO,
    end_time: s.endISO,
    break_minutes: 0,
    net_hours: s.netHours,
    is_verified: true,
    ...extra,
  }
}

describe('Sections 5 and 6 – Gastfahrt and month boundary', () => {
  it('31 Jan 22:00 → 1 Feb 08:00: all 10 h and its surcharges in January, nothing in February', () => {
    const e = entry('2027-01-31', '22:00', '08:00', { meal_allowance: 14 })
    const jan = buildMonthlyReport({ employee: { id: 'e1', name: 'test 1' }, month: '2027-01', entries: [e] })
    const feb = buildMonthlyReport({ employee: { id: 'e1', name: 'test 1' }, month: '2027-02', entries: [e] })
    expect(jan.totals.workHours).toBe(10)
    // 31.01.2027 is a Sunday: 22–24 Sunday 50 % + night 25 %; 00–04 night 40 %, Monday.
    expect(jan.totals.surchargeMinutes).toEqual({ night25: 120, night40: 240, sunday: 120, holiday: 0, christmas: 0, newYearsEve: 0 })
    expect(jan.totals.spesenFromEntries).toBe(14)
    expect(feb.totals.workHours).toBe(0)
    expect(feb.totals.spesenFromEntries).toBe(0)
    expect(feb.days.every((d) => d.rows.length === 0)).toBe(true)
  })
  it('Gastfahrt is not working time, reported separately with its own wage', () => {
    const r = buildMonthlyReport({
      employee: { id: 'e1', name: 'test 1' },
      month: '2026-11',
      entries: [entry('2026-11-24', '08:00', '16:00'), entry('2026-11-25', '08:00', '11:30', { is_gastfahrt: true })],
      pay: [{ validFrom: '2026-01-01', hourlyWage: 20, guestHourlyWage: 12 }],
    })
    expect(r.totals.workHours).toBe(8)
    expect(r.totals.gastfahrtHours).toBe(3.5)
    expect(r.totals.actualHours).toBe(8)
    expect(r.totals.baseAmount).toBe(160)
    expect(r.totals.gastfahrtAmount).toBe(42)
  })
})

describe('Euro amounts on the regular gross wage (no cascading)', () => {
  it('Sunday 20:00–02:00 at 20 €/h: 4 h × 75 % + 2 h × 40 % (Mon) = 60 + 16 = 76 €', () => {
    const r = buildMonthlyReport({
      employee: { id: 'e1', name: 'test 1' },
      month: '2026-11',
      entries: [entry('2026-11-22', '20:00', '02:00')],
      pay: [{ validFrom: '2026-11-01', hourlyWage: 20, guestHourlyWage: null }],
    })
    const by = Object.fromEntries(r.totals.surchargeLines.map((l) => [l.bucket, l.amount]))
    expect(by.night25).toBe(20) // 4 h × 20 € × 25 %
    expect(by.sunday).toBe(40) // 4 h × 20 € × 50 %
    expect(by.night40).toBe(16) // 2 h × 20 € × 40 %
    expect(r.totals.surchargeTotal).toBe(76)
  })
  it('each shift uses the wage valid on its start day', () => {
    const pay = [
      { validFrom: '2026-01-01', hourlyWage: 20, guestHourlyWage: null },
      { validFrom: '2026-11-15', hourlyWage: 22, guestHourlyWage: null },
    ]
    expect(payRateOn(pay, '2026-11-14')?.hourlyWage).toBe(20)
    expect(payRateOn(pay, '2026-11-15')?.hourlyWage).toBe(22)
    const r = buildMonthlyReport({
      employee: { id: 'e1', name: 'test 1' },
      month: '2026-11',
      entries: [entry('2026-11-08', '10:00', '12:00'), entry('2026-11-15', '10:00', '12:00')], // both Sundays
      pay,
    })
    // 2 h × 20 € × 50 % + 2 h × 22 € × 50 % = 20 + 22
    expect(r.totals.surchargeTotal).toBe(42)
    expect(r.totals.hourlyWage).toBeNull()
    expect(r.totals.wagesUsed.map((w) => w.hourlyWage)).toEqual([20, 22])
  })
  it('without a wage for every shift there is no partial euro sum', () => {
    const r = buildMonthlyReport({
      employee: { id: 'e1', name: 'test 1' },
      month: '2026-11',
      entries: [entry('2026-11-08', '10:00', '12:00'), entry('2026-11-22', '10:00', '12:00')],
      pay: [{ validFrom: '2026-11-15', hourlyWage: 20, guestHourlyWage: null }],
    })
    expect(r.totals.surchargeTotal).toBeNull()
    expect(r.totals.surchargeLines.find((l) => l.bucket === 'sunday')?.hours).toBe(4)
  })
})

describe('holiday calendars of all 16 states', () => {
  it('2026 counts per state (statutory, state-wide)', () => {
    const counts = Object.fromEntries(GERMAN_STATES.map((s) => [s.code, generateGermanHolidays(2026, s.code).length]))
    expect(counts).toEqual({ BW: 12, BY: 13, BE: 10, BB: 12, HB: 10, HH: 10, HE: 10, MV: 11, NI: 10, NW: 11, RP: 11, SL: 12, SN: 11, ST: 11, SH: 10, TH: 11 })
  })
  it('state-specific days', () => {
    expect(holidayName('2026-01-06', 'ST')).toBe('Heilige Drei Könige')
    expect(holidayName('2026-11-01', 'RP')).toBe('Allerheiligen')
    expect(holidayName('2026-09-20', 'TH')).toBe('Weltkindertag')
    expect(holidayName('2026-03-08', 'MV')).toBe('Internationaler Frauentag')
    expect(holidayName('2026-08-15', 'SL')).toBe('Mariä Himmelfahrt')
    expect(holidayName('2026-06-04', 'HE')).toBe('Fronleichnam')
    expect(holidayName('2026-06-04', 'SN')).toBeNull()
  })
  it('DST night in late October stays exact', () => {
    const z = calculateSurcharges(toInstantIso('2026-10-24', '22:00'), toInstantIso('2026-10-25', '06:00'), { netHours: 9 })
    // 25.10.2026 is a Sunday: 00–06 = 7 real hours on Sunday.
    expect(z.minutes.night40).toBe(300)
    expect(z.minutes.sunday).toBe(420)
  })
})
