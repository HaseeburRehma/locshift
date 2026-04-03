'use client'

import React, { useState, useEffect } from 'react'
import { TimesList } from '@/components/time/TimesList'
import { AddTimeEntryForm } from '@/components/time/AddTimeEntryForm'
import { TimeEntryDetails } from '@/components/time/TimeEntryDetails'
import { useTimeTracking } from '@/hooks/useTimeTracking'
import { useUser } from '@/lib/user-context'
import { createClient } from '@/lib/supabase/client'
import { TimeEntry, TimeEntryFormData } from '@/lib/types'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

export default function TimesPage() {
  const [view, setView] = useState<'list' | 'add' | 'details'>('list')
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
      : (entriesData?.filter(e => e.employee_id === user.id) || [])

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
        employee_id: user.id, // Manual entries are currently assigned to the creator, but could be selectable later
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
      <div className="max-w-md mx-auto md:max-w-6xl md:px-6 md:py-8 lg:px-8">
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
          <div className="md:max-w-2xl md:mx-auto md:bg-white md:rounded-[3rem] md:shadow-2xl md:overflow-hidden">
            <AddTimeEntryForm 
              onBack={() => setView('list')}
              onSubmit={handleAddSubmit}
              customers={customers}
            />
          </div>
        )}

        {view === 'details' && selectedEntry && (
          <div className="md:max-w-2xl md:mx-auto md:bg-white md:rounded-[3rem] md:shadow-2xl md:overflow-hidden">
            <TimeEntryDetails 
              entry={selectedEntry}
              onBack={() => setView('list')}
              onEdit={() => toast.info('Edit mode coming soon')}
            />
          </div>
        )}
      </div>
    </div>
  )
}
