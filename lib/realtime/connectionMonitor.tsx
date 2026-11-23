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
    // A drop only counts after 5 s: page unloads and short network blips
    // close the channel for a moment and used to flash the banner on every
    // navigation (QA 23.11.).
    let timer: ReturnType<typeof setTimeout> | null = null
    let disposed = false
    const channel = supabase.channel('__connection-monitor__')
      .subscribe((status: string) => {
        if (disposed) return
        if (status === 'SUBSCRIBED') {
          if (timer) clearTimeout(timer)
          timer = null
          setConnected(true)
        }
        if ((status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') && !timer) {
          timer = setTimeout(() => {
            timer = null
            if (!disposed) setConnected(false)
          }, 5000)
        }
      })

    return () => {
      disposed = true
      if (timer) clearTimeout(timer)
      supabase.removeChannel(channel)
    }
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
