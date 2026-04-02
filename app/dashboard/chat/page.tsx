'use client'

import React, { useState } from 'react'
import { useUser } from '../../../lib/user-context'
import { useConversations } from '../../../hooks/chat/useConversations'
import { useMessages } from '../../../hooks/chat/useMessages'
import { useTyping } from '../../../hooks/chat/useTyping'
import { usePresence } from '../../../hooks/chat/usePresence'
import { ChatSidebar } from '../../../components/chat/ChatSidebar'
import { ChatRoom } from '../../../components/chat/ChatRoom'
import { ChatEmptyState } from '../../../components/chat/ChatEmptyState'
import { FabMenu } from '../../../components/chat/FabMenu'
import { ContactPickerGrid } from '../../../components/chat/ContactPickerGrid'
import { getOrCreateDirectConversation } from '../../../lib/chat/conversations'
import { Profile, ChatConversation, ChatMember } from '../../../lib/types'
import { X } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function ChatPage() {
  const { user, profile } = useUser()
  const { conversations, loading: loadingConvs } = useConversations()
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [showContactPicker, setShowContactPicker] = useState(false)
  const router = useRouter()

  const activeConversation = conversations.find((c: ChatConversation) => c.id === activeConversationId)
  
  const { messages, sendMessage } = useMessages(activeConversationId)
  const { typingUsers, setTyping } = useTyping(activeConversationId, user?.id || null, profile?.full_name || null)
  const onlineUsers = usePresence(activeConversationId, profile)

  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id)
    // On mobile, we navigate to the subpage
    if (window.innerWidth < 768) {
      router.push(`/dashboard/chat/${id}`)
    }
  }

  const handleStartDirectChat = async (targetProfile: Profile) => {
    if (!profile || !profile.organization_id) return
    
    try {
      const convId = await getOrCreateDirectConversation(
        profile.id,
        targetProfile.id,
        profile.organization_id
      )
      setShowContactPicker(false)
      setActiveConversationId(convId)
      if (window.innerWidth < 768) {
        router.push(`/dashboard/chat/${convId}`)
      }
    } catch (error) {
      console.error('Failed to start chat:', error)
    }
  }

  if (!profile) return null

  return (
    <div className="flex h-[calc(100vh-64px)] w-full overflow-hidden bg-white">
      {/* Sidebar */}
      <ChatSidebar
        conversations={conversations}
        currentUserId={profile.id}
        activeId={activeConversationId}
        onSelect={handleSelectConversation}
        onNewChat={() => setShowContactPicker(true)}
        onlineUsers={onlineUsers}
      />

      {/* Main Content (Desktop) */}
      <div className="flex-1 border-l border-gray-100 hidden md:block">
        {activeConversation ? (
          <ChatRoom
            conversation={activeConversation}
            messages={messages}
            currentUserId={profile.id}
            typingUsers={typingUsers}
            isOnline={!!onlineUsers[activeConversation.members?.find((m: ChatMember) => m.user_id !== profile.id)?.user_id || '']}
            onSendMessage={sendMessage}
            onTyping={setTyping}
          />
        ) : (
          <ChatEmptyState />
        )}
      </div>

      {/* Mobile FAB */}
      <div className="md:hidden">
        <FabMenu 
          onNewChat={() => setShowContactPicker(true)} 
          onNewGroup={() => {/* TODO: Group Modal */}} 
        />
      </div>

      {/* Contact Picker Overlay / Modal */}
      {showContactPicker && (
        <div className="fixed inset-0 z-[100] bg-white flex flex-col animate-in slide-in-from-bottom duration-300">
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <h2 className="text-[20px] font-extrabold text-gray-900">New Chats</h2>
            <button 
              onClick={() => setShowContactPicker(false)}
              className="p-2 text-gray-400 hover:text-gray-900"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            <ContactPickerGrid
              currentUserId={profile.id}
              organizationId={profile.organization_id || ''}
              onSelect={handleStartDirectChat}
            />
          </div>
        </div>
      )}
    </div>
  )
}
