import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ChatMessage } from '@/lib/types'

export function useMessages(conversationId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [typingUsers, setTypingUsers] = useState<Record<string, { name: string, timestamp: number }>>({})
  const supabase = createClient()

  // 1. Mark as Read logic
  const markAsRead = async () => {
    if (!conversationId) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase
      .from('chat_members')
      .update({ last_read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)
  }

  useEffect(() => {
    if (!conversationId) {
      setMessages([])
      setLoading(false)
      return
    }

    setLoading(true)
    markAsRead()

    // Initial load
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
        console.error('[useMessages] Error fetching messages:', error.message || error, error)
      } else {
        setMessages(data || [])
      }
      setLoading(false)
    }

    fetchMessages()

    // Real-time subscription
    const channel = supabase
      .channel(`chat_room:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        async (payload) => {
          // Fetch sender profile for the new message
          const { data: sender } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url, role')
            .eq('id', payload.new.sender_id)
            .single()

          const newMessage: ChatMessage = {
            ...payload.new as ChatMessage,
            sender: (sender as any) || undefined
          }

          setMessages((prev) => [...prev, newMessage])
          markAsRead()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === payload.new.id ? { ...msg, ...(payload.new as ChatMessage) } : msg
            )
          )
        }
      )
      .on('broadcast', { event: 'typing' }, ({ payload }: { payload: any }) => {
        const { userId, userName, isTyping } = payload
        setTypingUsers(prev => {
          const next = { ...prev }
          if (isTyping) {
            next[userId] = { name: userName, timestamp: Date.now() }
          } else {
            delete next[userId]
          }
          return next
        })
      })
      .subscribe()

    // Cleanup typing users after 5 seconds of inactivity
    const typingCleanup = setInterval(() => {
      setTypingUsers(prev => {
        const next = { ...prev }
        let changed = false
        Object.entries(next).forEach(([id, data]) => {
          if (Date.now() - data.timestamp > 5000) {
            delete next[id]
            changed = true
          }
        })
        return changed ? next : prev
      })
    }, 2000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(typingCleanup)
    }
  }, [conversationId, supabase])

  const setTyping = async (isTyping: boolean) => {
    if (!conversationId) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()

    const channel = supabase.channel(`chat_room:${conversationId}`)
    channel.send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId: user.id, userName: profile?.full_name || 'Someone', isTyping },
    })
  }

  const sendMessage = async (content: string, attachment?: { url: string; type: 'image' | 'file'; name: string }) => {
    if (!conversationId) return

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase.from('chat_messages').insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content,
      attachment_url: attachment?.url,
      attachment_type: attachment?.type,
      attachment_name: attachment?.name
    })

    if (error) {
      console.error('Error sending message:', error)
      throw error
    }
    
    // Stop typing indicator when message is sent
    setTyping(false)
  }

  return { 
    messages, 
    loading, 
    sendMessage, 
    setTyping, 
    typingUsers: Object.values(typingUsers).map(u => u.name) 
  }
}
