import React from 'react'
import { ChatMessage, Profile } from '@/lib/types'
import { format } from 'date-fns'

interface MessageBubbleProps {
  message: ChatMessage
  isOwn: boolean
  showSender?: boolean
}

export function MessageBubble({ message, isOwn, showSender }: MessageBubbleProps) {
  const timestamp = format(new Date(message.created_at), 'HH:mm')

  return (
    <div className={`flex flex-col mb-4 ${isOwn ? 'items-end' : 'items-start'}`}>
      {showSender && !isOwn && message.sender && (
        <span className="text-[11px] font-bold text-gray-500 mb-1 ml-4">
          {message.sender.full_name}
        </span>
      )}
      
      <div className="flex items-end gap-2 max-w-[85%]">
        {!isOwn && (
          <div className="w-8 h-8 rounded-full bg-gray-100 flex-shrink-0 flex items-center justify-center overflow-hidden">
             {message.sender?.avatar_url ? (
               <img src={message.sender.avatar_url} alt="" className="w-full h-full object-cover" />
             ) : (
               <span className="text-xs font-bold text-gray-400">
                 {message.sender?.full_name?.[0].toUpperCase() || '?'}
               </span>
             )}
          </div>
        )}

        <div className="flex flex-col gap-1">
          <div className={`
            px-4 py-2.5 rounded-2xl text-[14px] leading-relaxed shadow-sm
            ${isOwn 
              ? 'bg-[#0064E0] text-white rounded-br-none' 
              : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none'}
          `}>
            {message.content}
            
            {message.attachment_url && (
              <div className="mt-2 rounded-lg overflow-hidden border border-black/5">
                {message.attachment_type === 'image' ? (
                  <img src={message.attachment_url} alt={message.attachment_name || ''} className="max-w-full h-auto" />
                ) : (
                  <a 
                    href={message.attachment_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-2 bg-black/5 hover:bg-black/10 transition-colors"
                  >
                    <span className="text-xs font-bold truncate max-w-[150px]">{message.attachment_name}</span>
                  </a>
                )}
              </div>
            )}
          </div>
          
          <div className={`flex items-center gap-1 mt-0.5 ${isOwn ? 'justify-end' : 'justify-start'}`}>
            <span className="text-[10px] text-gray-400 font-medium">{timestamp}</span>
            {isOwn && (
              <span className="text-blue-500 text-[10px] font-bold">✓✓</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
