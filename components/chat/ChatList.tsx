'use client'

import React from 'react'
import { MessageSquare } from 'lucide-react'
import { useConversations } from '@/lib/chat/useConversations'
import { FabMenu } from '@/components/chat/FabMenu'

interface ChatListProps {
  userId: string
  onOpenChat: (id: string) => void
  onNewChat: () => void
  onNewGroup: () => void
}

export function ChatList({ userId, onOpenChat, onNewChat, onNewGroup }: ChatListProps) {
  const { conversations, loading } = useConversations(userId)

  return (
    <div className="flex-1 flex flex-col pt-6 pb-4 bg-white relative">
      <div className="px-6 mb-4">
        <h1 className="text-[24px] font-bold text-gray-900 leading-tight">Chats</h1>
        <p className="text-gray-500 text-[14px]">Your chat history will be displayed here</p>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-4 border-[#0064E0] border-t-transparent animate-spin" />
        </div>
      ) : conversations.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center -mt-10 animate-in fade-in duration-500">
           <div className="w-48 h-48 bg-blue-50 rounded-full flex items-center justify-center mb-6">
             <MessageSquare className="w-24 h-24 text-blue-300" strokeWidth={1.5} />
           </div>
           <p className="text-gray-400 font-medium">No messages yet</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto no-scrollbar pb-16 px-4 space-y-2 animate-in fade-in">
          {conversations.map(convo => (
            <button
              key={convo.id}
              onClick={() => onOpenChat(convo.id)}
              className="w-full flex items-center justify-between p-4 bg-white hover:bg-gray-50 rounded-2xl transition-colors border border-transparent shadow-[0_2px_10px_rgb(0,0,0,0.02)]"
            >
               <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-blue-100 to-blue-200 border-2 border-white shadow-sm flex items-center justify-center">
                    <span className="font-bold text-blue-600">
                      {convo.is_group ? (convo.name ? convo.name.charAt(0).toUpperCase() : 'G') : 'U'}
                    </span>
                  </div>
                  <div className="text-left">
                     <h3 className="font-bold text-gray-900 text-[16px]">{convo.name || 'User Name'}</h3>
                     <p className="text-[13px] text-gray-500 font-medium break-all line-clamp-1">
                       {convo.last_message?.content || 'Started a conversation'}
                     </p>
                  </div>
               </div>
               <div className="flex flex-col items-end gap-1">
                 <span className="text-[11px] font-bold text-gray-400 uppercase">
                    {convo.last_message ? new Date(convo.last_message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                 </span>
               </div>
            </button>
          ))}
        </div>
      )}

      {/* Floating Action Button inside ChatList container to respect context positioning */}
      <FabMenu onNewChat={onNewChat} onNewGroup={onNewGroup} />
    </div>
  )
}
