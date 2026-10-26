import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { TimeEntry, Plan } from '@/lib/types'
import { useUser } from '@/lib/user-context'
import { useTranslation } from '@/lib/i18n'
import { toast } from 'sonner'
import { calculateShiftTimes, localDateKey } from '@/lib/time/shift-hours'
import { calculateSpesen } from '@/lib/spesen'
import { TIME_ENTRY_SELECT, dbErrorMessage } from '@/lib/times/entry-status'
import { berlinDateKey, berlinToInstant } from '@/lib/time/berlin'
import { addDays } from '@/lib/time/shift-hours'

export interface SubmitShiftValues {
  date: string
  startTime: string
  endTime: string
  breakMinutes: number
  overnightStay: boolean
  notes: string | null
}

type TodayPlan = Plan & { customer?: { id: string; name: string } | null }

/**
 * Live clock-in/out for the signed-in user.
 *
 * Flow (Kundenfeedback Punkt 2): Schicht starten → Pause → Beenden (time
 * stops, entry stays an editable draft) → closing view → Schicht absenden.
 */
export function useTimeTracking() {
  const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null)
  const [drafts, setDrafts] = useState<TimeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0)
  const [breakSeconds, setBreakSeconds] = useState<number>(0)
  const [todayPlans, setTodayPlans] = useState<TodayPlan[]>([])

  const { user, profile, spesenRates } = useUser()
  const { locale } = useTranslation()
  const L = (de: string, en: string) => (locale === 'de' ? de : en)
  const supabase = createClient()
  const channelSuffix = useRef(Math.random().toString(36).slice(2, 8))

  const fetchActiveEntry = useCallback(async () => {
    if (!user) return

    const { data: running, error } = await supabase
      .from('time_entries')
      .select(TIME_ENTRY_SELECT)
      .eq('employee_id', user.id)
      .is('end_time', null)
      .order('start_time', { ascending: false })
      .limit(1)
    if (error) console.error('[useTimeTracking] Fetch error:', error)
    setActiveEntry(((running ?? [])[0] as TimeEntry | undefined) ?? null)

    const { data: open } = await supabase
      .from('time_entries')
      .select(TIME_ENTRY_SELECT)
      .eq('employee_id', user.id)
      .not('end_time', 'is', null)
      .is('submitted_at', null)
      .eq('is_planned', false)
      .order('end_time', { ascending: false })
      .limit(10)
    setDrafts((open ?? []) as TimeEntry[])

    // Plans touching today (German day), including a night shift that
    // started yesterday and is still running.
    const today = berlinDateKey()
    const dayStart = berlinToInstant(today)
    const dayEnd = berlinToInstant(addDays(today, 1))
    const { data: plans } = await supabase
      .from('plans')
      .select('*, customer:customers(id, name)')
      .eq('employee_id', user.id)
      .in('status', ['assigned', 'confirmed'])
      .lt('start_time', dayEnd.toISOString())
      .gt('end_time', dayStart.toISOString())
      .order('start_time', { ascending: true })

    setTodayPlans((plans || []) as TodayPlan[])
    setLoading(false)
  }, [user, supabase])

  useEffect(() => {
    fetchActiveEntry()
    if (!user) return

    const channel = supabase
      .channel(`personal-shift-${user.id}-${channelSuffix.current}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'time_entries', filter: `employee_id=eq.${user.id}` },
        () => fetchActiveEntry(),
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, fetchActiveEntry, supabase])

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined
    if (activeEntry) {
      const startTime = new Date(activeEntry.start_time).getTime()
      const totalBreakSecs = activeEntry.total_break_seconds || 0
      const tick = () => {
        const now = Date.now()
        const totalElapsed = Math.floor((now - startTime) / 1000)
        let currentBreakSecs = 0
        if (activeEntry.is_on_break && activeEntry.current_break_start) {
          currentBreakSecs = Math.floor((now - new Date(activeEntry.current_break_start).getTime()) / 1000)
        }
        setElapsedSeconds(Math.max(0, totalElapsed - (totalBreakSecs + currentBreakSecs)))
        setBreakSeconds(totalBreakSecs + currentBreakSecs)
      }
      tick()
      interval = setInterval(tick, 1000)
    } else {
      setElapsedSeconds(0)
      setBreakSeconds(0)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [activeEntry])

  /** The plan closest to "now" — used when the user doesn't pick one. */
  const suggestedPlan = useCallback((): TodayPlan | undefined => {
    if (todayPlans.length === 0) return undefined
    const now = Date.now()
    return [...todayPlans].sort(
      (a, b) =>
        Math.abs(new Date(a.start_time).getTime() - now) - Math.abs(new Date(b.start_time).getTime() - now),
    )[0]
  }, [todayPlans])

  const clockIn = async (planId?: string, location?: string) => {
    if (!user || !profile?.organization_id) return null

    let latitude: number | null = null
    let longitude: number | null = null
    try {
      if (typeof window !== 'undefined' && navigator.geolocation) {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0,
          })
        })
        latitude = position.coords.latitude
        longitude = position.coords.longitude
      }
    } catch (err) {
      console.warn('[useTimeTracking] Geolocation error or denied:', err)
    }

    const plan = planId ? todayPlans.find((p) => p.id === planId) : suggestedPlan()
    const now = new Date()
    const { data, error } = await supabase
      .from('time_entries')
      .insert({
        organization_id: profile.organization_id,
        employee_id: user.id,
        plan_id: plan?.id ?? null,
        customer_id: plan?.customer_id ?? null,
        start_location_id: plan?.start_location_id ?? null,
        destination_location_id: plan?.destination_location_id ?? null,
        is_gastfahrt: !!plan?.is_gastfahrt,
        overnight_stay: !!plan?.overnight_stay,
        hotel_address: plan?.hotel_address ?? null,
        location: location || plan?.location || null,
        latitude,
        longitude,
        start_time: now.toISOString(),
        date: localDateKey(now),
        break_minutes: 0,
        is_on_break: false,
        total_break_seconds: 0,
      })
      .select(TIME_ENTRY_SELECT)
      .single()

    if (error) {
      toast.error(dbErrorMessage(error, locale, L('Schicht konnte nicht gestartet werden', 'Failed to start shift')))
      return null
    }

    if (latitude && longitude) {
      await supabase
        .from('profiles')
        .update({ last_lat: latitude, last_lng: longitude, last_location_update: now.toISOString() })
        .eq('id', user.id)
    }

    setActiveEntry(data as TimeEntry)
    toast.success(L('Schicht gestartet', 'Shift started'))
    return data as TimeEntry
  }

  const startBreak = async () => {
    if (!activeEntry || activeEntry.is_on_break) return
    const now = new Date().toISOString()
    const { data, error } = await supabase
      .from('time_entries')
      .update({ is_on_break: true, current_break_start: now })
      .eq('id', activeEntry.id)
      .select(TIME_ENTRY_SELECT)
      .single()
    if (error) {
      toast.error(L('Pause konnte nicht gestartet werden', 'Failed to start break'))
      return
    }
    setActiveEntry(data as TimeEntry)
    toast.info(L('Pause gestartet', 'Break started'))
  }

  const breakTotalSeconds = (entry: TimeEntry, at: number) => {
    let total = entry.total_break_seconds || 0
    if (entry.is_on_break && entry.current_break_start) {
      total += Math.max(0, Math.floor((at - new Date(entry.current_break_start).getTime()) / 1000))
    }
    return total
  }

  const endBreak = async () => {
    if (!activeEntry || !activeEntry.is_on_break) return
    const now = Date.now()
    const { data, error } = await supabase
      .from('time_entries')
      .update({
        is_on_break: false,
        current_break_start: null,
        total_break_seconds: breakTotalSeconds(activeEntry, now),
      })
      .eq('id', activeEntry.id)
      .select(TIME_ENTRY_SELECT)
      .single()
    if (error) {
      toast.error(L('Pause konnte nicht beendet werden', 'Failed to end break'))
      return
    }
    setActiveEntry(data as TimeEntry)
    toast.success(L('Pause beendet', 'Break ended'))
  }

  /**
   * Stops the clock. The entry stays a draft so the closing view can show
   * planned vs. recorded times before it is submitted.
   */
  const clockOut = async (): Promise<TimeEntry | null> => {
    if (!activeEntry) return null
    const now = Date.now()
    const totalBreak = breakTotalSeconds(activeEntry, now)

    const { data, error } = await supabase
      .from('time_entries')
      .update({
        end_time: new Date(now).toISOString(),
        break_minutes: Math.round(totalBreak / 60),
        total_break_seconds: totalBreak,
        is_on_break: false,
        current_break_start: null,
      })
      .eq('id', activeEntry.id)
      .select(TIME_ENTRY_SELECT)
      .single()

    if (error) {
      toast.error(dbErrorMessage(error, locale, L('Schicht konnte nicht beendet werden', 'Failed to end shift')))
      return null
    }

    setActiveEntry(null)
    setDrafts((prev) => [data as TimeEntry, ...prev.filter((d) => d.id !== (data as TimeEntry).id)])
    return data as TimeEntry
  }

  /** Writes the reviewed values and submits the shift. */
  const submitEntry = async (entryId: string, v: SubmitShiftValues): Promise<boolean> => {
    const shift = calculateShiftTimes(v.date, v.startTime, v.endTime, v.breakMinutes)
    const { error } = await supabase
      .from('time_entries')
      .update({
        date: v.date,
        start_time: shift.startISO,
        end_time: shift.endISO,
        break_minutes: Math.max(0, Math.round(v.breakMinutes || 0)),
        overnight_stay: v.overnightStay,
        meal_allowance: calculateSpesen(shift.netHours, v.overnightStay, spesenRates),
        notes: v.notes?.trim() ? v.notes.trim() : null,
        submitted_at: new Date().toISOString(),
      })
      .eq('id', entryId)

    if (error) {
      toast.error(dbErrorMessage(error, locale, L('Schicht konnte nicht abgesendet werden', 'Failed to submit shift')))
      return false
    }
    setDrafts((prev) => prev.filter((d) => d.id !== entryId))
    toast.success(L('Schicht abgesendet', 'Shift submitted'))
    return true
  }

  return {
    activeEntry,
    drafts,
    loading,
    elapsedSeconds,
    breakSeconds,
    todayPlans,
    suggestedPlan,
    clockIn,
    startBreak,
    endBreak,
    clockOut,
    submitEntry,
    refresh: fetchActiveEntry,
  }
}
