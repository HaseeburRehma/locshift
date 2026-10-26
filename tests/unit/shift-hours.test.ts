import { describe, expect, it } from 'vitest'
import {
  addDays,
  calculateNetHours,
  calculateShiftTimes,
  endDayOffset,
  hoursBetween,
  isValidDate,
  isValidTime,
  localDateKey,
  shiftIssues,
  toInstantIso,
} from '@/lib/time/shift-hours'

describe('time input validation', () => {
  it.each(['00:00', '09:05', '23:59'])('accepts %s', (t) => expect(isValidTime(t)).toBe(true))
  it.each(['24:00', '9:05', '12:60', '', '12:00:00', "12:00' OR 1=1", null, undefined])('rejects %s', (t) =>
    expect(isValidTime(t as string)).toBe(false),
  )
  it('validates date shape', () => {
    expect(isValidDate('2026-10-24')).toBe(true)
    expect(isValidDate('24.10.2026')).toBe(false)
    expect(isValidDate('2026-10-24T00:00')).toBe(false)
  })
})

describe('local calendar helpers', () => {
  it('localDateKey uses local time, not UTC', () => {
    // 23:30 Berlin on 24.10. is 21:30 UTC — still the 24th locally.
    expect(localDateKey(new Date('2026-10-24T21:30:00Z'))).toBe('2026-10-24')
    // 00:30 Berlin on 25.10. (summer time) is 22:30 UTC on the 24th.
    expect(localDateKey(new Date('2026-10-24T22:30:00Z'))).toBe('2026-10-25')
  })
  it('addDays crosses months, years and DST', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-03-28', 1)).toBe('2026-03-29')
    expect(addDays('2026-10-25', 1)).toBe('2026-10-26')
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29')
  })
  it('toInstantIso converts Berlin wall clock to UTC', () => {
    expect(toInstantIso('2026-07-01', '08:00')).toBe('2026-07-01T06:00:00.000Z')
    expect(toInstantIso('2026-12-01', '08:00')).toBe('2026-12-01T07:00:00.000Z')
  })
})

describe('calculateShiftTimes', () => {
  it('day shift with break', () => {
    const s = calculateShiftTimes('2026-10-20', '06:00', '14:30', 30)
    expect(s.isOvernight).toBe(false)
    expect(s.netHours).toBe(8)
    expect(s.grossHours).toBe(8.5)
  })
  it('overnight shift ends next day (22:00 → 08:00 = 10 h)', () => {
    const s = calculateShiftTimes('2026-10-20', '22:00', '08:00', 0)
    expect(s.isOvernight).toBe(true)
    expect(s.endDate).toBe('2026-10-21')
    expect(s.netHours).toBe(10)
  })
  it('DST spring night is one hour shorter', () => {
    expect(calculateNetHours('2026-03-28', '22:00', '06:00')).toBe(7)
  })
  it('DST autumn night is one hour longer', () => {
    expect(calculateNetHours('2026-10-24', '22:00', '06:00')).toBe(9)
  })
  it('break longer than shift never goes negative', () => {
    const s = calculateShiftTimes('2026-10-20', '08:00', '09:00', 120)
    expect(s.netHours).toBe(0)
    expect(s.breakExceedsShift).toBe(true)
  })
  it('negative break is ignored', () => {
    expect(calculateNetHours('2026-10-20', '08:00', '09:00', -60)).toBe(1)
  })
  it('garbage input yields a zero-hour shift instead of NaN', () => {
    for (const [d, a, b] of [
      ['x', '08:00', '09:00'],
      ['2026-10-20', '25:00', '09:00'],
      ['2026-10-20', '08:00', '<script>'],
    ]) {
      const s = calculateShiftTimes(d, a, b, 0)
      expect(s.netHours).toBe(0)
      expect(Number.isNaN(new Date(s.startISO).getTime())).toBe(false)
    }
  })
  it('same start and end is 0 h, not 24 h', () => {
    expect(calculateNetHours('2026-10-20', '08:00', '08:00')).toBe(0)
  })
})

describe('stored-entry math matches the DB trigger formula', () => {
  it('hoursBetween rounds to 2 decimals', () => {
    expect(hoursBetween('2026-10-20T06:00:00Z', '2026-10-20T13:20:00Z', 0)).toBe(7.33)
  })
  it('end before start is 0 (DB would roll it to the next day before computing)', () => {
    expect(hoursBetween('2026-10-20T10:00:00Z', '2026-10-20T09:00:00Z')).toBe(0)
  })
  it('handles nulls and invalid dates', () => {
    expect(hoursBetween(null, '2026-10-20T09:00:00Z')).toBe(0)
    expect(hoursBetween('nope', 'also-nope')).toBe(0)
  })
  it('endDayOffset counts local calendar days', () => {
    expect(endDayOffset(toInstantIso('2026-10-20', '22:00'), toInstantIso('2026-10-21', '06:00'))).toBe(1)
    expect(endDayOffset(toInstantIso('2026-10-20', '06:00'), toInstantIso('2026-10-20', '14:00'))).toBe(0)
  })
})

describe('shiftIssues', () => {
  const at = (d: string, t: string) => toInstantIso(d, t)
  it('flags a running shift', () => {
    expect(shiftIssues({ start_time: at('2026-10-20', '08:00'), end_time: null })).toEqual(['missing_end'])
  })
  it('flags end = start', () => {
    expect(shiftIssues({ start_time: at('2026-10-20', '08:00'), end_time: at('2026-10-20', '08:00') })).toContain('end_equals_start')
  })
  it('flags a break eating the whole shift', () => {
    expect(
      shiftIssues({ start_time: at('2026-10-20', '08:00'), end_time: at('2026-10-20', '09:00'), break_minutes: 60 }),
    ).toEqual(['break_exceeds_shift'])
  })
  it('flags shifts over 16 h', () => {
    expect(shiftIssues({ start_time: at('2026-10-20', '06:00'), end_time: at('2026-10-21', '00:00') })).toContain('very_long')
  })
  it('ignores planned entries', () => {
    expect(shiftIssues({ start_time: at('2026-10-20', '08:00'), end_time: null, is_planned: true })).toEqual([])
  })
})
