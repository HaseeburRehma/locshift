import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ChatConversation } from '@/lib/types'

export function useConversations() {
  const [conversations, setConversations] = useState<ChatConversation[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const userIdRef = useRef<string | null>(null)

  const fetchConversations = useCallback(async (silent = false) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    userIdRef.current = user.id

    if (!silent) setLoading(true)

    const { data, error } = await supabase
      .from('chat_conversations')
      .select(`
        *,
        members:chat_members(
          *,
          profile:profiles(*)
        ),
        messages:chat_messages(*)
      `)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('[useConversations] Fetch error:', error.message)
    } else {
      // Filter to only conversations this user is a member of, and add unread count
      const myConvs = (data || []).filter((conv: any) =>
        conv.members?.some((m: any) => m.user_id === user.id)
      )

      const processed = await Promise.all(myConvs.map(async (conv: any) => {
        let unreadCount = 0
        try {
          const { data: count } = await supabase.rpc('get_unread_count', {
            p_conversation_id: conv.id,
            p_user_id: user.id
          })
          unreadCount = count || 0
        } catch { /* ignore */ }

        // Sort messages by created_at descending and get latest
        const sortedMessages = (conv.messages || []).sort(
          (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )

        return {
          ...conv,
          unread_count: unreadCount,
          last_message: sortedMessages[0] || null
        }
      }))

      setConversations(processed)
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchConversations()

    // Re-fetch when any conversation or message changes
    const convChannel = supabase
      .channel('chat_convs_realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'chat_conversations'
      }, () => fetchConversations(true))
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages'
      }, () => fetchConversations(true))
      .subscribe()

    return () => {
      supabase.removeChannel(convChannel)
    }
  }, [supabase, fetchConversations])

  return { conversations, loading, refresh: fetchConversations }
}
