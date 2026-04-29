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

    /*
     * Realtime triggers — re-fetch the conversation list whenever:
     *   1. A chat_conversation row changes (created / updated / deleted)
     *   2. A new chat_message arrives (so the last-message preview + sort order update)
     *   3. A chat_members row is INSERTED — CRITICAL for the recipient: when an
     *      admin creates a new direct chat, the conversation row appears first
     *      but the recipient isn't a member yet, so RLS hides it. The
     *      chat_members INSERT (where user_id = self) is the moment the
     *      recipient gains visibility — we must re-fetch then.
     *   4. A chat_members row is DELETED — covers leave-chat cleanup.
     *
     * postgres_changes filters use `=eq.<value>` syntax; we filter the
     * chat_members events to ones where THIS user is the new/old member.
     */
    let userId: string | null = null

    const setupChannel = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      userId = user?.id || null
      if (!userId) return null

      return supabase
        .channel(`chat_convs_realtime:${userId}`)
        // (1) Any conversation change in the user's org
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'chat_conversations'
        }, () => fetchConversations(true))
        // (2) Any new message
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages'
        }, () => fetchConversations(true))
        // (3) THIS user added to a conversation — fixes the "doesn't appear
        //     until reload" bug on the recipient side.
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_members',
          filter: `user_id=eq.${userId}`,
        }, () => fetchConversations(true))
        // (4) THIS user removed from a conversation
        .on('postgres_changes', {
          event: 'DELETE',
          schema: 'public',
          table: 'chat_members',
          filter: `user_id=eq.${userId}`,
        }, () => fetchConversations(true))
        // (5) last_read_at updates (so the unread badge ticks down)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_members',
          filter: `user_id=eq.${userId}`,
        }, () => fetchConversations(true))
        .subscribe()
    }

    let channel: ReturnType<typeof supabase.channel> | null = null
    setupChannel().then((c) => { channel = c })

    /*
     * Belt-and-suspenders: also poll every 15s. If realtime drops (mobile
     * background tab, network blip, RLS-hidden row briefly invisible), the
     * poll catches new conversations that the user IS a member of.
     */
    const pollInterval = setInterval(() => {
      fetchConversations(true)
    }, 15000)

    return () => {
      if (channel) supabase.removeChannel(channel)
      clearInterval(pollInterval)
    }
  }, [supabase, fetchConversations])

  return { conversations, loading, refresh: fetchConversations }
}
