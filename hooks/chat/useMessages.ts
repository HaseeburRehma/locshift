import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ChatMessage } from '@/lib/types'

export function useMessages(conversationId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const userIdRef = useRef<string | null>(null)

  // Cache user ID to avoid repeated auth calls
  useEffect(() => {
    supabase.auth.getUser().then(({ data }: { data: any }) => {
      userIdRef.current = data.user?.id || null
    })
  }, [supabase])

  const markAsRead = useCallback(async () => {
    if (!conversationId || !userIdRef.current) return
    await supabase
      .from('chat_members')
      .update({ last_read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .eq('user_id', userIdRef.current)
  }, [conversationId, supabase])

  // Helper: add a message to state with dedup
  const addMessage = useCallback((newMsg: ChatMessage) => {
    setMessages(prev => {
      // Skip if we already have this exact message by real ID
      if (prev.some(m => m.id === newMsg.id)) return prev

      // If this is the sender's own message, replace the optimistic version
      const optimisticIdx = prev.findIndex(
        m => m.id.startsWith('optimistic-') && m.sender_id === newMsg.sender_id
      )
      if (optimisticIdx !== -1) {
        const updated = [...prev]
        updated[optimisticIdx] = { ...updated[optimisticIdx], ...newMsg }
        return updated
      }

      // New message from someone else — append
      return [...prev, newMsg]
    })
  }, [])

  // Helper: hydrate sender profile on a message
  const hydrateSender = useCallback((msgId: string, senderId: string) => {
    supabase
      .from('profiles')
      .select('id, full_name, avatar_url, role')
      .eq('id', senderId)
      .single()
      .then(({ data: sender }: { data: any }) => {
        if (sender) {
          setMessages(p =>
            p.map(m => m.id === msgId ? { ...m, sender } : m)
          )
        }
      })
  }, [supabase])

  useEffect(() => {
    if (!conversationId) {
      setMessages([])
      setLoading(false)
      return
    }

    setLoading(true)

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('chat_messages')
        .select(`
          *,
          sender:profiles!sender_id(id, full_name, avatar_url, role)
        `)
        .eq('conversation_id', conversationId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('[useMessages] Fetch error:', error.message)
      } else {
        setMessages(data || [])
      }
      setLoading(false)
      markAsRead()
    }

    fetchMessages()

    // ── Channel 1: Postgres Changes (DB-triggered) ──────
    // Subscribe WITHOUT a filter to avoid REPLICA IDENTITY issues.
    // We filter client-side instead.
    const dbChannel = supabase
      .channel(`chat_db:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
        },
        (payload: any) => {
          const newMsg = payload.new as ChatMessage
          // Client-side filter: only handle messages for this conversation
          if (newMsg.conversation_id !== conversationId) return

          addMessage(newMsg)
          hydrateSender(newMsg.id, newMsg.sender_id)
          markAsRead()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_messages',
        },
        (payload: any) => {
          if (payload.new.conversation_id !== conversationId) return
          setMessages(prev =>
            prev.map(msg =>
              msg.id === payload.new.id ? { ...msg, ...payload.new } : msg
            )
          )
        }
      )
      .subscribe()

    // ── Channel 2: Broadcast (instant peer-to-peer) ─────
    // This is the fast path — sender broadcasts directly so
    // receiver gets the message even if postgres_changes is slow.
    const broadcastChannel = supabase
      .channel(`chat_broadcast:${conversationId}`)
      .on('broadcast', { event: 'new_message' }, (payload: any) => {
        const newMsg = payload.payload as ChatMessage
        if (!newMsg || !newMsg.id) return
        addMessage(newMsg)
        hydrateSender(newMsg.id, newMsg.sender_id)
        markAsRead()
      })
      .subscribe()

    // ── Fallback: Poll every 10s in case realtime fails ──
    const pollInterval = setInterval(async () => {
      const { data } = await supabase
        .from('chat_messages')
        .select(`
          *,
          sender:profiles!sender_id(id, full_name, avatar_url, role)
        `)
        .eq('conversation_id', conversationId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true })

      if (data) {
        setMessages(prev => {
          // Only update if there are new messages to avoid unnecessary re-renders
          if (data.length !== prev.length) return data
          const lastNew = data[data.length - 1]
          const lastPrev = prev[prev.length - 1]
          if (lastNew?.id !== lastPrev?.id) return data
          return prev
        })
      }
    }, 10000)

    return () => {
      supabase.removeChannel(dbChannel)
      supabase.removeChannel(broadcastChannel)
      clearInterval(pollInterval)
    }
  }, [conversationId, supabase, markAsRead, addMessage, hydrateSender])

  const sendMessage = useCallback(async (
    content: string,
    attachment?: { url: string; type: 'image' | 'file'; name: string }
  ) => {
    if (!conversationId || !userIdRef.current) return

    // ── Optimistic update: show message instantly ──────────
    const optimisticId = `optimistic-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const optimisticMsg: ChatMessage = {
      id: optimisticId,
      conversation_id: conversationId,
      sender_id: userIdRef.current,
      content: content || null,
      attachment_url: attachment?.url || null,
      attachment_type: attachment?.type || null,
      attachment_name: attachment?.name || null,
      is_deleted: false,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, optimisticMsg])

    // ── Actual insert ─────────────────────────────────────
    const insertData: Record<string, any> = {
      conversation_id: conversationId,
      sender_id: userIdRef.current,
      content: content || null,
    }

    if (attachment) {
      insertData.attachment_url = attachment.url
      insertData.attachment_type = attachment.type
      insertData.attachment_name = attachment.name
    }

    const { data: inserted, error } = await supabase
      .from('chat_messages')
      .insert(insertData)
      .select('*')
      .single()

    if (error) {
      // Remove optimistic message on failure
      setMessages(prev => prev.filter(m => m.id !== optimisticId))
      console.error('Send message error:', error)
      throw error
    }

    // Replace optimistic ID with real ID so realtime dedup works
    if (inserted) {
      setMessages(prev =>
        prev.map(m => m.id === optimisticId ? { ...m, id: inserted.id } : m)
      )

      // ── Broadcast to other participants ─────────────────
      // This ensures instant delivery even if postgres_changes is delayed
      const broadcastChannel = supabase.channel(`chat_broadcast:${conversationId}`)
      await broadcastChannel.subscribe()
      await broadcastChannel.send({
        type: 'broadcast',
        event: 'new_message',
        payload: inserted,
      })
      supabase.removeChannel(broadcastChannel)
    }

    // Also update conversation's updated_at to trigger re-sort in sidebar
    await supabase
      .from('chat_conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId)
  }, [conversationId, supabase])

  return {
    messages,
    loading,
    sendMessage,
  }
}
