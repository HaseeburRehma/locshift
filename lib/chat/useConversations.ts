'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useConversations(userId: string | undefined) {
  const supabase = createClient()
  const [conversations, setConversations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return

    async function fetchConvos() {
      // Notice: In a real app we'd join with profiles, but here is a basic outline 
      // utilizing the new tables from chat_schema.sql
      const { data } = await supabase
        .from('conversation_members')
        .select(`
          conversation_id,
          conversations (*, chat_messages (*))
        `)
        .eq('user_id', userId)

      if (data) {
        // Transform the nested shape for easier mapping
        const formatted = data.map((item: any) => ({
          ...item.conversations,
          last_message: item.conversations.chat_messages?.sort((a: any, b: any) => 
               new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
        }))
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

    // Optionally set up realtime channel here to invalidate
  }, [userId, supabase])

  return { conversations, loading, setConversations }
}
