'use client'

import React, { useState } from 'react'
import { Switch } from '@/components/ui/switch'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface NotificationToggleProps {
  initialEnabled: boolean
  userId: string
}

export function NotificationToggle({ initialEnabled, userId }: NotificationToggleProps) {
  const [enabled, setEnabled] = useState(initialEnabled)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const handleToggle = async (checked: boolean) => {
    setLoading(true)
    // Optimistic UI
    setEnabled(checked)

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ notifications_enabled: checked })
        .eq('id', userId)

      if (error) throw error
      
      toast.success(checked ? 'Notifications enabled' : 'Notifications disabled')
    } catch (error: any) {
      console.error('Error updating notifications:', error)
      // Rollback
      setEnabled(!checked)
      toast.error('Failed to update preferences')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Switch 
      checked={enabled} 
      onCheckedChange={handleToggle} 
      disabled={loading}
    />
  )
}
