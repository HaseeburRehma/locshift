'use client'

import React, { use } from 'react'
import { useUser } from '@/lib/user-context'
import { useConversations } from '@/hooks/chat/useConversations'
import { useMessages } from '@/hooks/chat/useMessages'
import { useTyping } from '@/hooks/chat/useTyping'
import { usePresence } from '@/hooks/chat/usePresence'
import { ChatRoom } from '@/components/chat/ChatRoom'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { useTranslation } from '@/lib/i18n'

export default function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>
}) {
  const { conversationId } = use(params)
  const { t } = useTranslation()
  const { user, profile } = useUser()
  const { conversations, loading: loadingConvs } = useConversations()
  const router = useRouter()

  const conversation = conversations.find(c => c.id === conversationId)

  const { messages, sendMessage } = useMessages(conversationId)
  const { typingUsers, setTyping } = useTyping(conversationId, user?.id || null, profile?.full_name || null)
  const onlineUsers = usePresence(conversationId, profile)

  const handleBack = () => {
    router.push('/dashboard/chat')
  }

  if (!profile || loadingConvs) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-10rem)]">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    )
  }

  if (!conversation) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-10rem)]">
        <div className="text-center">
          <p className="text-sm text-gray-500 mb-3">{t('chat.notFound')}</p>
          <button
            onClick={handleBack}
            className="text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            {t('chat.backToChats')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className="w-full bg-white rounded-xl md:border md:border-gray-100 md:shadow-sm overflow-hidden h-[calc(100vh-15rem)] md:h-[calc(100vh-11rem)]"
    >
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
