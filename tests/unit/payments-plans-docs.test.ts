import { describe, expect, it } from 'vitest'
import { calculateSpesen, resolveSpesenRates, spesenKind } from '@/lib/spesen'
import { monthsInPeriod, paymentPeriodLabel } from '@/lib/special-payments'
import { isoWeek, planEndDay, reassignWarnings, weekStartOf, dutyStatus } from '@/lib/plans/week'
import { daysUntil, docStatus, dueReminder, personnelFilePath } from '@/lib/personnel/documents'
import { entryStatus, dbErrorMessage } from '@/lib/times/entry-status'
import { formatHours, formatHoursLong, formatDateDE, formatShiftRange } from '@/lib/time/format'
import { toInstantIso } from '@/lib/time/shift-hours'

describe('Spesen', () => {
  it('tiers', () => {
    expect(calculateSpesen(8, false)).toBe(0)
    expect(calculateSpesen(8.01, false)).toBe(14)
    expect(calculateSpesen(2, true)).toBe(28)
  })
  it('rejects non-positive / non-numeric org rates', () => {
    expect(resolveSpesenRates({ spesen_rate_partial: '-5', spesen_rate_full: 'abc' })).toEqual({ partial: 14, full: 28 })
    expect(resolveSpesenRates({ spesen_rate_partial: '15', spesen_rate_full: 30 })).toEqual({ partial: 15, full: 30 })
  })
  it('kind detection', () => {
    expect(spesenKind(28)).toBe('full')
    expect(spesenKind(14)).toBe('partial')
    expect(spesenKind(5)).toBe('other')
    expect(spesenKind(-1)).toBe('none')
  })
})

describe('special payments', () => {
  it('monthsInPeriod is inclusive and never below 1', () => {
    expect(monthsInPeriod('2026-01-01', '2026-03-31')).toBe(3)
    expect(monthsInPeriod('2026-11-01', '2027-02-28')).toBe(4)
    expect(monthsInPeriod('2026-05-01', '2026-01-01')).toBe(1)
  })
  it('period label', () => {
    expect(paymentPeriodLabel({ distribution: 'once', billing_month: '2026-10-01' })).toBe('10/2026')
    expect(paymentPeriodLabel({ distribution: 'monthly', period_start: null, period_end: null })).toBe('–')
  })
})

describe('week planning', () => {
  it('weekStartOf returns Monday', () => {
    expect(weekStartOf('2026-10-24')).toBe('2026-10-19')
    expect(weekStartOf('2026-10-25')).toBe('2026-10-19')
    expect(weekStartOf('2026-10-26')).toBe('2026-10-26')
  })
  it('ISO week numbers around new year', () => {
    expect(isoWeek('2026-01-01')).toBe(1)
    expect(isoWeek('2027-01-01')).toBe(53)
    expect(isoWeek('2026-10-24')).toBe(43)
  })
  it('an end at midnight belongs to the previous day', () => {
    expect(planEndDay({ end_time: toInstantIso('2026-10-21', '00:00') })).toBe('2026-10-20')
  })
  it('reassign warnings: overlap, absence, expired fitness', () => {
    const plan = { id: 'p1', employee_id: 'a', start_time: toInstantIso('2026-11-02', '06:00'), end_time: toInstantIso('2026-11-02', '14:00'), status: 'planned' }
    const other = { id: 'p2', employee_id: 'b', start_time: toInstantIso('2026-11-02', '13:00'), end_time: toInstantIso('2026-11-02', '20:00'), status: 'confirmed' }
    const w = reassignWarnings(plan, 'b', {
      plans: [plan, other],
      absences: [{ employee_id: 'b', start_date: '2026-11-02', end_date: '2026-11-03', kind: 'vacation' }],
      qualifications: [{ user_id: 'b', name: 'Tauglichkeit', doc_type: 'fitness', expires_at: '2026-11-01' }],
      now: new Date('2026-10-24T10:00:00Z'),
    })
    expect(w.map((x) => x.kind).sort()).toEqual(['absence', 'overlap', 'qualification_expired'])
  })
  it('cancelled shifts never count as overlap; started shifts warn', () => {
    const plan = { id: 'p1', employee_id: 'a', start_time: '2026-10-24T04:00:00Z', end_time: '2026-10-24T12:00:00Z', status: 'planned' }
    const w = reassignWarnings(plan, 'b', {
      plans: [{ ...plan, id: 'p2', employee_id: 'b', status: 'cancelled' }],
      absences: [],
      qualifications: [],
      now: new Date('2026-10-24T10:00:00Z'),
    })
    expect(w).toEqual([{ kind: 'started' }])
  })
  it('duty status', () => {
    const plan = { start_time: '2026-10-24T04:00:00Z', end_time: '2026-10-24T12:00:00Z' }
    expect(dutyStatus(plan, null)).toBe('not_checked_in')
    expect(dutyStatus(plan, { start_time: plan.start_time, end_time: null }, new Date('2026-10-24T13:00:00Z'))).toBe('overrun')
  })
})

describe('personnel documents', () => {
  it('daysUntil is DST-proof', () => {
    expect(daysUntil('2026-10-26', '2026-10-24')).toBe(2)
    expect(daysUntil('2026-03-30', '2026-03-28')).toBe(2)
  })
  it('status windows', () => {
    expect(docStatus({ expires_at: '2026-10-23', reminder_days: [28] }, '2026-10-24')).toBe('expired')
    expect(docStatus({ expires_at: '2026-11-10', reminder_days: [] }, '2026-10-24')).toBe('expiring')
    expect(docStatus({ expires_at: '2027-11-10', reminder_days: [] }, '2026-10-24')).toBe('valid')
    expect(docStatus({ expires_at: null, reminder_days: [] })).toBe('no_expiry')
  })
  it('late record sends only the most specific reminder and settles the rest', () => {
    expect(dueReminder({ expires_at: '2026-10-30', reminder_days: [28, 14, 0] }, [], '2026-10-24')).toEqual({ send: 14, settle: [14, 28] })
    expect(dueReminder({ expires_at: '2026-10-30', reminder_days: [28, 14, 0] }, [14, 28], '2026-10-24')).toEqual({ send: null, settle: [] })
  })
  it('file paths cannot escape the employee folder', () => {
    const p = personnelFilePath('org', 'emp', '../../other-emp/confidential/x.pdf')
    expect(p.startsWith('org/emp/')).toBe(true)
    expect(p.split('/')).toHaveLength(3)
    expect(p).not.toContain('..' + '/')
    expect(personnelFilePath('org', 'emp', 'Ärztliches Attest.pdf')).toMatch(/^org\/emp\/[a-z0-9]+-Arztliches_Attest\.pdf$/)
    expect(personnelFilePath('org', 'emp', 'x.pdf', true)).toMatch(/^org\/emp\/confidential\//)
  })
})

describe('entry status + DB error mapping', () => {
  it('lifecycle', () => {
    expect(entryStatus({ is_planned: false, end_time: null, is_verified: false, submitted_at: null } as never)).toBe('running')
    expect(entryStatus({ is_planned: false, end_time: 'x', is_verified: false, submitted_at: 'y' } as never)).toBe('submitted')
    expect(entryStatus({ is_planned: false, end_time: 'x', is_verified: true, submitted_at: null } as never)).toBe('approved')
  })
  it('never leaks raw DB messages', () => {
    expect(dbErrorMessage({ message: 'new row violates row-level security policy for table "x"' }, 'de', 'F')).toBe('Keine Berechtigung für diese Aktion.')
    expect(dbErrorMessage({ message: 'syntax error at or near "select"' }, 'en', 'Fallback')).toBe('Fallback')
    expect(dbErrorMessage(null, 'en', 'Fallback')).toBe('Fallback')
  })
})

describe('formatting', () => {
  it('hours', () => {
    expect(formatHours(7.5)).toBe('7,50')
    expect(formatHours(7.5, 'en')).toBe('7.50')
    expect(formatHours(undefined)).toBe('0,00')
    expect(formatHoursLong(-1.25)).toBe('−1 Std. 15 Min.')
  })
  it('dates and ranges', () => {
    expect(formatDateDE('2026-10-24')).toBe('24.10.2026')
    expect(formatShiftRange(toInstantIso('2026-10-20', '22:00'), toInstantIso('2026-10-21', '06:00'))).toBe('22:00 – 06:00 (+1)')
    expect(formatShiftRange(toInstantIso('2026-10-20', '22:00'), null)).toBe('22:00 – läuft')
  })
})
