'use client'

import React, { useState } from 'react'
import { Switch } from '@/components/ui/switch'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useTranslation } from '@/lib/i18n'

interface NotificationToggleProps {
  initialEnabled: boolean
  userId: string
}

export function NotificationToggle({ initialEnabled, userId }: NotificationToggleProps) {
  const [enabled, setEnabled] = useState(initialEnabled)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()
  const { locale } = useTranslation()
  const L = (de: string, en: string) => locale === 'de' ? de : en

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
      
      toast.success(checked ? L('Benachrichtigungen aktiviert', 'Notifications enabled') : L('Benachrichtigungen deaktiviert', 'Notifications disabled'))
    } catch (error: any) {
      console.error('Error updating notifications:', error)
      setEnabled(!checked)
      toast.error(L('Einstellungen konnten nicht gespeichert werden', 'Failed to update preferences'))
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
