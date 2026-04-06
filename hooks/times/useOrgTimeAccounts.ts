'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TimeAccount, Profile } from '@/lib/types'
import { useUser } from '@/lib/user-context'

export function useOrganizationTimeAccounts() {
  const [accounts, setAccounts] = useState<TimeAccount[]>([])
  const [loading, setLoading] = useState(true)
  const { profile } = useUser()
  const supabase = createClient()

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

    // 2. Fetch all time entries for these employees to calculate actual vs target
    const { data: entries, error: entriesError } = await supabase
      .from('time_entries')
      .select('employee_id, net_hours')
      .eq('organization_id', profile.organization_id)

    if (entriesError) {
      console.error('[useOrgTimeAccounts] Entries fetch error:', entriesError)
      setLoading(false)
      return
    }

    // 3. Map to TimeAccount interface
    const calculatedAccounts: TimeAccount[] = (employees as { id: string; full_name: string | null; target_hours: number }[]).map(emp => {
      const empEntries = (entries ?? []).filter((e: { employee_id: string; net_hours: number | null }) => e.employee_id === emp.id)
      const actual_hours = empEntries.reduce((sum: number, e: { net_hours: number | null }) => sum + (e.net_hours || 0), 0)
      
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

  useEffect(() => {
    fetchAccounts()

    if (!profile?.organization_id) return

    // Real-time synchronization for operational accounts list
    // Syncs when any time entry in the organization changes
    const channel = supabase
      .channel('org-time-accounts-sync')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'time_entries',
        filter: `organization_id=eq.${profile.organization_id}`
      }, () => fetchAccounts(true))
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [profile?.organization_id, fetchAccounts, supabase])

  return { accounts, loading, refresh: fetchAccounts }
}
