import React, { useState } from 'react'
import { ChatConversation, Profile } from '@/lib/types'
import { Search, Plus } from 'lucide-react'
import { ChatListItem } from './ChatListItem'
import { useTranslation } from '@/lib/i18n'

interface ChatSidebarProps {
  conversations: ChatConversation[]
  currentUserId: string
  activeId: string | null
  onSelect: (id: string) => void
  onNewChat: () => void
  onlineUsers: Record<string, boolean>
}

export function ChatSidebar({ 
  conversations, 
  currentUserId, 
  activeId, 
  onSelect, 
  onNewChat,
  onlineUsers
}: ChatSidebarProps) {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')

  const filteredConversations = conversations.filter(conv => {
    const otherMember = conv.is_group 
      ? null 
      : conv.members?.find(m => m.user_id !== currentUserId)?.profile
    
    const displayName = conv.is_group ? conv.name : otherMember?.full_name
    return displayName?.toLowerCase().includes(search.toLowerCase())
  })

  return (
    <div className="w-full md:w-[360px] h-full flex flex-col border-r border-gray-100 bg-white shadow-sm z-10 overflow-hidden">
      {/* Header */}
      <div className="p-6 pb-2">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-[24px] font-extrabold text-gray-900 tracking-tight">{t('chat.title')}</h2>
          <button 
            onClick={onNewChat}
            className="p-2 bg-[#0064E0] text-white rounded-full hover:bg-[#0050B3] transition-all shadow-lg shadow-blue-500/20 active:scale-95"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>

        {/* Search */}
        <div className="relative group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
          <input
            type="text"
            placeholder={t('chat.search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-12 pl-10 pr-4 bg-gray-50 border border-gray-100 rounded-xl text-[14px] outline-none focus:bg-white focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 transition-all placeholder:text-gray-400 font-medium"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto mt-4 scrollbar-hide">
        {filteredConversations.length > 0 ? (
          filteredConversations.map((conv) => {
            const otherMember = conv.is_group 
              ? null 
              : conv.members?.find(m => m.user_id !== currentUserId)?.profile
            
            return (
              <ChatListItem
                key={conv.id}
                conversation={conv}
                currentUserId={currentUserId}
                active={activeId === conv.id}
                onClick={() => onSelect(conv.id)}
                isOnline={otherMember ? !!onlineUsers[otherMember.id] : false}
              />
            )
          })
        ) : (
          <div className="flex flex-col items-center justify-center p-8 text-center mt-12">
            <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3">
              <Search className="w-6 h-6 text-gray-300" />
            </div>
            <p className="text-[14px] text-gray-400 font-medium leading-relaxed">
              {search ? t('chat.noConversations') : t('chat.startConversation')}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
