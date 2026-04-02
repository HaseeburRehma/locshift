import { createClient } from '@/lib/supabase/client'
import { RealtimeChannel } from '@supabase/supabase-js'

/**
 * Singleton RealtimeManager — prevents duplicate Supabase channel subscriptions.
 * One instance per browser session. Import `realtimeManager` wherever needed.
 */
class RealtimeManager {
  private channels: Map<string, RealtimeChannel> = new Map()
  private supabase = createClient()

  subscribe(
    key: string,
    table: string,
    filter: string | null,
    callback: (payload: any) => void
  ) {
    if (this.channels.has(key)) return // Prevent duplicate subscriptions

    const channel = this.supabase
      .channel(key)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table,
        ...(filter ? { filter } : {}),
      }, callback)
      .subscribe()

    this.channels.set(key, channel)
  }

  unsubscribe(key: string) {
    const channel = this.channels.get(key)
    if (channel) {
      this.supabase.removeChannel(channel)
      this.channels.delete(key)
    }
  }

  unsubscribeAll() {
    this.channels.forEach((_, key) => this.unsubscribe(key))
  }
}

export const realtimeManager = new RealtimeManager()
