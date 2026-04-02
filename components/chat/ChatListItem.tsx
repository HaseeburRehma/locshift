import React from 'react'
import { ChatConversation, Profile } from '@/lib/types'
import { format } from 'date-fns'
import { RoleBadge } from './RoleBadge'
import { OnlineIndicator } from './OnlineIndicator'

interface ChatListItemProps {
  conversation: ChatConversation
  currentUserId: string
  active: boolean
  onClick: () => void
  isOnline: boolean
}

export function ChatListItem({ conversation, currentUserId, active, onClick, isOnline }: ChatListItemProps) {
  // Get the display name and avatar for 1:1 chats
  const otherMember = conversation.is_group 
    ? null 
    : conversation.members?.find(m => m.user_id !== currentUserId)?.profile

  const displayName = conversation.is_group ? conversation.name : otherMember?.full_name
  const avatarUrl = conversation.is_group ? conversation.avatar_url : otherMember?.avatar_url
  const role = otherMember?.role
  
  const lastMsg = conversation.last_message?.content || (conversation.last_message?.attachment_url ? 'Attachment' : 'No messages')
  const timestamp = conversation.last_message 
    ? format(new Date(conversation.last_message.created_at), 'HH:mm')
    : ''

  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center gap-3 p-4 transition-all border-b border-gray-50
        ${active ? 'bg-blue-50/50' : 'hover:bg-gray-50'}
      `}
    >
      <div className="relative flex-shrink-0">
        <div className="w-12 h-12 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-sm font-bold text-gray-400">
              {displayName?.[0].toUpperCase() || '?'}
            </span>
          )}
        </div>
        {!conversation.is_group && (
          <OnlineIndicator 
            isOnline={isOnline} 
            className="absolute bottom-0 right-0" 
          />
        )}
      </div>

      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center justify-between mb-0.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <h4 className={`text-[15px] font-bold truncate ${active ? 'text-blue-700' : 'text-gray-900'}`}>
              {displayName}
            </h4>
            {role && <RoleBadge role={role} />}
          </div>
          <span className="text-[11px] text-gray-400 font-medium whitespace-nowrap">
            {timestamp}
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <p className="text-[13px] text-gray-500 truncate pr-4">
            {lastMsg}
          </p>
          {(conversation.unread_count || 0) > 0 && (
            <span className="flex-shrink-0 bg-[#0064E0] text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
              {conversation.unread_count}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}
