import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { NotificationSettings } from '@/components/settings/NotificationSettings'
import { Bell, ChevronRight } from 'lucide-react'
import Link from 'next/link'

export default async function NotificationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: settings } = await supabase
    .from('company_settings')
    .select('notification_preferences')
    .single()

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/dashboard" className="hover:text-primary transition-colors">Dashboard</Link>
        <ChevronRight className="h-4 w-4" />
        <Link href="/dashboard/settings" className="hover:text-primary transition-colors">Settings</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium">Notifications</span>
      </nav>

      <div className="space-y-2">
        <h1 className="text-4xl font-black tracking-tight flex items-center gap-3">
           <div className="h-10 w-10 flex items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
              <Bell className="h-6 w-6" />
           </div>
           Notification Settings
        </h1>
        <p className="text-muted-foreground font-medium">Configure how and when your team and customers receive alerts.</p>
      </div>

      <NotificationSettings initialData={settings?.notification_preferences || {}} />
    </div>
  )
}
