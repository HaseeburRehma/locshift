import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TimeEntry, Profile, MonthlyTimeData, Plan } from '@/lib/types'
import { useUser } from '@/lib/user-context'
import { groupByMonth } from '@/lib/times/calculations'

export function useTimeAccount(employeeId?: string) {
  const [monthlyData, setMonthlyData] = useState<MonthlyTimeData[]>([])
  const [totalBalance, setTotalBalance] = useState(0)
  const [loading, setLoading] = useState(true)
  const { profile } = useUser()
  const supabase = createClient()
  
  const targetId = employeeId || profile?.id

  useEffect(() => {
    if (!targetId || !profile?.organization_id) return

    const fetchAccount = async () => {
      setLoading(true)
      
      // 1. Fetch all time entries for this employee
      const { data: entries, error: entriesError } = await supabase
        .from('time_entries')
        .select('*')
        .eq('employee_id', targetId)
        .order('date', { ascending: false })

      // 2. Fetch plans for scheduled hours
      const { data: plans, error: plansError } = await supabase
        .from('plans')
        .select('*')
        .eq('employee_id', targetId)
        .in('status', ['confirmed', 'assigned'])

      if (!entriesError && !plansError) {
        const grouped = groupByMonth(entries ?? [], plans ?? [])
        setMonthlyData(grouped)
        setTotalBalance(grouped.reduce((sum, m) => sum + m.difference, 0))
      } else {
        console.error('[useTimeAccount] Fetch error:', entriesError || plansError)
      }
      setLoading(false)
    }

    fetchAccount()

    // Real-time synchronization
    const channel = supabase
      .channel(`time-account-${targetId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'time_entries', 
        filter: `employee_id=eq.${targetId}` 
      }, () => fetchAccount())
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [targetId, profile?.organization_id, supabase])

  return { monthlyData, totalBalance, loading }
}
