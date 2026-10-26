import { describe, expect, it } from 'vitest'
import { generateGermanHolidays, holidayName } from '@/lib/time/holidays'
import { calculateSurcharges, calculateZuschlag, resolveSurchargeRules, sumZuschlag } from '@/lib/time/zuschlag'
import { toInstantIso } from '@/lib/time/shift-hours'

describe('NRW public holidays', () => {
  it('2026 Easter-relative dates', () => {
    expect(holidayName('2026-04-03')).toBe('Karfreitag')
    expect(holidayName('2026-04-06')).toBe('Ostermontag')
    expect(holidayName('2026-05-14')).toBe('Christi Himmelfahrt')
    expect(holidayName('2026-05-25')).toBe('Pfingstmontag')
    expect(holidayName('2026-06-04')).toBe('Fronleichnam')
  })
  it('2025 and 2027 Easter', () => {
    expect(holidayName('2025-04-21')).toBe('Ostermontag')
    expect(holidayName('2027-03-29')).toBe('Ostermontag')
  })
  it('NRW has 11 holidays and no Reformationstag', () => {
    const h = generateGermanHolidays(2026, 'NW')
    expect(h).toHaveLength(11)
    expect(h.find((x) => x.date === '2026-10-31')).toBeUndefined()
    expect(holidayName('2026-11-01')).toBe('Allerheiligen')
  })
  it('Buß- und Bettag in Saxony is the Wednesday before 23.11.', () => {
    expect(generateGermanHolidays(2026, 'SN').find((x) => x.name === 'Buß- und Bettag')?.date).toBe('2026-11-18')
    // 23.11.2022 was itself a Wednesday → holiday on the 16th.
    expect(generateGermanHolidays(2022, 'SN').find((x) => x.name === 'Buß- und Bettag')?.date).toBe('2022-11-16')
  })
  it('returns null for junk input', () => {
    expect(holidayName('')).toBeNull()
    expect(holidayName('abcd-01-01')).toBeNull()
  })
})

describe('surcharges', () => {
  it('22:00 → 06:00 weekday: 2 h at 25 %, 4 h at 40 %', () => {
    const z = calculateZuschlag('2026-10-20', '22:00', '06:00')
    expect(z.night25).toBe(2)
    expect(z.night40).toBe(4)
    expect(z.sunday).toBe(0)
  })
  it('only the Sunday part of a shift counts (22:30 Sun → 10:20 Mon = 1.5 h)', () => {
    const z = calculateZuschlag('2026-10-18', '22:30', '10:20')
    expect(z.sunday).toBe(1.5)
  })
  it('holiday hours on 1. Mai', () => {
    const z = calculateZuschlag('2026-05-01', '06:00', '14:00')
    expect(z.holiday).toBe(8)
  })
  it('Christmas is excluded from the holiday premium', () => {
    expect(calculateZuschlag('2026-12-25', '06:00', '14:00').holiday).toBe(0)
  })
  it('premium hours never exceed net hours (long break)', () => {
    const z = calculateZuschlag('2026-10-18', '08:00', '12:00', 180)
    expect(z.sunday).toBe(1)
  })
  it('DST autumn night counts the extra hour in the 40 % window', () => {
    // 25.10.2026: 02:00–03:00 happens twice → 00:00–04:00 holds 5 real hours.
    const z = calculateSurcharges(toInstantIso('2026-10-24', '22:00'), toInstantIso('2026-10-25', '06:00'), { netHours: 9 })
    expect(z.night40).toBe(5)
    expect(z.night25).toBe(2)
  })
  it('corrupt instants return zeros, never loop or throw', () => {
    expect(calculateSurcharges('2026-10-20T10:00:00Z', '2026-10-20T09:00:00Z').night25).toBe(0)
    expect(calculateSurcharges('x', 'y').night25).toBe(0)
    // Years-long range is capped by the loop guard.
    const z = calculateSurcharges('2020-01-01T00:00:00Z', '2030-01-01T00:00:00Z', { netHours: 10 })
    expect(z.night25).toBeLessThanOrEqual(10)
  })
  it('Gastfahrt gets the full net hours', () => {
    expect(calculateZuschlag('2026-10-20', '08:00', '12:00', 0, true).gastfahrt).toBe(4)
  })
  it('sumZuschlag rounds once at the end', () => {
    const one = { night25: 0.33, night40: 0, sunday: 0, holiday: 0, gastfahrt: 0 }
    expect(sumZuschlag([one, one, one]).night25).toBe(0.99)
  })
  it('organisation settings override defaults; garbage falls back', () => {
    const r = resolveSurchargeRules({ surcharges: { night25_from: '21:00', night40_to: 'bad', gastfahrt_counts_as_work: false } })
    expect(r.night25From).toBe(21 * 60)
    expect(r.night40To).toBe(4 * 60)
    expect(r.gastfahrtCountsAsWork).toBe(false)
    expect(resolveSurchargeRules(null).night25From).toBe(20 * 60)
  })
})
