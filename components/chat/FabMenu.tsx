import React, { useState } from 'react'
import { Plus, X, User, Users } from 'lucide-react'

interface FabMenuProps {
  onNewChat: () => void
  onNewGroup: () => void
}

export function FabMenu({ onNewChat, onNewGroup }: FabMenuProps) {
  const [isOpen, setIsOpen] = useState(false)

  const toggle = () => setIsOpen(!isOpen)

  return (
    <div className="fixed bottom-24 right-6 flex flex-col items-end gap-3 z-50">
      {/* Menu Items */}
      <div className={`flex flex-col items-end gap-3 transition-all duration-300 ${isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}`}>
        <button
          onClick={() => { onNewGroup(); toggle() }}
          className="flex items-center gap-3 bg-white text-gray-700 px-4 py-2.5 rounded-full shadow-lg border border-gray-100 hover:bg-gray-50 active:scale-95 transition-all text-[14px] font-bold"
        >
          <span>New Group</span>
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </button>

        <button
          onClick={() => { onNewChat(); toggle() }}
          className="flex items-center gap-3 bg-white text-gray-700 px-4 py-2.5 rounded-full shadow-lg border border-gray-100 hover:bg-gray-50 active:scale-95 transition-all text-[14px] font-bold"
        >
          <span>New Chat</span>
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
            <User className="w-5 h-5" />
          </div>
        </button>
      </div>

      {/* Main FAB */}
      <button
        onClick={toggle}
        className={`
          w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 active:scale-90
          ${isOpen ? 'bg-white text-blue-600 border border-gray-100 rotate-0' : 'bg-[#0064E0] text-white rotate-0 shadow-blue-500/40'}
        `}
      >
        {isOpen ? (
          <X className="w-6 h-6 animate-in spin-in-90 duration-300" />
        ) : (
          <Plus className="w-7 h-7 animate-in zoom-in-0 duration-300" />
        )}
      </button>
    </div>
  )
}
