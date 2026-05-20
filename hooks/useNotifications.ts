'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/user-context'

import { Notification } from '@/lib/types'

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const { profile: user } = useUser()
  const supabase = createClient()

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)

    if (!error) setNotifications(data || [])
    setLoading(false)
  }, [user?.id, supabase])

  useEffect(() => {
    if (!user?.id) return
    fetchNotifications()

    // Real-time subscription — listen for inserts, updates, and deletes so
    // mark-as-read and dismiss actions reflect across every open tab.
    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, (payload: any) => {
        setNotifications(prev => {
          if (prev.some(n => n.id === payload.new.id)) return prev
          return [payload.new as Notification, ...prev]
        })
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, (payload: any) => {
        setNotifications(prev => prev.map(n =>
          n.id === payload.new.id ? (payload.new as Notification) : n
        ))
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, (payload: any) => {
        setNotifications(prev => prev.filter(n => n.id !== payload.old.id))
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user?.id, fetchNotifications, supabase])

  const deleteNotification = async (id: string) => {
    await supabase.from('notifications').delete().eq('id', id)
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const markAllRead = async () => {
    if (!user?.id) return
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false)
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true } as Notification)))
  }

  const markRead = async (id: string) => {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? ({ ...n, is_read: true } as Notification) : n))
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  return {
    notifications,
    loading,
    unreadCount,
    markAllAsRead: markAllRead,
    markAsRead: markRead,
    deleteNotification,
    refetch: fetchNotifications,
  }
}
