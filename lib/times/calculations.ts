import { TimeEntry, MonthlyTimeData, Plan } from '../types'
import { startOfMonth, endOfMonth, isSameMonth, differenceInMilliseconds } from 'date-fns'

/**
 * Counts working days (Mon-Fri) in a specific month
 */
export function countWorkingDays(year: number, month: number): number {
  const startDate = new Date(year, month - 1, 1)
  const endDate = new Date(year, month, 0)
  let count = 0
  
  const current = new Date(startDate)
  while (current <= endDate) {
    const day = current.getDay()
    if (day !== 0 && day !== 6) { // skip Sat & Sun
      count++
    }
    current.setDate(current.getDate() + 1)
  }
  return count
}

/**
 * Calculates scheduled hours from confirmed/assigned plans for a given month
 */
export function scheduledHoursForMonth(
  plans: Plan[], year: number, month: number
): number {
  return plans
    .filter(p => {
      const d = new Date(p.start_time)
      return d.getFullYear() === year && d.getMonth() + 1 === month
    })
    .reduce((sum, p) => {
      const diff = differenceInMilliseconds(new Date(p.end_time), new Date(p.start_time))
      return sum + (diff / 3600000) // ms to hours
    }, 0)
}

/**
 * Groups time entries by month and incorporates scheduled hours/target hours
 */
export function groupByMonth(
  entries: TimeEntry[], 
  plans: Plan[],
  targetHoursOverride?: number // If specified, use this per month instead of calculation
): MonthlyTimeData[] {
  const months: Record<string, MonthlyTimeData> = {}
  
  // 1. Process entries
  entries.forEach(entry => {
    const d = new Date(entry.date)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    
    if (!months[key]) {
      const year = d.getFullYear()
      const month = d.getMonth() + 1
      const workingDays = countWorkingDays(year, month)
      const scheduled = scheduledHoursForMonth(plans, year, month)
      
      months[key] = {
        key,
        year,
        month,
        workingDays,
        // Fallback to 8h per working day if no shifts are scheduled in future/past plans
        scheduledHours: scheduled || (targetHoursOverride || (workingDays * 8)),
        actualHours: 0,
        difference: 0,
        entries: []
      }
    }
    
    months[key].actualHours += Number(entry.net_hours) || 0
    months[key].entries.push(entry)
  })

  // 2. Finalize calculations
  return Object.values(months)
    .map(m => ({ 
      ...m, 
      difference: m.actualHours - m.scheduledHours 
    }))
    .sort((a, b) => b.key.localeCompare(a.key)) // Sorted by newest month first
}
