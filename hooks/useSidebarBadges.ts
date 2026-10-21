'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/user-context'
import { useCoalescedRefetch } from '@/hooks/useCoalescedRefetch'

interface SidebarBadges {
  chat: number
  plans: number
  times: number
  /** Managers: submitted entries + open correction requests. */
  approvals: number
  calendar: number
  notifications: number
}

/**
 * Lightweight hook that tracks unread/pending counts for sidebar badges.
 * Uses efficient queries and real-time subscriptions. User, organisation
 * and role come from the user context (no auth round-trip per event);
 * realtime bursts are coalesced into one refresh.
 */
export function useSidebarBadges() {
  const [badges, setBadges] = useState<SidebarBadges>({
    chat: 0,
    plans: 0,
    times: 0,
    approvals: 0,
    calendar: 0,
    notifications: 0,
  })
  const supabase = createClient()
  const { user, profile, isAdmin, isDispatcher } = useUser()
  const userId = user?.id ?? null
  const orgId = profile?.organization_id ?? null
  const isManagerRole = isAdmin || isDispatcher
  const suffix = useRef(Math.random().toString(36).slice(2, 8))

  const fetchBadges = useCallback(async () => {
    if (!userId) return

    // ── Chat unread count ────────────────────────────
    let chatCount = 0
    try {
      // Get all conversations user is a member of
      const { data: memberships } = await supabase
        .from('chat_members')
        .select('conversation_id, last_read_at')
        .eq('user_id', userId)

      if (memberships && memberships.length > 0) {
        // For each conversation, count messages after last_read_at
        const counts = await Promise.all(
          memberships.map(async (m: { conversation_id: string; last_read_at: string | null }) => {
            const { count } = await supabase
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

    const nowIso = new Date().toISOString()

    // ── Plans: employee → shifts to confirm; manager → rejected or
    //    unassigned upcoming shifts that need action ────────────────────
    let plansCount = 0
    try {
      if (!isManagerRole) {
        const { count } = await supabase
          .from('plans')
          .select('id', { count: 'exact', head: true })
          .eq('employee_id', userId)
          .eq('status', 'assigned')
          .gte('end_time', nowIso)
        plansCount = count || 0
      } else {
        let q = supabase
          .from('plans')
          .select('id', { count: 'exact', head: true })
          .gte('start_time', nowIso)
          .or('status.eq.rejected,employee_id.is.null')
        if (orgId) q = q.eq('organization_id', orgId)
        const { count } = await q
        plansCount = count || 0
      }
    } catch { /* ignore */ }

    // ── Times: employee → finished but not submitted;
    //    manager → approvals queue ─────────────────────────────────────
    let timesCount = 0
    let approvalsCount = 0
    try {
      if (isManagerRole) {
        let submittedQ = supabase
          .from('time_entries')
          .select('id', { count: 'exact', head: true })
          .eq('is_verified', false)
          .eq('is_planned', false)
          .not('submitted_at', 'is', null)
        let correctionsQ = supabase
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
        const { count } = await supabase
          .from('time_entries')
          .select('id', { count: 'exact', head: true })
          .eq('employee_id', userId)
          .eq('is_planned', false)
          .not('end_time', 'is', null)
          .is('submitted_at', null)
        timesCount = count || 0
      }
    } catch { /* ignore */ }

    // ── Calendar: events happening today ───────────────
    let calendarCount = 0
    try {
      const today = new Date()
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString()
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString()

      if (!isManagerRole) {
        const { count } = await supabase
          .from('plans')
          .select('id', { count: 'exact', head: true })
          .eq('employee_id', userId)
          .gte('start_time', startOfDay)
          .lt('start_time', endOfDay)
        calendarCount = count || 0
      } else {
        let q = supabase
          .from('plans')
          .select('id', { count: 'exact', head: true })
          .gte('start_time', startOfDay)
          .lt('start_time', endOfDay)
        if (orgId) q = q.eq('organization_id', orgId)
        const { count } = await q
        calendarCount = count || 0
      }
    } catch { /* ignore */ }

    // ── Notifications: unread count ──────────────────
    let notiCount = 0
    try {
      const { count } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false)
      notiCount = count || 0
    } catch { /* ignore */ }

    setBadges({
      chat: chatCount,
      plans: plansCount,
      times: timesCount,
      approvals: approvalsCount,
      calendar: calendarCount,
      notifications: notiCount,
    })
  }, [supabase, userId, orgId, isManagerRole])

  const scheduleRefresh = useCoalescedRefetch(fetchBadges)

  useEffect(() => {
    if (!userId) return
    fetchBadges()

    // Real-time: refresh badges when relevant tables change. Org-scoped
    // tables are filtered by organization_id; chat_messages has no org
    // column (RLS limits it to the user's conversations).
    let channel = supabase
      .channel(`sidebar-badges-${userId}-${suffix.current}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages'
      }, () => scheduleRefresh())
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      }, () => scheduleRefresh())
    if (orgId) {
      channel = channel
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'plans',
          filter: `organization_id=eq.${orgId}`
        }, () => scheduleRefresh())
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'time_entries',
          filter: `organization_id=eq.${orgId}`
        }, () => scheduleRefresh())
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'time_entry_corrections',
          filter: `organization_id=eq.${orgId}`
        }, () => scheduleRefresh())
    }
    channel.subscribe()

    // Also refresh periodically (every 30s) as a fallback
    const interval = setInterval(scheduleRefresh, 30000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(interval)
    }
  }, [supabase, userId, orgId, fetchBadges, scheduleRefresh])

  return badges
}
