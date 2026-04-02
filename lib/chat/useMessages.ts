'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useMessages(conversationId: string | null) {
  const supabase = createClient()
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!conversationId) return

    async function fetchMessages() {
      const { data } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })

      if (data) {
        setMessages(data)
      }
      setLoading(false)
    }

    fetchMessages()

    const channel = supabase
      .channel(`chat:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId, supabase])

  const sendMessage = async (senderId: string, content: string, attachmentUrl?: string) => {
    if (!conversationId) return
    const { data, error } = await supabase.from('chat_messages').insert({
      conversation_id: conversationId,
      sender_id: senderId,
      content,
      attachment_url: attachmentUrl
    }).select().single()

    if (error) console.error(error)
    return data
  }

  return { messages, loading, sendMessage }
}
