import React from 'react'

interface TypingIndicatorProps {
  names: string[]
}

export function TypingIndicator({ names }: TypingIndicatorProps) {
  if (names.length === 0) return null

  const label = names.length === 1 
    ? `${names[0]} is typing...` 
    : names.length === 2 
    ? `${names[0]} and ${names[1]} are typing...` 
    : `${names[0]} and ${names.length - 1} others are typing...`

  return (
    <div className="flex items-center gap-3 px-4 py-2 animate-in fade-in slide-in-from-bottom-2">
      <div className="flex gap-1 items-center bg-gray-100 px-3 py-2 rounded-2xl rounded-bl-none shadow-sm">
        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
      </div>
      <span className="text-xs font-medium text-gray-500 italic">
        {label}
      </span>
    </div>
  )
}
