'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Customer } from '@/lib/types'
import { useUser } from '@/lib/user-context'
import { sendNotification } from '@/lib/notifications/service'

export function useCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const { profile } = useUser()
  const supabase = createClient()

  const fetchCustomers = useCallback(async (isSilent = false) => {
    if (!profile?.organization_id) return
    if (!isSilent) setLoading(true)
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('organization_id', profile.organization_id)
      .order('name', { ascending: true })

    if (!error) setCustomers(data || [])
    setLoading(false)
  }, [profile?.organization_id, supabase])

  useEffect(() => {
    fetchCustomers()

    if (!profile?.organization_id) return

    // Real-time synchronization for customer mission data
    const channel = supabase
      .channel(`customers-hub-${profile.organization_id}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'customers', 
        filter: `organization_id=eq.${profile.organization_id}` 
      }, (payload: any) => {
        console.log('[useCustomers] Real-time operational change:', payload)
        fetchCustomers(true) // Silent refetch to sync potential changes from other users
      })
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          console.log('[useCustomers] Successfully connected to HUD stream')
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [profile?.organization_id, fetchCustomers, supabase])

  const addCustomer = async (customer: Partial<Customer>) => {
    if (!profile?.organization_id) return
    const { data, error } = await supabase
      .from('customers')
      .insert({ ...customer, organization_id: profile.organization_id })
      .select()
      .single()
    if (error) throw error

    // Sync local state immediately for instant UI reflection
    setCustomers(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))

    // Notify all admins
    const { data: admins } = await supabase
      .from('profiles')
      .select('id')
      .eq('organization_id', profile.organization_id)
      .in('role', ['admin', 'dispatcher'])

    if (admins) {
      await Promise.all(admins.map((admin: { id: string }) =>
        sendNotification({
          userId: admin.id,
          title: '🏢 Neuer Kunde angelegt',
          message: `Ein neuer Kunde „${customer.name}" wurde angelegt.`,
          module: 'customers',
          moduleId: data?.id
        })
      ))
    }
    return data
  }

  const updateCustomer = async (id: string, updates: Partial<Customer>) => {
    const { data, error } = await supabase
      .from('customers')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    
    // Sync local state immediately
    setCustomers(prev => prev.map(c => c.id === id ? data : c))
    return data
  }

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    return updateCustomer(id, { is_active: !currentStatus })
  }

  const deleteCustomer = async (id: string) => {
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', id)
    if (error) throw error
  }

  const getCustomerStats = async (id: string) => {
    const { data: plans } = await supabase
      .from('plans')
      .select('id')
      .eq('customer_id', id)

    const { data: times } = await supabase
      .from('time_entries')
      .select('net_hours')
      .eq('customer_id', id)

    const totalShifts = plans?.length || 0
    const totalHours = times?.reduce((sum: number, t: any) => sum + (t.net_hours || 0), 0) || 0

    return { totalShifts, totalHours }
  }

  return { 
    customers, 
    loading, 
    addCustomer, 
    updateCustomer, 
    toggleStatus, 
    deleteCustomer, 
    getCustomerStats, 
    refresh: fetchCustomers 
  }
}
