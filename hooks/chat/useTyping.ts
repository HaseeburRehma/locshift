import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { RealtimeChannel } from '@supabase/supabase-js'

export function useTyping(conversationId: string | null, currentUserId: string | null, fullName: string | null) {
  const [typingUsers, setTypingUsers] = useState<{ user_id: string; full_name: string }[]>([])
  const channelRef = useRef<RealtimeChannel | null>(null)
  const supabase = createClient()

  useEffect(() => {
    if (!conversationId) return

    const channel = supabase.channel(`typing:${conversationId}`)
    channelRef.current = channel

    channel
      .on('broadcast', { event: 'typing' }, ({ payload }: { payload: any }) => {
        if (payload.user_id === currentUserId) return

        setTypingUsers(prev => {
          const filtered = prev.filter(u => u.user_id !== payload.user_id)
          return payload.is_typing
            ? [...filtered, { user_id: payload.user_id, full_name: payload.full_name }]
            : filtered
        })

        // Auto-clear after 3 seconds of no updates
        if (payload.is_typing) {
          setTimeout(() => {
            setTypingUsers(prev => prev.filter(u => u.user_id !== payload.user_id))
          }, 3000)
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId, currentUserId, supabase])

  const setTyping = (isTyping: boolean) => {
    if (!channelRef.current || !currentUserId || !fullName) return

    channelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: {
        user_id: currentUserId,
        full_name: fullName,
        is_typing: isTyping
      }
    })
  }

  return { typingUsers, setTyping }
}
