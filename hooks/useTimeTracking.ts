import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TimeEntry } from '@/lib/types'
import { useUser } from '@/lib/user-context'
import { toast } from 'sonner'

export function useTimeTracking() {
  const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null)
  const [loading, setLoading] = useState(true)
  const [elapsedTime, setElapsedTime] = useState<number>(0) // in seconds
  const [todayPlans, setTodayPlans] = useState<any[]>([])
  
  const { user, profile } = useUser()
  const supabase = createClient()

  // 1. Fetch the current active entry
  const fetchActiveEntry = useCallback(async () => {
    if (!user) return
    
    // a. Fetch active shift
    const { data, error } = await supabase
      .from('time_entries')
      .select('*')
      .eq('employee_id', user.id)
      .is('end_time', null)
      .maybeSingle()

    if (error) console.error('[useTimeTracking] Fetch error:', error)
    setActiveEntry(data)

    // b. Fetch today's plans
    const today = new Date().toISOString().split('T')[0]
    const { data: plans } = await supabase
      .from('plans')
      .select('*')
      .eq('employee_id', user.id)
      .eq('date', today)

    setTodayPlans(plans || [])
    
    setLoading(false)
  }, [user, supabase])

  useEffect(() => {
    fetchActiveEntry()
  }, [fetchActiveEntry])

  // 2. Real-time timer update
  useEffect(() => {
    let interval: NodeJS.Timeout
    
    if (activeEntry) {
      const startTime = new Date(activeEntry.start_time).getTime()
      
      interval = setInterval(() => {
        const now = new Date().getTime()
        setElapsedTime(Math.floor((now - startTime) / 1000))
      }, 1000)
    } else {
      setElapsedTime(0)
    }

    return () => clearInterval(interval)
  }, [activeEntry])

  // 3. Actions
  const clockIn = async (planId?: string, location?: string) => {
    if (!user || !profile?.organization_id) return

    const now = new Date().toISOString()
    const { data, error } = await supabase
      .from('time_entries')
      .insert({
        organization_id: profile.organization_id,
        employee_id: user.id,
        plan_id: planId || null,
        location: location || null,
        start_time: now,
        date: now.split('T')[0],
      })
      .select()
      .single()

    if (error) {
      toast.error('Failed to start shift')
      return null
    }

    setActiveEntry(data)
    toast.success('Shift started')
    return data
  }

  const clockOut = async (notes?: string) => {
    if (!activeEntry) return

    const now = new Date().toISOString()
    const startTime = new Date(activeEntry.start_time).getTime()
    const endTime = new Date(now).getTime()
    
    // Calculate net hours (simple diff for now, break subtraction can be added later)
    const netHours = (endTime - startTime) / (1000 * 60 * 60)

    const { error } = await supabase
      .from('time_entries')
      .update({
        end_time: now,
        net_hours: Number(netHours.toFixed(2)),
        notes: notes || activeEntry.notes,
        updated_at: now
      })
      .eq('id', activeEntry.id)

    if (error) {
      toast.error('Failed to end shift')
      return false
    }

    setActiveEntry(null)
    toast.success('Shift ended')
    return true
  }

  return { 
    activeEntry, 
    loading, 
    elapsedTime, 
    todayPlans,
    clockIn, 
    clockOut, 
    refresh: fetchActiveEntry 
  }
}
