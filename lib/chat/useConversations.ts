'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ChatConversation } from '@/lib/types'

export function useConversations(userId: string | undefined) {
  const supabase = createClient()
  const [conversations, setConversations] = useState<ChatConversation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return

    async function fetchConvos() {
      const { data } = await supabase
        .from('chat_members')
        .select(`
          conversation_id,
          chat_conversations (*, chat_messages (*))
        `)
        .eq('user_id', userId)

      if (data) {
        // Transform the nested shape for easier mapping
        const formatted = data.map((item: any) => {
          const conv = item.chat_conversations
          if (!conv) return null
          return {
            ...conv,
            last_message: conv.chat_messages?.sort((a: any, b: any) => 
                 new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
          }
        }).filter(Boolean) as ChatConversation[]

        // Sort by most recently active
        formatted.sort((a, b) => {
           const timeA = a.last_message ? new Date(a.last_message.created_at).getTime() : new Date(a.created_at).getTime()
           const timeB = b.last_message ? new Date(b.last_message.created_at).getTime() : new Date(b.created_at).getTime()
           return timeB - timeA
        })
        setConversations(formatted)
      }
      setLoading(false)
    }

    fetchConvos()
  }, [userId, supabase])

  return { conversations, loading, setConversations }
}
