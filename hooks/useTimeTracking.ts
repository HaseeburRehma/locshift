import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TimeEntry } from '@/lib/types'
import { useUser } from '@/lib/user-context'
import { toast } from 'sonner'

export function useTimeTracking() {
  const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null)
  const [loading, setLoading] = useState(true)
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0)
  const [breakSeconds, setBreakSeconds] = useState<number>(0)
  const [todayPlans, setTodayPlans] = useState<any[]>([])
  
  const { user, profile } = useUser()
  const supabase = createClient()

  // 1. Fetch current active entry
  const fetchActiveEntry = useCallback(async () => {
    if (!user) return
    
    const { data, error } = await supabase
      .from('time_entries')
      .select('*')
      .eq('employee_id', user.id)
      .is('end_time', null)
      .maybeSingle()

    if (error) console.error('[useTimeTracking] Fetch error:', error)
    setActiveEntry(data)

    const today = new Date().toISOString().split('T')[0]
    const { data: plans } = await supabase
      .from('plans')
      .select('*, customer:customers(*)')
      .eq('employee_id', user.id)
      .eq('status', 'confirmed') 
      .gte('start_time', `${today}T00:00:00`)
      .lte('start_time', `${today}T23:59:59`)

    setTodayPlans(plans || [])
    setLoading(false)
  }, [user, supabase])

  useEffect(() => {
    fetchActiveEntry()

    if (!user) return

    // Real-time listener for current user's shift changes
    // This handles synchronization across multiple devices/tabs
    const channel = supabase
      .channel(`personal-shift-${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'time_entries',
        filter: `employee_id=eq.${user.id}`
      }, (payload: any) => {
        console.log('[useTimeTracking] Real-time update:', payload)
        fetchActiveEntry()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, fetchActiveEntry, supabase])

  // 2. Real-time timer update
  useEffect(() => {
    let interval: NodeJS.Timeout
    
    if (activeEntry) {
      const startTime = new Date(activeEntry.start_time).getTime()
      const totalBreakSecs = activeEntry.total_break_seconds || 0
      
      interval = setInterval(() => {
        const now = new Date().getTime()
        const totalElapsed = Math.floor((now - startTime) / 1000)
        
        let currentBreakSecs = 0
        if (activeEntry.is_on_break && activeEntry.current_break_start) {
          const breakStart = new Date(activeEntry.current_break_start).getTime()
          currentBreakSecs = Math.floor((now - breakStart) / 1000)
        }
        
        setElapsedSeconds(totalElapsed - (totalBreakSecs + currentBreakSecs))
        setBreakSeconds(totalBreakSecs + currentBreakSecs)
      }, 1000)
    } else {
      setElapsedSeconds(0)
      setBreakSeconds(0)
    }

    return () => clearInterval(interval)
  }, [activeEntry])

  // 3. Actions
  const clockIn = async (planId?: string, location?: string) => {
    if (!user || !profile?.organization_id) return

    let latitude: number | null = null
    let longitude: number | null = null

    // Try to get geolocation
    try {
      if (typeof window !== 'undefined' && navigator.geolocation) {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
          })
        })
        latitude = position.coords.latitude
        longitude = position.coords.longitude
      }
    } catch (err) {
      console.warn('[useTimeTracking] Geolocation error or denied:', err)
    }

    const now = new Date().toISOString()
    const { data, error } = await supabase
      .from('time_entries')
      .insert({
        organization_id: profile.organization_id,
        employee_id: user.id,
        plan_id: planId || null,
        location: location || null,
        latitude,
        longitude,
        start_time: now,
        date: now.split('T')[0],
        is_on_break: false,
        total_break_seconds: 0
      })
      .select()
      .single()

    if (error) {
      toast.error('Failed to start shift')
      return null
    }

    // Update profile last known location
    if (latitude && longitude) {
      await supabase
        .from('profiles')
        .update({
          last_lat: latitude,
          last_lng: longitude,
          last_location_update: now
        })
        .eq('id', user.id)
    }

    setActiveEntry(data)
    toast.success('Shift started')
    return data
  }

  const startBreak = async () => {
    if (!activeEntry || activeEntry.is_on_break) return
    
    const now = new Date().toISOString()
    const { data, error } = await supabase
      .from('time_entries')
      .update({
        is_on_break: true,
        current_break_start: now,
        updated_at: now
      })
      .eq('id', activeEntry.id)
      .select()
      .single()

    if (error) {
      toast.error('Failed to start break')
      return
    }
    setActiveEntry(data)
    toast.info('Break started')
  }

  const endBreak = async () => {
    if (!activeEntry || !activeEntry.is_on_break || !activeEntry.current_break_start) return
    
    const now = new Date().toISOString()
    const breakStart = new Date(activeEntry.current_break_start).getTime()
    const breakEnd = new Date(now).getTime()
    const sessionBreakSeconds = Math.floor((breakEnd - breakStart) / 1000)
    const newTotalBreakSeconds = (activeEntry.total_break_seconds || 0) + sessionBreakSeconds

    const { data, error } = await supabase
      .from('time_entries')
      .update({
        is_on_break: false,
        current_break_start: null,
        total_break_seconds: newTotalBreakSeconds,
        updated_at: now
      })
      .eq('id', activeEntry.id)
      .select()
      .single()

    if (error) {
      toast.error('Failed to end break')
      return
    }
    setActiveEntry(data)
    toast.success('Break ended')
  }

  const clockOut = async (notes?: string) => {
    if (!activeEntry) return

    // If on break, end the break automatically first
    if (activeEntry.is_on_break) {
      await endBreak()
    }

    const now = new Date().toISOString()
    const startTime = new Date(activeEntry.start_time).getTime()
    const endTime = new Date(now).getTime()
    
    // Refresh active entry to get latest total_break_seconds after potential endBreak
    const { data: latestEntry } = await supabase
      .from('time_entries')
      .select('total_break_seconds')
      .eq('id', activeEntry.id)
      .single()

    const finalBreakSeconds = latestEntry?.total_break_seconds || activeEntry.total_break_seconds || 0
    const workingSeconds = Math.max(0, Math.floor((endTime - startTime) / 1000) - finalBreakSeconds)
    const netHours = workingSeconds / 3600

    const { error } = await supabase
      .from('time_entries')
      .update({
        end_time: now,
        net_hours: Number(netHours.toFixed(2)),
        break_minutes: Math.round(finalBreakSeconds / 60),
        notes: notes || activeEntry.notes,
        updated_at: now,
        is_on_break: false,
        current_break_start: null
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
    elapsedSeconds, 
    breakSeconds,
    todayPlans,
    clockIn, 
    startBreak,
    endBreak,
    clockOut, 
    refresh: fetchActiveEntry 
  }
}
