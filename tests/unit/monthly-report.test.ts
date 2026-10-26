import { describe, expect, it } from 'vitest'
import { buildMonthlyReport, specialPaymentForMonth, type ReportEntry } from '@/lib/reports/monthly-report'
import { toInstantIso } from '@/lib/time/shift-hours'

const EMP = { id: 'e1', name: 'Test Fahrer' }
let n = 0
function entry(date: string, start: string, end: string | null, extra: Partial<ReportEntry> = {}): ReportEntry {
  const endDate = end && end < start ? new Date(new Date(date).getTime() + 86_400_000).toISOString().slice(0, 10) : date
  return {
    id: `t${++n}`,
    employee_id: EMP.id,
    date,
    start_time: toInstantIso(date, start),
    end_time: end ? toInstantIso(endDate, end) : null,
    break_minutes: 0,
    net_hours: null,
    is_verified: true,
    submitted_at: '2026-10-01T00:00:00Z',
    ...extra,
  }
}

describe('buildMonthlyReport', () => {
  it('Soll = weekly/5 × Mo–Fr without holidays, minus vacation weekdays', () => {
    // Oct 2026: 22 weekdays, 03.10. is a Saturday → 22 target days.
    const r = buildMonthlyReport({
      employee: EMP,
      month: '2026-10',
      entries: [],
      weeklyTargetHours: 40,
      absences: [{ employee_id: EMP.id, start_date: '2026-10-05', end_date: '2026-10-11', kind: 'vacation' }],
    })
    expect(r.totals.weekdays).toBe(22)
    expect(r.totals.absenceWeekdays).toBe(5)
    expect(r.totals.targetHours).toBe(8 * 17)
    expect(r.totals.vacationDays).toBe(5)
  })

  it('night shift belongs to its start day and month; Gastfahrt is separated', () => {
    const r = buildMonthlyReport({
      employee: EMP,
      month: '2026-10',
      entries: [
        entry('2026-10-31', '22:00', '06:00'),
        entry('2026-10-20', '08:00', '12:00', { is_gastfahrt: true }),
        entry('2026-11-01', '08:00', '12:00'),
      ],
    })
    expect(r.totals.workHours).toBe(8)
    expect(r.totals.gastfahrtHours).toBe(4)
    expect(r.totals.actualHours).toBe(12)
    // 01.11. (Allerheiligen) belongs to November, so only the Oct-31 shift's
    // post-midnight hours touch the holiday.
    expect(r.totals.holiday).toBe(6)
  })

  it('counts Spesen once per day and warns', () => {
    const r = buildMonthlyReport({
      employee: EMP,
      month: '2026-10',
      entries: [entry('2026-10-20', '04:00', '09:00', { meal_allowance: 14 }), entry('2026-10-20', '10:00', '16:00', { meal_allowance: 14 })],
    })
    expect(r.totals.spesenFromEntries).toBe(14)
    expect(r.warnings.length).toBe(1)
  })

  it("ignores other employees' and planned entries (no data mixing)", () => {
    const r = buildMonthlyReport({
      employee: EMP,
      month: '2026-10',
      entries: [entry('2026-10-20', '08:00', '16:00', { employee_id: 'someone-else' }), entry('2026-10-21', '08:00', '16:00', { is_planned: true })],
    })
    expect(r.totals.workHours).toBe(0)
    expect(r.approval.state).toBe('empty')
  })

  it('approval state and running entries', () => {
    const r = buildMonthlyReport({
      employee: EMP,
      month: '2026-10',
      entries: [entry('2026-10-20', '08:00', '16:00'), entry('2026-10-21', '08:00', null, { is_verified: false, submitted_at: null })],
    })
    expect(r.approval.state).toBe('partial')
    expect(r.totals.runningEntries).toBe(1)
    expect(r.days.find((d) => d.date === '2026-10-21')?.state).toBe('incomplete')
  })

  it('a 2-day per-diem claim without num_days counts its full amount', () => {
    const r = buildMonthlyReport({
      employee: EMP,
      month: '2026-10',
      entries: [],
      perDiemClaims: [{ id: 'c1', employee_id: EMP.id, start_date: '2026-10-20', end_date: '2026-10-21', amount: 56 }],
    })
    expect(r.totals.perDiemClaims.amount).toBe(56)
  })

  it('a per-diem claim across a month boundary is split by days', () => {
    const claim = { id: 'c1', employee_id: EMP.id, start_date: '2026-10-31', end_date: '2026-11-01', amount: 56, num_days: 2 }
    const oct = buildMonthlyReport({ employee: EMP, month: '2026-10', entries: [], perDiemClaims: [claim] })
    const nov = buildMonthlyReport({ employee: EMP, month: '2026-11', entries: [], perDiemClaims: [claim] })
    expect(oct.totals.perDiemClaims.amount + nov.totals.perDiemClaims.amount).toBe(56)
  })
})

describe('specialPaymentForMonth', () => {
  it('pro-rata shares add up to the exact amount', () => {
    const p = { id: 'x', employee_id: 'e1', title: 'Prämie', amount: 100, distribution: 'prorata' as const, period_start: '2026-01-01', period_end: '2026-03-31' }
    const parts = ['2026-01', '2026-02', '2026-03'].map((m) => specialPaymentForMonth(p, m)!.amount)
    expect(parts).toEqual([33.33, 33.33, 33.34])
    expect(specialPaymentForMonth(p, '2026-04')).toBeNull()
  })
  it('once only in its billing month', () => {
    const p = { id: 'x', employee_id: 'e1', title: 'U', amount: 500, distribution: 'once' as const, billing_month: '2026-06-01' }
    expect(specialPaymentForMonth(p, '2026-06')?.amount).toBe(500)
    expect(specialPaymentForMonth(p, '2026-07')).toBeNull()
  })
})
