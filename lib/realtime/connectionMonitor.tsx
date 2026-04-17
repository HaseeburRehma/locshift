'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '@/lib/i18n'

/**
 * Monitors Supabase Realtime connection status.
 * Shows a reconnection banner when the connection drops.
 */
export function useRealtimeConnection() {
  const [connected, setConnected] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const channel = supabase.channel('__connection-monitor__')
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') setConnected(true)
        if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setConnected(false)
        }
      })

    return () => { supabase.removeChannel(channel) }
  }, [])

  return connected
}

/**
 * Drop this anywhere in the layout to show a banner when Realtime drops.
 */
export function RealtimeConnectionBanner() {
  const connected = useRealtimeConnection()
  const { t } = useTranslation()

  if (connected) return null

  return (
    <div className="w-full bg-amber-500 text-white text-center text-sm py-1.5 font-semibold animate-in slide-in-from-top duration-300 shadow-sm flex-shrink-0">
      {t('realtime.reconnecting')}
    </div>
  )
}
