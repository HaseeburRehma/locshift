'use client'

import React, { useState, useEffect } from 'react'
import { TimesList } from '@/components/time/TimesList'
import { TimeEntryForm } from '@/components/time/TimeEntryForm'
import { TimeEntryDetails } from '@/components/time/TimeEntryDetails'
import { useTimeTracking } from '@/hooks/useTimeTracking'
import { useUser } from '@/lib/user-context'
import { createClient } from '@/lib/supabase/client'
import { TimeEntry, TimeEntryFormData } from '@/lib/types'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

export default function TimesPage() {
  const [view, setView] = useState<'list' | 'add' | 'details' | 'edit'>('list')
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null)
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [customers, setCustomers] = useState<{ id: string, name: string }[]>([])
  const [fetching, setFetching] = useState(true)
  
  const { user, profile, isAdmin, isDispatcher } = useUser()
  const { clockIn, clockOut } = useTimeTracking()
  const supabase = createClient()

  const canAddManually = isAdmin || isDispatcher

  const fetchData = async () => {
    if (!user || !profile?.organization_id) return
    setFetching(true)
    
    // Fetch entries
    const { data: entriesData, error: entriesError } = await supabase
      .from('time_entries')
      .select('*, customer:customers(id, name), verifier:profiles!verified_by(id, full_name)')
      .eq('organization_id', profile.organization_id)
      .order('date', { ascending: false })
      .order('start_time', { ascending: false })

    // Filter by employee if not admin/dispatcher
    const filteredEntries = (isAdmin || isDispatcher)
      ? entriesData 
      : (entriesData?.filter((e: TimeEntry) => e.employee_id === user.id) || [])

    if (entriesError) toast.error('Failed to load time entries')
    else setEntries(filteredEntries || [])

    // Fetch customers
    const { data: customersData } = await supabase
      .from('customers')
      .select('id, name')
      .eq('organization_id', profile.organization_id)
      .eq('is_active', true)

    setCustomers(customersData || [])
    setFetching(false)
  }

  useEffect(() => {
    fetchData()
  }, [user, profile, isAdmin, isDispatcher])

  const handleAddSubmit = async (data: TimeEntryFormData) => {
    if (!user || !profile?.organization_id || !canAddManually) {
      toast.error('Unauthorized to add manual entries')
      return
    }

    const startDateTime = `${data.date}T${data.startTime}:00`
    const endDateTime = `${data.date}T${data.endTime}:00`
    
    const start = new Date(startDateTime).getTime()
    const end = new Date(endDateTime).getTime()
    const netHours = Math.max(0, (end - start) / (1000 * 60 * 60) - (data.breakMinutes / 60))

    const { error } = await supabase
      .from('time_entries')
      .insert({
        organization_id: profile.organization_id,
        employee_id: user.id,
        date: data.date,
        start_time: startDateTime,
        end_time: endDateTime,
        break_minutes: data.breakMinutes,
        customer_id: data.customerId || null,
        location: data.location || null,
        notes: data.notes || null,
        net_hours: Number(netHours.toFixed(2))
      })

    if (error) {
      toast.error('Failed to create entry')
      return
    }

    toast.success('Time entry created')
    setView('list')
    fetchData()
  }

  const handleEditSubmit = async (data: TimeEntryFormData) => {
    if (!selectedEntryId || !profile?.organization_id) return

    const startDateTime = `${data.date}T${data.startTime}:00`
    const endDateTime = `${data.date}T${data.endTime}:00`
    
    const start = new Date(startDateTime).getTime()
    const end = new Date(endDateTime).getTime()
    const netHours = Math.max(0, (end - start) / (1000 * 60 * 60) - (data.breakMinutes / 60))

    const { error } = await supabase
      .from('time_entries')
      .update({
        date: data.date,
        start_time: startDateTime,
        end_time: endDateTime,
        break_minutes: data.breakMinutes,
        customer_id: data.customerId || null,
        location: data.location || null,
        notes: data.notes || null,
        net_hours: Number(netHours.toFixed(2))
      })
      .eq('id', selectedEntryId)

    if (error) {
      toast.error('Failed to update entry')
      return
    }

    toast.success('Time entry updated')
    setView('details')
    fetchData()
  }

  const selectedEntry = entries.find(e => e.id === selectedEntryId)

  if (fetching) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    )
  }

  return (
    <div className="h-full bg-white md:bg-transparent min-h-screen">
      <div className="max-w-[1600px] mx-auto md:px-6 md:py-8 lg:px-8">
        {view === 'list' && (
          <TimesList 
            entries={entries} 
            userRole={profile?.role}
            onEntryClick={(id) => {
              setSelectedEntryId(id)
              setView('details')
            }}
            onAddClick={() => {
              if (canAddManually) setView('add')
              else toast.error('Only administrators can add time manually')
            }}
          />
        )}

        {view === 'add' && (
          <div className="max-w-5xl mx-auto md:bg-white md:rounded-[3rem] md:shadow-2xl md:overflow-hidden md:border md:border-slate-100">
            <TimeEntryForm 
              onBack={() => setView('list')}
              onSubmit={handleAddSubmit}
              customers={customers}
            />
          </div>
        )}

        {view === 'details' && selectedEntry && (
          <div className="max-w-5xl mx-auto md:bg-white md:rounded-[3rem] md:shadow-2xl md:overflow-hidden md:border md:border-slate-100">
            <TimeEntryDetails 
              entry={selectedEntry}
              onBack={() => setView('list')}
              onEdit={() => setView('edit')}
            />
          </div>
        )}

        {view === 'edit' && selectedEntry && (
          <div className="max-w-5xl mx-auto md:bg-white md:rounded-[3rem] md:shadow-2xl md:overflow-hidden md:border md:border-slate-100">
            <TimeEntryForm 
              initialData={selectedEntry}
              onBack={() => setView('details')}
              onSubmit={handleEditSubmit}
              customers={customers}
            />
          </div>
        )}
      </div>
    </div>
  )
}
