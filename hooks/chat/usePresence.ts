import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/lib/types'

export function usePresence(conversationId: string | null, currentUser: Profile | null) {
  const [onlineUsers, setOnlineUsers] = useState<Record<string, boolean>>({})
  const supabase = createClient()

  useEffect(() => {
    if (!conversationId || !currentUser) return

    const channel = supabase.channel(`presence:${conversationId}`, {
      config: {
        presence: {
          key: currentUser.id
        }
      }
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const online: Record<string, boolean> = {}
        Object.keys(state).forEach((id) => {
          online[id] = true
        })
        setOnlineUsers(online)
      })
      .on('presence', { event: 'join' }, ({ key }: { key: string }) => {
        setOnlineUsers((prev) => ({ ...prev, [key]: true }))
      })
      .on('presence', { event: 'leave' }, ({ key }: { key: string }) => {
        setOnlineUsers((prev) => {
          const next = { ...prev }
          delete next[key]
          return next
        })
      })
      .subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: currentUser.id,
            full_name: currentUser.full_name,
            online_at: new Date().toISOString()
          })
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId, currentUser, supabase])

  return onlineUsers
}
