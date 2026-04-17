'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface SidebarBadges {
  chat: number
  plans: number
  times: number
  calendar: number
  notifications: number
}

/**
 * Lightweight hook that tracks unread/pending counts for sidebar badges.
 * Uses efficient queries and real-time subscriptions.
 */
export function useSidebarBadges() {
  const [badges, setBadges] = useState<SidebarBadges>({
    chat: 0,
    plans: 0,
    times: 0,
    calendar: 0,
    notifications: 0,
  })
  const supabase = createClient()
  const userIdRef = useRef<string | null>(null)
  const roleRef = useRef<string | null>(null)

  const fetchBadges = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    userIdRef.current = user.id

    // Get user role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    roleRef.current = profile?.role || 'employee'

    // ── Chat unread count ────────────────────────────
    let chatCount = 0
    try {
      // Get all conversations user is a member of
      const { data: memberships } = await supabase
        .from('chat_members')
        .select('conversation_id, last_read_at')
        .eq('user_id', user.id)

      if (memberships && memberships.length > 0) {
        // For each conversation, count messages after last_read_at
        const counts = await Promise.all(
          memberships.map(async (m: { conversation_id: string; last_read_at: string | null }) => {
            const { count } = await supabase
              .from('chat_messages')
              .select('id', { count: 'exact', head: true })
              .eq('conversation_id', m.conversation_id)
              .eq('is_deleted', false)
              .neq('sender_id', user.id)
              .gt('created_at', m.last_read_at || '1970-01-01')
            return count || 0
          })
        )
        chatCount = counts.reduce((sum, c) => sum + c, 0)
      }
    } catch (e) {
      console.error('[SidebarBadges] Chat count error:', e)
    }

    // ── Plans: pending plans for employee, or unconfirmed for admin ──
    let plansCount = 0
    try {
      if (roleRef.current === 'employee') {
        // Plans assigned to this employee that are still pending/draft
        const { count } = await supabase
          .from('plans')
          .select('id', { count: 'exact', head: true })
          .eq('employee_id', user.id)
          .in('status', ['draft', 'pending'])
        plansCount = count || 0
      } else {
        // For admin/dispatcher: plans awaiting confirmation
        const { count } = await supabase
          .from('plans')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending')
        plansCount = count || 0
      }
    } catch { /* ignore if table doesn't exist */ }

    // ── Time Tracking: unverified entries ──────────────
    let timesCount = 0
    try {
      if (roleRef.current === 'admin' || roleRef.current === 'dispatcher') {
        const { count } = await supabase
          .from('time_entries')
          .select('id', { count: 'exact', head: true })
          .eq('is_verified', false)
        timesCount = count || 0
      } else {
        // Employee: entries that need attention (rejected)
        const { count } = await supabase
          .from('time_entries')
          .select('id', { count: 'exact', head: true })
          .eq('employee_id', user.id)
          .eq('is_verified', false)
        timesCount = count || 0
      }
    } catch { /* ignore */ }

    // ── Calendar: events happening today ───────────────
    let calendarCount = 0
    try {
      const today = new Date()
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString()
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString()

      if (roleRef.current === 'employee') {
        const { count } = await supabase
          .from('plans')
          .select('id', { count: 'exact', head: true })
          .eq('employee_id', user.id)
          .gte('start_date', startOfDay)
          .lt('start_date', endOfDay)
        calendarCount = count || 0
      } else {
        const { count } = await supabase
          .from('plans')
          .select('id', { count: 'exact', head: true })
          .gte('start_date', startOfDay)
          .lt('start_date', endOfDay)
        calendarCount = count || 0
      }
    } catch { /* ignore */ }

    // ── Notifications: unread count ──────────────────
    let notiCount = 0
    try {
      const { count } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false)
      notiCount = count || 0
    } catch { /* ignore */ }

    setBadges({
      chat: chatCount,
      plans: plansCount,
      times: timesCount,
      calendar: calendarCount,
      notifications: notiCount,
    })
  }, [supabase])

  useEffect(() => {
    fetchBadges()

    // Real-time: refresh badges when relevant tables change
    const channel = supabase
      .channel('sidebar-badges')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages'
      }, () => fetchBadges())
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'plans'
      }, () => fetchBadges())
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'time_entries'
      }, () => fetchBadges())
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications'
      }, () => fetchBadges())
      .subscribe()

    // Also refresh periodically (every 30s) as a fallback
    const interval = setInterval(fetchBadges, 30000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(interval)
    }
  }, [supabase, fetchBadges])

  return badges
}
