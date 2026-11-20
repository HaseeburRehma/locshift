'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/user-context'
import { createCoalescer } from '@/hooks/useCoalescedRefetch'
import { setVisibleInterval } from '@/lib/visible-interval'
import { berlinDateKey, berlinToInstant } from '@/lib/time/berlin'
import { addDays } from '@/lib/time/shift-hours'
import { onTimesChanged } from '@/lib/times/events'

export interface SidebarBadges {
  chat: number
  plans: number
  times: number
  /** Managers: submitted entries + open correction requests. */
  approvals: number
  calendar: number
  notifications: number
}

const EMPTY: SidebarBadges = { chat: 0, plans: 0, times: 0, approvals: 0, calendar: 0, notifications: 0 }

interface Scope {
  userId: string
  orgId: string | null
  isManagerRole: boolean
}

async function loadBadges({ userId, orgId, isManagerRole }: Scope): Promise<SidebarBadges> {
  const sb = createClient()
    const nowIso = new Date().toISOString()

    // All counts in parallel — one round trip instead of five (QA P0-2).
    const [chatCount, plansCount, [timesCount, approvalsCount], calendarCount, notiCount] = await Promise.all([
    (async () => {
      // ── Chat unread count ────────────────────────────
      let chatCount = 0
      try {
        // Get all conversations user is a member of
        const { data: memberships } = await sb
          .from('chat_members')
          .select('conversation_id, last_read_at')
          .eq('user_id', userId)

        if (memberships && memberships.length > 0) {
          // For each conversation, count messages after last_read_at
          const counts = await Promise.all(
            memberships.map(async (m: { conversation_id: string; last_read_at: string | null }) => {
              const { count } = await sb
                .from('chat_messages')
                .select('id', { count: 'exact', head: true })
                .eq('conversation_id', m.conversation_id)
                .eq('is_deleted', false)
                .neq('sender_id', userId)
                .gt('created_at', m.last_read_at || '1970-01-01')
              return count || 0
            })
          )
          chatCount = counts.reduce((sum, c) => sum + c, 0)
        }
      } catch (e) {
        console.error('[SidebarBadges] Chat count error:', e)
      }
      return chatCount
    })(),
    (async () => {
      // ── Plans: employee → shifts to confirm; manager → rejected or
      //    unassigned upcoming shifts that need action ────────────────────
      let plansCount = 0
      try {
        if (!isManagerRole) {
          const { count } = await sb
            .from('plans')
            .select('id', { count: 'exact', head: true })
            .eq('employee_id', userId)
            .eq('status', 'assigned')
            .gte('end_time', nowIso)
          plansCount = count || 0
        } else {
          let q = sb
            .from('plans')
            .select('id', { count: 'exact', head: true })
            .gte('start_time', nowIso)
            .or('status.eq.rejected,employee_id.is.null')
          if (orgId) q = q.eq('organization_id', orgId)
          const { count } = await q
          plansCount = count || 0
        }
      } catch { /* ignore */ }
      return plansCount
    })(),
    (async () => {
      // ── Times: employee → finished but not submitted;
      //    manager → approvals queue ─────────────────────────────────────
      let timesCount = 0
      let approvalsCount = 0
      try {
        if (isManagerRole) {
          let submittedQ = sb
            .from('time_entries')
            .select('id', { count: 'exact', head: true })
            .eq('is_verified', false)
            .eq('is_planned', false)
            .not('submitted_at', 'is', null)
          let correctionsQ = sb
            .from('time_entry_corrections')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'pending')
          if (orgId) {
            submittedQ = submittedQ.eq('organization_id', orgId)
            correctionsQ = correctionsQ.eq('organization_id', orgId)
          }
          const [{ count: submitted }, { count: corrections }] = await Promise.all([submittedQ, correctionsQ])
          approvalsCount = (submitted || 0) + (corrections || 0)
        } else {
          const { count } = await sb
            .from('time_entries')
            .select('id', { count: 'exact', head: true })
            .eq('employee_id', userId)
            .eq('is_planned', false)
            .not('end_time', 'is', null)
            .is('submitted_at', null)
          timesCount = count || 0
        }
      } catch { /* ignore */ }
      return [timesCount, approvalsCount] as const
    })(),
    (async () => {
      // ── Calendar: events happening today ───────────────
      let calendarCount = 0
      try {
        const today = berlinDateKey()
        const startOfDay = berlinToInstant(today).toISOString()
        const endOfDay = berlinToInstant(addDays(today, 1)).toISOString()

        if (!isManagerRole) {
          const { count } = await sb
            .from('plans')
            .select('id', { count: 'exact', head: true })
            .eq('employee_id', userId)
            .gte('start_time', startOfDay)
            .lt('start_time', endOfDay)
          calendarCount = count || 0
        } else {
          let q = sb
            .from('plans')
            .select('id', { count: 'exact', head: true })
            .gte('start_time', startOfDay)
            .lt('start_time', endOfDay)
          if (orgId) q = q.eq('organization_id', orgId)
          const { count } = await q
          calendarCount = count || 0
        }
      } catch { /* ignore */ }
      return calendarCount
    })(),
    (async () => {
      // ── Notifications: unread count ──────────────────
      let notiCount = 0
      try {
        const { count } = await sb
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('is_read', false)
        notiCount = count || 0
      } catch { /* ignore */ }
      return notiCount
    })(),
    ])

    return {
      chat: chatCount,
      plans: plansCount,
      times: timesCount,
      approvals: approvalsCount,
      calendar: calendarCount,
      notifications: notiCount,
    }
}

/**
 * One badge store per browser tab (QA 20.11. performance): the sidebar and
 * the mobile bottom nav both show badges, and each used to run its own
 * fetch, realtime channel and poll — twice the requests on every page.
 * Now every consumer shares one fetch, one channel and one poll, started
 * by the first consumer and stopped with the last.
 */
let current: SidebarBadges = EMPTY
let scopeKey: string | null = null
const listeners = new Set<(b: SidebarBadges) => void>()
let stop: (() => void) | null = null

function start(scope: Scope) {
  const sb = createClient()
  const coalescer = createCoalescer(async () => {
    const next = await loadBadges(scope)
    current = next
    listeners.forEach((l) => l(next))
  })
  const refresh = () => coalescer.schedule()
  refresh()

  let channel = sb
    .channel(`sidebar-badges-${scope.userId}-${Math.random().toString(36).slice(2, 8)}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, refresh)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${scope.userId}` }, refresh)
  if (scope.orgId) {
    for (const table of ['plans', 'time_entries', 'time_entry_corrections']) {
      channel = channel.on('postgres_changes', { event: '*', schema: 'public', table, filter: `organization_id=eq.${scope.orgId}` }, refresh)
    }
  }
  channel.subscribe()

  const offTimes = onTimesChanged(refresh)
  // Realtime is the primary signal; the poll is only a fallback.
  const stopPolling = setVisibleInterval(refresh, 60_000)

  stop = () => {
    coalescer.dispose()
    sb.removeChannel(channel)
    offTimes()
    stopPolling()
  }
}

export function useSidebarBadges(): SidebarBadges {
  const { user, profile, isAdmin, isDispatcher } = useUser()
  const userId = user?.id ?? null
  const orgId = profile?.organization_id ?? null
  const isManagerRole = isAdmin || isDispatcher
  const [badges, setBadges] = useState<SidebarBadges>(current)

  useEffect(() => {
    if (!userId) return
    const key = `${userId}|${orgId}|${isManagerRole}`
    if (scopeKey !== key) {
      // Another user or role: restart the shared store.
      stop?.()
      stop = null
      current = EMPTY
      scopeKey = key
    }
    listeners.add(setBadges)
    setBadges(current)
    if (!stop) start({ userId, orgId, isManagerRole })
    return () => {
      listeners.delete(setBadges)
      if (listeners.size === 0) {
        stop?.()
        stop = null
        scopeKey = null
      }
    }
  }, [userId, orgId, isManagerRole])

  return badges
}
