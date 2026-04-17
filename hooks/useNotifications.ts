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

    // Real-time subscription
    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, (payload: any) => {
        setNotifications(prev => [payload.new as Notification, ...prev])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user?.id, fetchNotifications, supabase])

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
    markAsRead: markRead 
  }
}
