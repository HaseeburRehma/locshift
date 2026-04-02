import React, { useState, useRef, useEffect } from 'react'
import { ChatConversation, ChatMessage, Profile } from '@/lib/types'
import { Send, Plus, Smile, ChevronLeft, MoreVertical } from 'lucide-react'
import { MessageBubble } from './MessageBubble'
import { TypingIndicator } from './TypingIndicator'
import { OnlineIndicator } from './OnlineIndicator'
import { RoleBadge } from './RoleBadge'

interface ChatRoomProps {
  conversation: ChatConversation
  messages: ChatMessage[]
  currentUserId: string
  typingUsers: { user_id: string; full_name: string }[]
  isOnline: boolean
  onSendMessage: (content: string) => Promise<void>
  onTyping: (isTyping: boolean) => void
  onBack?: () => void
}

export function ChatRoom({
  conversation,
  messages,
  currentUserId,
  typingUsers,
  isOnline,
  onSendMessage,
  onTyping,
  onBack
}: ChatRoomProps) {
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const otherMember = conversation.is_group 
    ? null 
    : conversation.members?.find(m => m.user_id !== currentUserId)?.profile

  const displayName = conversation.is_group ? conversation.name : otherMember?.full_name
  const avatarUrl = conversation.is_group ? conversation.avatar_url : otherMember?.avatar_url
  const role = otherMember?.role

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, typingUsers])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    const content = input.trim()
    setInput('')
    onTyping(false)
    
    try {
      await onSendMessage(content)
    } catch (error) {
      console.error('Failed to send message:', error)
      setInput(content) // Restore input on failure
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value)
    onTyping(true)

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => {
      onTyping(false)
    }, 2000)
  }

  return (
    <div className="flex flex-col h-full bg-[#FCFCFD]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-100 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          {onBack && (
            <button onClick={onBack} className="md:hidden p-2 -ml-2 text-gray-400 hover:text-blue-600">
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}
          
          <div className="relative">
            <div className="w-11 h-11 rounded-full bg-gray-100 overflow-hidden border-2 border-white shadow-sm">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="flex items-center justify-center h-full text-sm font-bold text-gray-400">
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

          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="text-[17px] font-extrabold text-gray-900 truncate">
                {displayName}
              </h3>
              {role && <RoleBadge role={role} />}
            </div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              {conversation.is_group 
                ? `${conversation.members?.length || 0} Members` 
                : isOnline ? 'Online' : 'Offline'}
            </p>
          </div>
        </div>

        <button className="p-2 text-gray-400 hover:text-gray-900 transition-colors">
          <MoreVertical className="w-6 h-6" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-8 scrollbar-hide space-y-1">
        {messages.map((msg, index) => {
          const prevMsg = messages[index - 1]
          const showSender = !prevMsg || prevMsg.sender_id !== msg.sender_id
          
          return (
            <MessageBubble
              key={msg.id}
              message={msg}
              isOwn={msg.sender_id === currentUserId}
              showSender={showSender && conversation.is_group}
            />
          )
        })}
        
        {/* Typing Indicator */}
        <TypingIndicator names={typingUsers.map(u => u.full_name.split(' ')[0])} />
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="p-6 bg-white border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.03)] z-10">
        <form onSubmit={handleSend} className="flex items-end gap-3 max-w-5xl mx-auto relative">
          <div className="flex-1 relative group">
            <div className="absolute left-4 bottom-3.5 flex items-center gap-2">
               <button type="button" className="p-1 text-gray-400 hover:text-blue-600 transition-colors">
                 <Plus className="w-5 h-5" />
               </button>
            </div>
            
            <input
              type="text"
              value={input}
              onChange={handleInputChange}
              placeholder="Type a message here..."
              className="w-full min-h-[52px] pl-12 pr-12 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-[14px] outline-none focus:bg-white focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 transition-all font-medium placeholder:text-gray-400"
            />

            <div className="absolute right-4 bottom-3.5">
               <button type="button" className="p-1 text-gray-400 hover:text-blue-600 transition-colors">
                 <Smile className="w-5 h-5" />
               </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={!input.trim()}
            className={`
              flex-shrink-0 w-[52px] h-[52px] flex items-center justify-center rounded-2xl transition-all
              ${input.trim() 
                ? 'bg-[#0064E0] text-white shadow-lg shadow-blue-500/30 active:scale-95' 
                : 'bg-gray-100 text-gray-300 cursor-not-allowed'}
            `}
          >
            <Send className={`w-5 h-5 ${input.trim() ? 'fill-current translate-x-0.5 -translate-y-0.5' : ''}`} />
          </button>
        </form>
      </div>
    </div>
  )
}
