'use client'

import React, { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ChevronLeft, Search, User, Users } from 'lucide-react'
import { useTranslation } from '@/lib/i18n'

interface ContactPickerProps {
  userId: string
  isGroup: boolean
  onBack: () => void
  onChatCreated: (conversationId: string) => void
}

export function ContactPicker({ userId, isGroup, onBack, onChatCreated }: ContactPickerProps) {
  const [profiles, setProfiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [creating, setCreating] = useState(false)
  const supabase = createClient()
  const { locale } = useTranslation()
  const L = (de: string, en: string) => (locale === 'de' ? de : en)

  useEffect(() => {
    async function fetchProfiles() {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', userId)

      if (data) setProfiles(data)
      setLoading(false)
    }
    fetchProfiles()
  }, [userId, supabase])

  const filtered = profiles.filter(p => p.full_name?.toLowerCase().includes(search.toLowerCase()))

  const toggleSelect = (id: string) => {
    if (!isGroup) {
      handleCreateConversation([id])
    } else {
      setSelected(prev => 
        prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
      )
    }
  }

  const handleCreateConversation = async (memberIds: string[]) => {
    setCreating(true)
    try {
      // Create conversation
      const { data: convData, error: convError } = await supabase
        .from('conversations')
        .insert({
          is_group: isGroup,
          name: isGroup ? 'Team Alpha' : null, // Would normally prompt for Group Name
          created_by: userId
        }).select().single()

      if (convError || !convData) throw convError

      // Insert members (including creator)
      const membersToInsert = [...memberIds, userId].map(id => ({
        conversation_id: convData.id,
        user_id: id
      }))

      const { error: memError } = await supabase
        .from('conversation_members')
        .insert(membersToInsert)

      if (memError) throw memError

      onChatCreated(convData.id)
    } catch (e) {
      console.error(e)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-white w-full animate-in slide-in-from-bottom duration-300">
      {/* Header */}
      <div className="pt-6 px-4 pb-4">
         <div className="flex items-center mb-6">
            <button onClick={onBack} className="p-2 -ml-2 text-gray-500 hover:bg-gray-50 rounded-full transition-colors">
               <ChevronLeft size={28} />
            </button>
            <h1 className="text-[24px] font-bold text-gray-900 ml-2">
               {isGroup ? L('Neue Gruppe', 'New group') : L('Neuer Chat', 'New chat')}
            </h1>
         </div>

         {/* Search */}
         <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input 
              type="text" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={L('Hier suchen…', 'Search here…')}
              className="w-full h-12 bg-gray-50 border-none rounded-xl pl-12 pr-4 outline-none text-[15px] placeholder:text-gray-400 focus:ring-2 focus:ring-blue-100 transition-all font-medium"
            />
         </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-6">
         {loading ? (
            <div className="flex justify-center mt-6">
              <div className="w-8 h-8 rounded-full border-4 border-[#0064E0] border-t-transparent animate-spin" />
            </div>
         ) : (
            <div className="grid grid-cols-4 gap-y-6 gap-x-4">
               {filtered.map(p => {
                 const isSel = selected.includes(p.id)
                 return (
                   <div key={p.id} className="flex flex-col items-center gap-2">
                      <button 
                        disabled={creating}
                        onClick={() => toggleSelect(p.id)}
                        className={`w-16 h-16 rounded-full flex items-center justify-center shadow-sm border-2 transition-all ${
                          isSel ? 'border-[#0064E0] scale-105 bg-blue-50' : 'border-gray-100 bg-gray-50 hover:bg-blue-50 hover:border-blue-200'
                        }`}
                      >
                         <User className={isSel ? "text-[#0064E0]" : "text-gray-400"} size={26} strokeWidth={1.5} />
                      </button>
                      <span className="text-[12px] font-semibold text-gray-700 truncate w-full flex justify-center mt-1">
                         {p.full_name?.split(' ')[0] || L('Unbekannt', 'Unknown')} {isSel && <span className="text-[#0064E0] ml-0.5 mt-[-2px] text-xs">✓</span>}
                      </span>
                   </div>
                 )
               })}
            </div>
         )}
      </div>

      {/* Actions */}
      {isGroup && selected.length >= 2 && (
         <div className="p-4 border-t border-gray-100 bg-white">
           <button 
             onClick={() => handleCreateConversation(selected)}
             disabled={creating}
             className="w-full bg-[#0064E0] text-white py-4 rounded-xl font-semibold text-[16px] hover:bg-[#0050B3] transition-colors shadow-lg shadow-blue-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
           >
             <Users size={20} />
             {creating ? L('Wird erstellt…', 'Creating…') : L('Gruppe erstellen', 'Create group')}
           </button>
         </div>
      )}
    </div>
  )
}
