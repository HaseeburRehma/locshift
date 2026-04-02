// app/dashboard/times/page.tsx
'use client'

import React, { useState } from 'react'
import { Plus, History, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useUser } from '@/lib/user-context'
import { useTranslation } from '@/lib/i18n'
import { TimeEntry, TimeFilter } from '@/lib/types'
import { useTimeEntries } from '@/hooks/times/useTimeEntries'
import { useTimeMutations } from '@/hooks/times/useTimeMutations'
import { TimeEntryCard } from '@/components/times/TimeEntryCard'
import { TimeEntryForm } from '@/components/times/TimeEntryForm'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer'
import { useMediaQuery } from '@/hooks/use-media-query'
import { FilterChips } from '@/components/dashboard/FilterChips'
import { ActiveShiftsDashboard } from '@/components/time/ActiveShiftsDashboard'

export default function TimesPage() {
  const { isAdmin, isDispatcher, profile } = useUser()
  const { locale } = useTranslation()
  const [filter, setFilter] = useState<TimeFilter>('all')
  const { entries, loading } = useTimeEntries(filter)
  const { createTimeEntry, isSubmitting } = useTimeMutations()
  const [isFormOpen, setIsFormOpen] = useState(false)
  const isDesktop = useMediaQuery("(min-width: 768px)")

  const filterOptions = [
    { id: 'all', label: locale === 'en' ? 'All' : 'Alle' },
    { id: 'pending', label: locale === 'en' ? 'Pending' : 'Offen' },
    { id: 'approved', label: locale === 'en' ? 'Approved' : 'Bestätigt' },
    { id: 'this_week', label: locale === 'en' ? 'This Week' : 'Diese Woche' },
  ]

  const handleAddEntry = async (data: any) => {
    const success = await createTimeEntry(data)
    if (success) {
      setIsFormOpen(false)
    }
    return success
  }

  const renderForm = () => (
    <TimeEntryForm 
      onSuccess={() => setIsFormOpen(false)}
      onCancel={() => setIsFormOpen(false)}
      onSubmit={handleAddEntry}
      isSubmitting={isSubmitting}
    />
  )

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-32">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-6 pt-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-[#0064E0] rounded-xl shadow-lg shadow-blue-500/20">
               <History className="w-5 h-5 text-white" />
             </div>
             <h2 className="text-3xl font-black tracking-tight text-gray-900 uppercase">
                {locale === 'en' ? 'Times' : 'Stunden'}
             </h2>
          </div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest opacity-60 ml-1">Working Hour Logs & Approval History</p>
        </div>
        
        {/* Desktop Add Button */}
        {isDesktop && (
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button className="h-14 rounded-2xl px-8 font-black shadow-2xl shadow-blue-500/20 gap-3 uppercase tracking-widest text-xs bg-[#0064E0] hover:bg-[#0050B3]">
                <Plus className="w-5 h-5" />
                {locale === 'en' ? 'Add Entry' : 'Stunde erfassen'}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-4xl rounded-[3rem] p-0 overflow-hidden border-none shadow-2xl max-h-[90vh] flex flex-col">
              <div className="p-10 border-b border-gray-100 bg-gray-50/50 flex-shrink-0">
                <DialogTitle className="text-3xl font-black text-gray-900 tracking-tight uppercase italic">
                   New Time Entry
                </DialogTitle>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Log professional service hours</p>
              </div>
              <div className="p-10 overflow-y-auto flex-grow custom-scrollbar">
                {renderForm()}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Admin/Dispatcher Monitoring Section */}
      {(isAdmin || isDispatcher) && (
        <div className="px-6 space-y-6 pt-2">
          <div>
            <h3 className="text-xl font-bold tracking-tight text-gray-900 leading-none mb-1 uppercase">Live Operations</h3>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Employees currently working</p>
          </div>
          <ActiveShiftsDashboard />
        </div>
      )}

      {/* History & Filter Section */}
      <div className="space-y-6">
        <div className="px-6">
          <FilterChips 
            options={filterOptions} 
            value={filter} 
            onChange={(val) => setFilter(val as TimeFilter)} 
          />
        </div>

        <div className="px-6 space-y-4">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-48 bg-gray-50 animate-pulse rounded-[2.5rem]" />
              ))}
            </div>
          ) : entries.length > 0 ? (
            entries.map(entry => (
              <TimeEntryCard 
                key={entry.id} 
                entry={entry} 
                onClick={(e) => {
                  // Navigate to detail or open detail modal
                  window.location.href = `/dashboard/times/${e.id}`
                }}
              />
            ))
          ) : (
            <div className="text-center py-32 bg-gray-50/50 rounded-[3rem] border border-dashed border-gray-100">
               <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-6 h-6 text-gray-300" />
               </div>
               <p className="text-xs font-black text-gray-400 uppercase tracking-widest">
                  {locale === 'en' ? 'No working hours found' : 'Keine Einträge gefunden'}
               </p>
            </div>
          )}
        </div>
      </div>

      {/* Mobile FAB */}
      {!isDesktop && (
        <div className="fixed bottom-24 right-6 z-50">
          <Drawer open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DrawerTrigger asChild>
              <Button className="w-16 h-16 rounded-3xl bg-[#0064E0] hover:bg-[#0050B3] text-white shadow-2xl shadow-blue-600/30 flex items-center justify-center active:scale-90 transition-all p-0">
                <Plus className="w-8 h-8" />
              </Button>
            </DrawerTrigger>
            <DrawerContent className="rounded-t-[3rem] px-8 pb-12 max-h-[90vh]">
              <DrawerHeader className="px-0 pb-8">
                <DrawerTitle className="text-3xl font-black uppercase leading-tight italic tracking-tighter">Log Your Time</DrawerTitle>
              </DrawerHeader>
              <div className="overflow-y-auto">
                {renderForm()}
              </div>
            </DrawerContent>
          </Drawer>
        </div>
      )}
    </div>
  )
}
