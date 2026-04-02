import React, { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/lib/types'
import { RoleBadge } from './RoleBadge'
import { Search, Loader2, Check } from 'lucide-react'

interface ContactPickerGridProps {
  onSelect: (profile: Profile) => void
  currentUserId: string
  organizationId: string
  selectedIds?: string[]
}

export function ContactPickerGrid({ onSelect, currentUserId, organizationId, selectedIds = [] }: ContactPickerGridProps) {
  const [contacts, setContacts] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const supabase = createClient()

  useEffect(() => {
    const fetchContacts = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('organization_id', organizationId)
        .neq('id', currentUserId)
        .eq('is_active', true)
        .order('full_name')

      if (error) {
        console.error('Error fetching contacts:', error)
      } else {
        setContacts(data || [])
        if (data?.length === 0) {
           console.log('[ContactPicker] No other members found in org:', organizationId)
        }
      }
      setLoading(false)
    }

    fetchContacts()
  }, [organizationId, currentUserId, supabase])

  const filtered = contacts.filter(c => 
    c.full_name?.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
        <p className="text-gray-500 font-medium">Loading organization contacts...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="px-6 pt-6 pb-4">
        <div className="relative group mb-6">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
          <input
            type="text"
            placeholder="Search here..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-12 pl-10 pr-4 bg-gray-50 border border-gray-100 rounded-xl text-[14px] outline-none focus:bg-white focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 transition-all font-medium placeholder:text-gray-400"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-8">
        <div className="grid grid-cols-4 gap-x-2 gap-y-6">
          {filtered.map((contact) => (
            <button
              key={contact.id}
              onClick={() => onSelect(contact)}
              className="flex flex-col items-center gap-2 group transition-all active:scale-95"
            >
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-gray-100 overflow-hidden border-2 border-white shadow-sm ring-2 ring-transparent group-hover:ring-blue-500/20 transition-all">
                  {contact.avatar_url ? (
                    <img src={contact.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-50">
                      <span className="text-xl font-bold text-gray-400">
                        {contact.full_name?.[0].toUpperCase() || '?'}
                      </span>
                    </div>
                  )}
                  {selectedIds.includes(contact.id) && (
                    <div className="absolute inset-0 bg-blue-500/20 backdrop-blur-[1px] flex items-center justify-center rounded-full animate-in zoom-in duration-200">
                      <div className="bg-blue-500 text-white rounded-full p-1 shadow-lg border-2 border-white">
                         <Check className="w-4 h-4" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex flex-col items-center gap-1 min-w-0 w-full">
                <span className="text-[13px] font-bold text-gray-900 truncate w-full text-center">
                  {contact.full_name?.split(' ')[0]}
                </span>
                <RoleBadge role={contact.role} />
              </div>
            </button>
          ))}
        </div>
        
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-gray-400 font-medium">No contacts found in your organization.</p>
          </div>
        )}
      </div>
    </div>
  )
}
