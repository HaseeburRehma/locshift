import { describe, expect, it } from 'vitest'
import { buildMonthlyReport, findMissingShifts, type ReportEntry, type ReportPlan } from '@/lib/reports/monthly-report'
import { buildMonthOverview } from '@/lib/reports/overview-report'

// QA P1-1: Burak Elaslan, 26.10.2026 – three confirmed shifts, no time entries.
const BURAK = 'burak'
const plan = (id: string, start: string, end: string, extra: Partial<ReportPlan> = {}): ReportPlan => ({
  id, employee_id: BURAK, start_time: start, end_time: end, status: 'confirmed', ...extra,
})
const plans: ReportPlan[] = [
  plan('p1', '2026-10-26T07:00:00Z', '2026-10-26T08:00:00Z', { is_gastfahrt: true, shift_name: 'Gastfahrt' }),
  plan('p2', '2026-10-26T08:00:00Z', '2026-10-26T17:00:00Z'),
  plan('p3', '2026-10-26T17:00:00Z', '2026-10-26T18:00:00Z'),
]
const now = new Date('2026-11-19T12:00:00Z')

describe('planned shifts without a time entry (QA P1-1)', () => {
  it('Burak, October 2026: 26.10. shows 3 missing shifts', () => {
    const r = buildMonthlyReport({ employee: { id: BURAK, name: 'Burak Elaslan' }, month: '2026-10', entries: [], plans, now })
    const day = r.days.find((d) => d.date === '2026-10-26')!
    expect(day.missing).toHaveLength(3)
    expect(day.state).toBe('missing')
    expect(day.missing.map((m) => `${m.start}–${m.end}`)).toEqual(['08:00–09:00', '09:00–18:00', '18:00–19:00'])
    expect(r.totals.missingShifts).toBe(3)
  })
  it('the overview row shows 3 missing', () => {
    const o = buildMonthOverview({ month: '2026-10', employees: [{ id: BURAK, name: 'Burak', weeklyTargetHours: 40 }], entries: [], plans, now })
    expect(o.rows[0].missingShifts).toBe(3)
    expect(o.totals.missingShifts).toBe(3)
  })
  it('a shift with a linked or overlapping entry is not missing', () => {
    const entries: ReportEntry[] = [
      { id: 'e1', employee_id: BURAK, date: '2026-10-26', start_time: '2026-10-26T08:05:00Z', end_time: '2026-10-26T16:55:00Z', break_minutes: 0, net_hours: 8.83 },
      { id: 'e2', employee_id: BURAK, date: '2026-10-27', start_time: '2026-10-27T10:00:00Z', end_time: '2026-10-27T11:00:00Z', break_minutes: 0, net_hours: 1, plan_id: 'p3' },
    ]
    expect(findMissingShifts(plans, entries, BURAK, now).map((p) => p.id)).toEqual(['p1'])
  })
  it('shifts still running or in the future, cancelled or rejected are never missing', () => {
    const p = [
      plan('future', '2026-11-19T11:00:00Z', '2026-11-19T15:00:00Z'),
      plan('cancelled', '2026-10-20T06:00:00Z', '2026-10-20T14:00:00Z', { status: 'cancelled' }),
      plan('rejected', '2026-10-21T06:00:00Z', '2026-10-21T14:00:00Z', { status: 'rejected' }),
    ]
    expect(findMissingShifts(p, [], BURAK, now)).toEqual([])
  })
  it('another employee\'s entry does not cover the shift', () => {
    const other: ReportEntry[] = [{ id: 'x', employee_id: 'adem', date: '2026-10-26', start_time: '2026-10-26T08:00:00Z', end_time: '2026-10-26T17:00:00Z', break_minutes: 0, net_hours: 9 }]
    expect(findMissingShifts(plans, other, BURAK, now)).toHaveLength(3)
  })
  it('a day with recorded work and a missing shift is incomplete', () => {
    const entries: ReportEntry[] = [{ id: 'e1', employee_id: BURAK, date: '2026-10-26', start_time: '2026-10-26T08:00:00Z', end_time: '2026-10-26T17:00:00Z', break_minutes: 0, net_hours: 9 }]
    const r = buildMonthlyReport({ employee: { id: BURAK, name: 'B' }, month: '2026-10', entries, plans, now })
    const day = r.days.find((d) => d.date === '2026-10-26')!
    expect(day.missing).toHaveLength(2)
    expect(day.state).toBe('incomplete')
  })
})
