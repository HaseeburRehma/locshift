'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TimeAccount } from '@/lib/types'
import { useUser } from '@/lib/user-context'
import { fetchAllPages } from '@/lib/supabase/paginate'
import { useCoalescedRefetch } from '@/hooks/useCoalescedRefetch'

export function useOrganizationTimeAccounts() {
  const [accounts, setAccounts] = useState<TimeAccount[]>([])
  const [loading, setLoading] = useState(true)
  const { profile } = useUser()
  const supabase = createClient()
  const suffix = useRef(Math.random().toString(36).slice(2, 8))

  const fetchAccounts = useCallback(async (isSilent = false) => {
    if (!profile?.organization_id) return
    if (!isSilent) setLoading(true)

    // 1. Fetch all employees in the organization
    const { data: employees, error: empError } = await supabase
      .from('profiles')
      .select('id, full_name, role, target_hours')
      .eq('organization_id', profile.organization_id)
      .eq('role', 'employee')

    if (empError) {
      console.error('[useOrgTimeAccounts] Emp fetch error:', empError)
      setLoading(false)
      return
    }

    // 2. Time entries of the current year (the period the time account
    //    shows), paged past PostgREST's 1000-row cap.
    const year = new Date().getFullYear()
    const orgId = profile.organization_id
    const { data: entries, error: entriesError } = await fetchAllPages<{ employee_id: string; net_hours: number | null }>(
      (from, to) =>
        supabase
          .from('time_entries')
          .select('id, employee_id, net_hours')
          .eq('organization_id', orgId)
          .gte('date', `${year}-01-01`)
          .lte('date', `${year}-12-31`)
          .order('date', { ascending: true })
          .order('id', { ascending: true })
          .range(from, to),
    )

    if (entriesError) {
      console.error('[useOrgTimeAccounts] Entries fetch error:', entriesError)
      setLoading(false)
      return
    }

    const actualByEmployee = new Map<string, number>()
    for (const e of entries) {
      actualByEmployee.set(e.employee_id, (actualByEmployee.get(e.employee_id) ?? 0) + (Number(e.net_hours) || 0))
    }

    // 3. Map to TimeAccount interface
    const calculatedAccounts: TimeAccount[] = (employees as { id: string; full_name: string | null; target_hours: number }[]).map(emp => {
      const actual_hours = actualByEmployee.get(emp.id) ?? 0

      // Simple balance calculation for the overview (Actual - Target)
      // Note: In a production system, target would be calculated per month/year
      const balance = actual_hours - (emp.target_hours || 0)

      return {
        employee_id: emp.id,
        full_name: emp.full_name || 'Unnamed Employee',
        target_hours: emp.target_hours || 0,
        actual_hours,
        balance
      }
    })

    setAccounts(calculatedAccounts)
    setLoading(false)
  }, [profile?.organization_id, supabase])

  const scheduleRefresh = useCoalescedRefetch(() => fetchAccounts(true))

  useEffect(() => {
    fetchAccounts()

    if (!profile?.organization_id) return

    // Real-time synchronization for operational accounts list
    // Syncs when any time entry in the organization changes (bursts coalesced)
    const channel = supabase
      .channel(`org-time-accounts-sync-${profile.organization_id}-${suffix.current}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'time_entries',
        filter: `organization_id=eq.${profile.organization_id}`
      }, () => scheduleRefresh())
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [profile?.organization_id, fetchAccounts, supabase, scheduleRefresh])

  return { accounts, loading, refresh: fetchAccounts }
}
