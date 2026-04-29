import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ChatMessage } from '@/lib/types'
import { sendNotification } from '@/lib/notifications/service'

/**
 * Fire a native browser notification for a new chat message — but only when
 * the tab is hidden / the user isn't actively looking at this conversation.
 * Silently no-ops if the user hasn't granted Notification permission.
 */
function fireBrowserNotification(opts: {
  title: string
  body: string
  conversationId: string
}) {
  if (typeof window === 'undefined') return
  if (typeof Notification === 'undefined') return
  if (Notification.permission !== 'granted') return
  // Only show when the page is in the background — avoids double-popping
  // when the user is already in the conversation.
  if (!document.hidden) return
  try {
    const n = new Notification(opts.title, {
      body: opts.body,
      icon: '/logo.png',
      tag: `chat:${opts.conversationId}`, // collapses repeat alerts from same convo
      badge: '/logo.png',
    })
    n.onclick = () => {
      window.focus()
      window.location.href = `/dashboard/chat/${opts.conversationId}`
      n.close()
    }
  } catch {
    /* noop — Safari iOS rejects some notification options */
  }
}

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

          // ── Browser/desktop notification when tab is hidden ─────
          // The receiver gets a native popup if they granted permission;
          // ignored otherwise. Skips messages the user sent themselves.
          if (newMsg.sender_id !== userIdRef.current) {
            // Look up sender's display name for the notification title
            supabase
              .from('profiles')
              .select('full_name')
              .eq('id', newMsg.sender_id)
              .single()
              .then(({ data: sender }: { data: any }) => {
                const senderName = sender?.full_name || 'Mitarbeiter'
                const body =
                  newMsg.content && newMsg.content.trim()
                    ? newMsg.content
                    : newMsg.attachment_type === 'image'
                      ? '📷 Bild'
                      : newMsg.attachment_type === 'audio'
                        ? '🎤 Sprachnachricht'
                        : newMsg.attachment_name
                          ? `📎 ${newMsg.attachment_name}`
                          : ''
                fireBrowserNotification({
                  title: `💬 Neue Nachricht von ${senderName}`,
                  body,
                  conversationId: newMsg.conversation_id,
                })
              })
          }
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

      // ── Fan-out in-app notifications to other members ─────
      // Inserts a row into `notifications` for every recipient so they see
      // the chat in their bell dropdown — works whether they're online or
      // not. Browser/desktop notifications are fired separately by the
      // realtime listener on the receiver side (see fireBrowserNotification).
      try {
        const { data: members } = await supabase
          .from('chat_members')
          .select('user_id')
          .eq('conversation_id', conversationId)

        const recipients = (members ?? [])
          .map(m => m.user_id)
          .filter((uid: string) => uid !== userIdRef.current)

        if (recipients.length > 0) {
          // Get sender's name for the notification title
          const { data: senderProfile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', userIdRef.current!)
            .single()
          const senderName = senderProfile?.full_name || 'Mitarbeiter'

          // Build a short body from the message content (truncate, fall back
          // to attachment label if no text)
          const body = (() => {
            if (content && content.trim()) {
              return content.length > 80 ? content.slice(0, 77) + '…' : content
            }
            if (attachment?.type === 'image') return '📷 Bild'
            if (attachment?.type === 'audio') return '🎤 Sprachnachricht'
            if (attachment?.type === 'file') return `📎 ${attachment.name}`
            return ''
          })()

          // Fire notifications in parallel — service uses one INSERT each,
          // failures are logged but don't block the send.
          await Promise.all(
            recipients.map((uid: string) =>
              sendNotification({
                userId: uid,
                title: `💬 Neue Nachricht von ${senderName}`,
                message: body,
                module: 'chat',
                moduleId: conversationId,
              })
            )
          )
        }
      } catch (notifErr) {
        // Notifications are best-effort — never block message delivery.
        console.warn('[useMessages] Failed to fan out chat notifications:', notifErr)
      }
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
