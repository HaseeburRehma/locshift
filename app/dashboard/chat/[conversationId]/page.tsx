'use client'

import React from 'react'
import { useUser } from '@/lib/user-context'
import { useConversations } from '@/hooks/chat/useConversations'
import { useMessages } from '@/hooks/chat/useMessages'
import { useTyping } from '@/hooks/chat/useTyping'
import { usePresence } from '@/hooks/chat/usePresence'
import { ChatRoom } from '@/components/chat/ChatRoom'
import { useRouter } from 'next/navigation'

interface ConversationPageProps {
  params: {
    conversationId: string
  }
}

export default function ConversationPage({ params }: ConversationPageProps) {
  const { user, profile } = useUser()
  const { conversations, loading: loadingConvs } = useConversations()
  const router = useRouter()

  const conversationId = params.conversationId
  const conversation = conversations.find(c => c.id === conversationId)
  
  const { messages, sendMessage } = useMessages(conversationId)
  const { typingUsers, setTyping } = useTyping(conversationId, user?.id || null, profile?.full_name || null)
  const onlineUsers = usePresence(conversationId, profile)

  const handleBack = () => {
    router.push('/dashboard/chat')
  }

  if (!profile || loadingConvs) return null
  if (!conversation) return null

  return (
    <div className="h-screen w-full bg-white z-[100] fixed inset-0 md:relative md:h-full">
      <ChatRoom
        conversation={conversation}
        messages={messages}
        currentUserId={profile.id}
        typingUsers={typingUsers}
        isOnline={!!onlineUsers[conversation.members?.find(m => m.user_id !== profile.id)?.user_id || '']}
        onSendMessage={sendMessage}
        onTyping={setTyping}
        onBack={handleBack}
      />
    </div>
  )
}
