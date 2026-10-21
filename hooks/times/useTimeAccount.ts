import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TimeEntry, MonthlyTimeData, Plan } from '@/lib/types'
import { useUser } from '@/lib/user-context'
import { groupByMonth } from '@/lib/times/calculations'
import { fetchAllPages } from '@/lib/supabase/paginate'
import { useCoalescedRefetch } from '@/hooks/useCoalescedRefetch'

type Supabase = ReturnType<typeof createClient>

/**
 * Time entries + confirmed/assigned plans of one employee for one calendar
 * year (the period the time account shows: "Stundensaldo (lfd. Jahr)"),
 * paged past PostgREST's 1000-row cap.
 */
export async function fetchEmployeeYear(supabase: Supabase, employeeId: string, year = new Date().getFullYear()) {
  const firstDay = `${year}-01-01`
  const lastDay = `${year}-12-31`
  const yearStart = new Date(year, 0, 1).toISOString()
  const nextYearStart = new Date(year + 1, 0, 1).toISOString()

  const [entries, plans] = await Promise.all([
    fetchAllPages<TimeEntry>((from, to) =>
      supabase
        .from('time_entries')
        .select('*')
        .eq('employee_id', employeeId)
        .gte('date', firstDay)
        .lte('date', lastDay)
        .order('date', { ascending: false })
        .order('id', { ascending: true })
        .range(from, to),
    ),
    fetchAllPages<Plan>((from, to) =>
      supabase
        .from('plans')
        .select('*')
        .eq('employee_id', employeeId)
        .in('status', ['confirmed', 'assigned'])
        .gte('start_time', yearStart)
        .lt('start_time', nextYearStart)
        .order('start_time', { ascending: true })
        .order('id', { ascending: true })
        .range(from, to),
    ),
  ])
  return { entries: entries.data, plans: plans.data, error: entries.error ?? plans.error }
}

export function useTimeAccount(employeeId?: string, year?: number) {
  const [monthlyData, setMonthlyData] = useState<MonthlyTimeData[]>([])
  const [totalBalance, setTotalBalance] = useState(0)
  const [loading, setLoading] = useState(true)
  const { profile } = useUser()
  const supabase = createClient()

  const targetId = employeeId || profile?.id
  const targetYear = year ?? new Date().getFullYear()

  const fetchAccount = async (silent = false) => {
    if (!targetId || !profile?.organization_id) return
    if (!silent) setLoading(true)
    const { entries, plans, error } = await fetchEmployeeYear(supabase, targetId, targetYear)
    if (!error) {
      const grouped = groupByMonth(entries, plans)
      setMonthlyData(grouped)
      setTotalBalance(grouped.reduce((sum, m) => sum + m.difference, 0))
    } else {
      console.error('[useTimeAccount] Fetch error:', error)
    }
    setLoading(false)
  }

  const scheduleRefresh = useCoalescedRefetch(() => fetchAccount(true))

  useEffect(() => {
    if (!targetId || !profile?.organization_id) return

    fetchAccount()

    // Real-time synchronization (bursts coalesced)
    const channel = supabase
      .channel(`time-account-${targetId}-${Math.random().toString(36).slice(2, 8)}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'time_entries',
        filter: `employee_id=eq.${targetId}`
      }, () => scheduleRefresh())
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetId, targetYear, profile?.organization_id, supabase, scheduleRefresh])

  return { monthlyData, totalBalance, loading }
}
