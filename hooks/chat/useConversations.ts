import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ChatConversation, Profile } from '@/lib/types'

export function useConversations() {
  const [conversations, setConversations] = useState<ChatConversation[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchConversations = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Fetch conversations the user is a member of
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
        console.error('[useConversations] Error fetching conversations:', error.message || error, error)
      } else {
        // Post-process to get unread counts etc.
        const processed = await Promise.all(data.map(async (conv: ChatConversation) => {
          const { data: unreadCount } = await supabase.rpc('get_unread_count', {
            p_conversation_id: conv.id,
            p_user_id: user.id
          })

          return {
            ...conv,
            unread_count: unreadCount || 0,
            last_message: conv.messages?.[0] || null
          }
        }))
        setConversations(processed)
      }
      setLoading(false)
    }

    fetchConversations()

    // Real-time subscription to conversation updates (new messages update updated_at)
    const channel = supabase
      .channel('chat_conversations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_conversations'
        },
        () => {
          fetchConversations()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  return { conversations, loading }
}
