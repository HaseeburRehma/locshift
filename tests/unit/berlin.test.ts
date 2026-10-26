import { describe, expect, it } from 'vitest'
import {
  berlinDateKey,
  berlinOffsetMinutes,
  berlinTimeKey,
  berlinToInstant,
  berlinWallClock,
  fromBerlinInputValue,
  toBerlinInputValue,
  weekdayOfDateKey,
} from '@/lib/time/berlin'
import { calculateNetHours, toInstantIso, localDateKey, endDayOffset } from '@/lib/time/shift-hours'
import { formatInstantDate, formatInstantDateTime, formatInstantDayMonth, formatShiftRange, formatTimeOfDay } from '@/lib/time/format'
import { calculateSurcharges } from '@/lib/time/zuschlag'

// These run under several TZ values (see test:tz) and must give the same
// German-time answers everywhere.

describe('EU summer time rule', () => {
  it.each([
    ['2026-03-29T00:59:59Z', 60],
    ['2026-03-29T01:00:00Z', 120],
    ['2026-10-25T00:59:59Z', 120],
    ['2026-10-25T01:00:00Z', 60],
    ['2027-03-28T01:00:00Z', 120],
    ['2026-01-15T12:00:00Z', 60],
    ['2026-07-15T12:00:00Z', 120],
  ])('%s → UTC+%i min', (iso, off) => {
    expect(berlinOffsetMinutes(Date.parse(iso))).toBe(off)
  })
})

describe('instant ↔ German wall clock', () => {
  it('summer and winter', () => {
    expect(berlinToInstant('2026-07-01', '08:00').toISOString()).toBe('2026-07-01T06:00:00.000Z')
    expect(berlinToInstant('2026-12-01', '08:00').toISOString()).toBe('2026-12-01T07:00:00.000Z')
  })
  it('round-trips every 15 minutes across both DST weekends', () => {
    for (const day of ['2026-03-28', '2026-03-29', '2026-03-30', '2026-10-24', '2026-10-25', '2026-10-26']) {
      for (let m = 0; m < 24 * 60; m += 15) {
        const time = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
        if (day === '2026-03-29' && time >= '02:00' && time < '03:00') continue // does not exist
        const inst = berlinToInstant(day, time)
        expect(`${berlinDateKey(inst)} ${berlinTimeKey(inst)}`).toBe(`${day} ${time}`)
      }
    }
  })
  it('spring gap moves forward, autumn repeat takes the first occurrence', () => {
    expect(berlinTimeKey(berlinToInstant('2026-03-29', '02:30'))).toBe('03:30')
    expect(berlinToInstant('2026-10-25', '02:30').toISOString()).toBe('2026-10-25T00:30:00.000Z')
  })
  it('Attachment 1 entry (stored 20:00Z) is 22:00 on 10.10. in Germany', () => {
    const w = berlinWallClock('2026-10-10T20:00:00Z')
    expect([w.day, w.hour, w.minute, w.weekday]).toEqual([10, 22, 0, 6])
  })
  it('weekday of a calendar date', () => {
    expect(weekdayOfDateKey('2026-10-25')).toBe(0)
    expect(weekdayOfDateKey('2026-10-26')).toBe(1)
  })
  it('datetime-local values', () => {
    expect(toBerlinInputValue('2026-10-14T20:00:00Z')).toBe('2026-10-14T22:00')
    expect(fromBerlinInputValue('2026-10-14T22:00')).toBe('2026-10-14T20:00:00.000Z')
    expect(fromBerlinInputValue('garbage')).toBeNull()
    expect(toBerlinInputValue(null)).toBe('')
  })
})

describe('device timezone no longer matters', () => {
  it('formatting stored instants', () => {
    expect(formatTimeOfDay('2026-10-10T20:00:00Z')).toBe('22:00')
    expect(formatInstantDate('2026-10-10T22:30:00Z')).toBe('11.10.2026')
    expect(formatInstantDateTime('2026-10-14T20:00:00Z')).toBe('14.10.2026, 22:00')
    expect(formatShiftRange('2026-10-10T20:00:00Z', '2026-10-11T06:00:00Z')).toBe('22:00 – 08:00 (+1)')
  })
  it('German short month names (no "Mai.")', () => {
    expect(formatInstantDayMonth('2026-05-06T10:00:00Z')).toBe('6. Mai')
    expect(formatInstantDayMonth('2026-09-30T22:30:00Z')).toBe('1. Okt.')
    expect(formatInstantDayMonth('2026-03-10T10:00:00Z')).toBe('10. März')
    expect(formatInstantDayMonth('2026-09-10T10:00:00Z')).toBe('10. Sept.')
    expect(formatInstantDayMonth('2026-05-06T10:00:00Z', 'en')).toBe('May 6')
  })
  it('entry math', () => {
    expect(toInstantIso('2026-10-10', '22:00')).toBe('2026-10-10T20:00:00.000Z')
    expect(calculateNetHours('2026-10-10', '22:00', '08:00')).toBe(10)
    expect(calculateNetHours('2026-10-24', '22:00', '06:00')).toBe(9)
    expect(calculateNetHours('2026-03-28', '22:00', '06:00')).toBe(7)
    expect(localDateKey(new Date('2026-10-10T22:30:00Z'))).toBe('2026-10-11')
    expect(endDayOffset('2026-10-10T20:00:00Z', '2026-10-11T06:00:00Z')).toBe(1)
  })
  it('surcharges of the Attachment 1 shift (Sat 22:00 → Sun 08:00)', () => {
    const z = calculateSurcharges('2026-10-10T20:00:00Z', '2026-10-11T06:00:00Z', { netHours: 10 })
    expect(z).toMatchObject({ night25: 2, night40: 4, sunday: 8, holiday: 0 })
  })
  it('holiday hours land on the German calendar day (1. Mai)', () => {
    expect(calculateSurcharges('2026-05-01T04:00:00Z', '2026-05-01T12:00:00Z', { netHours: 8 }).holiday).toBe(8)
    expect(calculateSurcharges('2026-04-30T20:00:00Z', '2026-05-01T04:00:00Z', { netHours: 8 }).holiday).toBe(6)
  })
})
