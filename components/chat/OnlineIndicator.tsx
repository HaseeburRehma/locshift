import React from 'react'

interface OnlineIndicatorProps {
  isOnline: boolean
  className?: string
}

export function OnlineIndicator({ isOnline, className = '' }: OnlineIndicatorProps) {
  return (
    <div className={`relative ${className}`}>
      <div className={`w-3 h-3 rounded-full border-2 border-white ${isOnline ? 'bg-green-500' : 'bg-gray-300'}`} />
    </div>
  )
}
