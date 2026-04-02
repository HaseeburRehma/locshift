import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Customer } from '@/lib/types'
import { useUser } from '@/lib/user-context'
import { sendNotification } from '@/lib/notifications/service'

export function useCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const { profile } = useUser()
  const supabase = createClient()

  useEffect(() => {
    if (!profile?.organization_id) return

    const fetchCustomers = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .order('name', { ascending: true })

      if (!error) setCustomers(data || [])
      setLoading(false)
    }

    fetchCustomers()

    const channel = supabase
      .channel('customers-realtime')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'customers', 
        filter: `organization_id=eq.${profile.organization_id}` 
      }, () => fetchCustomers())
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [profile?.organization_id])

  const addCustomer = async (customer: Partial<Customer>) => {
    if (!profile?.organization_id) return
    const { data, error } = await supabase
      .from('customers')
      .insert({ ...customer, organization_id: profile.organization_id })
      .select()
      .single()
    if (error) throw error

    // Notify all admins in the organization
    const { data: admins } = await supabase
      .from('profiles')
      .select('id')
      .eq('organization_id', profile.organization_id)
      .in('role', ['admin', 'administrator', 'Admin', 'Administrator'])

    if (admins) {
      await Promise.all(admins.map((admin: { id: string }) =>
        sendNotification({
          userId: admin.id,
          title: '🏢 New Customer Added',
          message: `A new customer "${customer.name}" has been added to your organization.`,
          module: 'customers',
          moduleId: data?.id
        })
      ))
    }
  }

  const deleteCustomer = async (id: string) => {
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', id)
    if (error) throw error
  }

  return { customers, loading, addCustomer, deleteCustomer }
}
