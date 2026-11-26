/**
 * Billing spec follow-ups (Nov 2026): Gastfahrt without surcharges, breaks at
 * their real clock time, all RIL100 points searchable with their status.
 */
import { describe, expect, it } from 'vitest'
import {
  breakPeriodFromForm,
  breakPeriodsToSave,
  breakStartForForm,
  calculateSurcharges,
  calculateZuschlag,
  positionedBreaks,
} from '@/lib/time/zuschlag'
import { toInstantIso } from '@/lib/time/shift-hours'
import { buildMonthlyReport, type ReportEntry } from '@/lib/reports/monthly-report'
import { checkRows, ril100StatusLabel } from '@/lib/operational-locations/parse'

const iso = (date: string, time: string) => toInstantIso(date, time)

describe('Gastfahrt (spec §1 + §5): no surcharges, own wage only', () => {
  it('a Sunday-night Gastfahrt has hours but no surcharge minutes', () => {
    const z = calculateSurcharges(iso('2026-11-29', '20:00'), iso('2026-11-30', '02:00'), { isGastfahrt: true, netHours: 6 })
    expect(z.gastfahrt).toBe(6)
    expect(Object.values(z.minutes).every((m) => m === 0)).toBe(true)
  })
  it('the monthly euro sum contains only Gastfahrt hours × Gastfahrt wage', () => {
    const e: ReportEntry = {
      id: 'g1', employee_id: 'u1', date: '2026-11-29', start_time: iso('2026-11-29', '20:00'), end_time: iso('2026-11-30', '02:00'),
      break_minutes: 0, net_hours: 6, is_gastfahrt: true, is_verified: true, submitted_at: iso('2026-11-30', '03:00'),
    }
    const r = buildMonthlyReport({
      employee: { id: 'u1', full_name: 'test 1' }, month: '2026-11', entries: [e], absences: [], plans: [],
      pay: [{ validFrom: '2026-01-01', hourlyWage: 20, guestHourlyWage: 15 }],
    } as never)
    expect(r.totals.surchargeTotal ?? 0).toBe(0)
    expect(r.totals.gastfahrtAmount).toBe(90)
    expect(r.totals.gastfahrtHours).toBe(6)
  })
})

describe('Breaks at their real clock time (spec §1/§3: actually worked minutes)', () => {
  // Tue 24.11. 18:00 → Wed 02:00, 30 min break.
  const s = iso('2026-11-24', '18:00')
  const e = iso('2026-11-25', '02:00')

  it('a break 22:00–22:30 is not night work: 25 % only for 3:30 h', () => {
    const z = calculateSurcharges(s, e, { netHours: 7.5, breakPeriods: [{ start: iso('2026-11-24', '22:00'), end: iso('2026-11-24', '22:30') }] })
    expect(z.minutes.night25).toBe(210)
    expect(z.minutes.night40).toBe(120)
  })
  it('a break 19:00–19:30 (no surcharge window) keeps all night minutes', () => {
    const z = calculateSurcharges(s, e, { netHours: 7.5, breakPeriods: [{ start: iso('2026-11-24', '19:00'), end: iso('2026-11-24', '19:30') }] })
    expect(z.minutes.night25).toBe(240)
    expect(z.minutes.night40).toBe(120)
  })
  it('a break across midnight is split between 25 % and 40 %', () => {
    const z = calculateSurcharges(s, e, { netHours: 7.5, breakPeriods: [{ start: iso('2026-11-24', '23:45'), end: iso('2026-11-25', '00:15') }] })
    expect(z.minutes.night25).toBe(225)
    expect(z.minutes.night40).toBe(105)
  })
  it('without break times every bucket is capped at the net minutes (fallback)', () => {
    const z = calculateSurcharges(iso('2026-11-24', '20:00'), iso('2026-11-25', '04:00'), { netHours: 7.5 })
    expect(z.minutes.night25 + z.minutes.night40).toBe(480)
    expect(z.minutes.night25).toBe(240)
    expect(z.minutes.night40).toBe(240)
  })
  it('break times that do not match the stored break length are ignored (fallback)', () => {
    expect(positionedBreaks(Date.parse(s), Date.parse(e), 30, [{ start: iso('2026-11-24', '22:00'), end: iso('2026-11-24', '23:00') }])).toBeNull()
    expect(positionedBreaks(Date.parse(s), Date.parse(e), 30, [{ start: 'kaputt', end: 'x' }])).toBeNull()
  })
  it('clock breaks in seconds (1 minute rounding) still count as positioned', () => {
    const p = positionedBreaks(Date.parse(s), Date.parse(e), 30, [{ start: '2026-11-24T21:00:07Z', end: '2026-11-24T21:29:41Z' }])
    expect(p).not.toBeNull()
  })
  it('two clock breaks, overlapping entries merged', () => {
    const z = calculateSurcharges(s, e, {
      netHours: 7.25,
      breakPeriods: [
        { start: iso('2026-11-24', '21:00'), end: iso('2026-11-24', '21:30') },
        { start: iso('2026-11-24', '21:20'), end: iso('2026-11-24', '21:45') },
      ],
    })
    expect(z.minutes.night25).toBe(195)
    expect(z.minutes.night40).toBe(120)
  })
  it('Christmas + night surcharge only for worked minutes', () => {
    // Fri 25.12.2026 20:00–24:00: Christmas 150 % + night 25 %, break excluded.
    const z = calculateSurcharges(iso('2026-12-25', '20:00'), iso('2026-12-26', '00:00'), {
      netHours: 3.5, breakPeriods: [{ start: iso('2026-12-25', '21:00'), end: iso('2026-12-25', '21:30') }],
    })
    expect(z.minutes.christmas).toBe(210)
    expect(z.minutes.night25).toBe(210)
  })
})

describe('"Pause ab" form field', () => {
  it('night shift: a break time before the start lies on the next day', () => {
    const p = breakPeriodFromForm(iso('2026-11-24', '22:00'), iso('2026-11-25', '06:00'), '01:30', 30)
    expect(p).toEqual([{ start: new Date(iso('2026-11-25', '01:30')).toISOString(), end: new Date(iso('2026-11-25', '02:00')).toISOString() }])
  })
  it('outside the shift → null; empty → []', () => {
    expect(breakPeriodFromForm(iso('2026-11-24', '08:00'), iso('2026-11-24', '16:00'), '15:45', 30)).toBeNull()
    expect(breakPeriodFromForm(iso('2026-11-24', '08:00'), iso('2026-11-24', '16:00'), '', 30)).toEqual([])
  })
  it('round trip through the stored period (German time, also in summer)', () => {
    const p = breakPeriodFromForm(iso('2026-07-14', '08:00'), iso('2026-07-14', '16:00'), '12:15', 30)!
    expect(breakStartForForm(p)).toBe('12:15')
    expect(breakStartForForm([...p, ...p])).toBe('')
  })
  it('form preview uses the break position', () => {
    const p = breakPeriodFromForm(iso('2026-11-24', '18:00'), iso('2026-11-25', '02:00'), '22:00', 30)
    expect(calculateZuschlag('2026-11-24', '18:00', '02:00', 30, false, undefined, p).minutes.night25).toBe(210)
  })
})

describe('RIL100 status labels (all points searchable)', () => {
  it('only non-operating statuses are labelled', () => {
    expect(ril100StatusLabel('Betrieb')).toBe('')
    expect(ril100StatusLabel(null)).toBe('')
    expect(ril100StatusLabel('stillg.')).toBe('stillgelegt')
    expect(ril100StatusLabel('Planung', 'en')).toBe('planned')
    expect(ril100StatusLabel('a.B.')).toBe('außer Betrieb')
    expect(ril100StatusLabel('Studie')).toBe('Studie')
  })
})

describe('what the entry forms store as break times', () => {
  const clock = [
    { start: '2026-11-24T21:00:00+00:00', end: '2026-11-24T21:15:00+00:00' },
    { start: '2026-11-25T00:00:00+00:00', end: '2026-11-25T00:15:00+00:00' },
  ]
  it('clock breaks stay when only times/notes change', () => {
    expect(breakPeriodsToSave(clock, [], '', false)).toBeUndefined()
  })
  it('a new break length without a time clears them (position unknown)', () => {
    expect(breakPeriodsToSave(clock, [], '', true)).toEqual([])
  })
  it('an unchanged "Pause ab" is not sent again (Z vs +00:00 is the same instant)', () => {
    const one = [{ start: '2026-11-24T21:00:00Z', end: '2026-11-24T21:30:00Z' }]
    expect(breakPeriodsToSave([{ start: '2026-11-24T21:00:00+00:00', end: '2026-11-24T21:30:00+00:00' }], one, '22:00', false)).toBeUndefined()
    expect(breakPeriodsToSave([], one, '22:00', true)).toEqual(one)
  })
  it('clearing "Pause ab" of a manual break stores []', () => {
    expect(breakPeriodsToSave([{ start: '2026-11-24T21:00:00Z', end: '2026-11-24T21:30:00Z' }], [], '', false)).toEqual([])
  })
  it('new entry without break: nothing to store', () => {
    expect(breakPeriodsToSave([], [], '', false)).toBeUndefined()
  })
})

describe('CSV import with a shared code (own RMR + RIL100 RMR)', () => {
  it('a row with code RMR matches the own entry, whatever the name order', () => {
    const existing = [
      { id: 'own', name: 'Zentrale RMR', short_code: 'RMR', source: null },
      { id: 'ril', name: 'Mannheim Rbf', short_code: 'RMR', source: 'RIL100 30.10.2026' },
    ]
    const res = checkRows([{ key: 'k1', name: 'Zentrale RMR', code: 'RMR' } as never], existing)
    const hit = res.get('k1') as { kind: string; existing?: { id?: string } }
    expect(hit.kind).toBe('duplicate_existing')
    expect(hit.existing?.id).toBe('own')
  })
})

describe('time account Ist = worked time only (spec §5)', () => {
  it('Gastfahrt and planned entries are not counted as Ist', async () => {
    const { groupByMonth } = await import('@/lib/times/calculations')
    const base = { employee_id: 'u1', start_time: '2026-11-24T07:00:00Z', end_time: '2026-11-24T15:00:00Z', break_minutes: 0 }
    const m = groupByMonth([
      { ...base, id: 'a', date: '2026-11-24', net_hours: 8 },
      { ...base, id: 'b', date: '2026-11-25', net_hours: 3, is_gastfahrt: true },
      { ...base, id: 'c', date: '2026-11-26', net_hours: 8, is_planned: true },
    ] as never, [])
    expect(m[0].actualHours).toBe(8)
    expect(m[0].entries.length).toBe(3)
  })
})
