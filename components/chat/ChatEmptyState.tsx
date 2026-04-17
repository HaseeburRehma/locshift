import React from 'react'
import { MessageCircle } from 'lucide-react'
import { useTranslation } from '@/lib/i18n'

interface ChatEmptyStateProps {
  title?: string
  description?: string
}

export function ChatEmptyState({
  title,
  description,
}: ChatEmptyStateProps) {
  const { t } = useTranslation()
  const displayTitle = title || t('chat.title')
  const displayDesc = description || t('chat.selectConversation')
  return (
    <div className="flex flex-col items-center justify-center p-8 h-full bg-[#FAFBFC] text-center">
      <div className="relative w-48 h-48 mb-6 animate-in fade-in zoom-in duration-500">
        <img
          src="/assets/illustrations/chat_empty.svg"
          alt="No messages"
          className="w-full h-full object-contain"
          onError={(e) => {
            // Hide the image on error and show fallback icon
            (e.target as HTMLImageElement).style.display = 'none'
          }}
        />
      </div>
      <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
        <MessageCircle className="w-7 h-7 text-blue-500" />
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">{displayTitle}</h3>
      <p className="text-sm text-gray-500 max-w-xs mx-auto leading-relaxed font-medium">
        {displayDesc}
      </p>
    </div>
  )
}
