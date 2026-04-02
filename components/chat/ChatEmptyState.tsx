import React from 'react'
import Image from 'next/image'

interface ChatEmptyStateProps {
  title?: string
  description?: string
}

export function ChatEmptyState({ 
  title = 'No messages yet', 
  description = 'Your chat history will be displayed here' 
}: ChatEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 h-full bg-white text-center">
      <div className="relative w-64 h-64 mb-6 animate-in fade-in zoom-in duration-500">
        <img 
          src="/assets/illustrations/illustration 2.png" 
          alt="No messages"
          className="w-full h-full object-contain"
          // Add a fallback in case the image is missing during development
          onError={(e) => {
            (e.target as any).src = 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Thought%20Balloon.png'
          }}
        />
      </div>
      <h3 className="text-[22px] font-extrabold text-gray-900 mb-2">Chats</h3>
      <p className="text-[15px] text-gray-500 max-w-xs mx-auto leading-relaxed font-medium">
        {description}
      </p>
    </div>
  )
}
