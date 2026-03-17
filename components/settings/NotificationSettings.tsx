'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { 
  Bell, 
  Mail, 
  MessageSquare, 
  Smartphone, 
  ShieldCheck, 
  Zap,
  Save,
  Loader2,
  ChevronRight
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import Link from 'next/link'

export function NotificationSettings({ initialSettings }: { initialSettings: any }) {
  const [settings, setSettings] = useState(initialSettings)
  const [isSaving, setIsSaving] = useState(false)

  const toggleSetting = (key: string) => {
    setSettings((prev: any) => ({ ...prev, [key]: !prev[key] }))
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const res = await fetch('/api/settings/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })
      if (!res.ok) throw new Error()
      toast.success('Notification preferences updated')
    } catch {
      toast.error('Failed to save preferences')
    } finally {
      setIsSaving(false)
    }
  }

  const channels = [
    { id: 'email_enabled', label: 'Email Notifications', desc: 'Receive updates via company email.', icon: Mail, color: 'text-blue-500' },
    { id: 'whatsapp_enabled', label: 'WhatsApp Alerts', desc: 'Real-time updates via Twilio WhatsApp.', icon: MessageSquare, color: 'text-emerald-500' },
    { id: 'push_enabled', label: 'In-App Alerts', desc: 'Visual markers in the dashboard sidebar.', icon: Bell, color: 'text-amber-500' },
  ]

  const alerts = [
    { id: 'alert_new_lead', label: 'New Lead Created', desc: 'When a customer submits an inquiry.' },
    { id: 'alert_job_completed', label: 'Job Completed', desc: 'When a technician finishes a task.' },
    { id: 'alert_low_credits', label: 'Low Credits Warning', desc: 'When system balance falls below 50€.' },
    { id: 'alert_negative_review', label: 'Negative Review', desc: 'When a job receives 3 stars or less.' },
  ]

  return (
    <div className="space-y-8">
      {/* Channels */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {channels.map((ch) => (
          <Card key={ch.id} className="border-border/50 shadow-sm rounded-3xl overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                 <div className={cn("p-3 rounded-2xl bg-zinc-50", ch.color)}>
                    <ch.icon className="h-5 w-5" />
                 </div>
                 <Switch checked={settings[ch.id]} onCheckedChange={() => toggleSetting(ch.id)} />
              </div>
              <h4 className="font-bold">{ch.label}</h4>
              <p className="text-xs text-muted-foreground mt-1">{ch.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/50 shadow-sm rounded-3xl overflow-hidden">
        <CardHeader className="bg-muted/30 border-b pb-4">
           <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Event Triggers
           </CardTitle>
           <CardDescription>Select which events should trigger a system notification.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
           <div className="divide-y divide-border/50">
              {alerts.map((alert) => (
                <div key={alert.id} className="flex items-center justify-between p-6 hover:bg-zinc-50 transition-colors">
                   <div className="space-y-0.5">
                      <p className="text-sm font-bold text-zinc-900">{alert.label}</p>
                      <p className="text-xs text-muted-foreground">{alert.desc}</p>
                   </div>
                   <Switch checked={settings[alert.id]} onCheckedChange={() => toggleSetting(alert.id)} />
                </div>
              ))}
           </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
         <Button variant="outline" className="h-12 px-8 rounded-xl font-bold border-border/50" asChild>
            <Link href="/dashboard/settings">Cancel</Link>
         </Button>
         <Button 
            className="h-12 px-12 rounded-xl font-black bg-zinc-900 text-white hover:bg-zinc-800 gap-2 shadow-xl shadow-zinc-200"
            onClick={handleSave}
            disabled={isSaving}
         >
            {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
            Save Preferences
         </Button>
      </div>
    </div>
  )
}
