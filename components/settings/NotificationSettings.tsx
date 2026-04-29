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
import { useTranslation } from '@/lib/i18n'

export function NotificationSettings({ initialSettings }: { initialSettings: any }) {
  const [settings, setSettings] = useState(initialSettings)
  const [isSaving, setIsSaving] = useState(false)
  const { locale } = useTranslation()
  const L = (de: string, en: string) => locale === 'de' ? de : en

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
      toast.success(L('Benachrichtigungseinstellungen gespeichert', 'Notification preferences updated'))
    } catch {
      toast.error(L('Einstellungen konnten nicht gespeichert werden', 'Failed to save preferences'))
    } finally {
      setIsSaving(false)
    }
  }

  const channels = [
    { id: 'email_enabled', label: L('E-Mail-Benachrichtigungen', 'Email Notifications'), desc: L('Updates per Firmen-E-Mail erhalten.', 'Receive updates via company email.'), icon: Mail, color: 'text-blue-500' },
    { id: 'whatsapp_enabled', label: L('WhatsApp-Hinweise', 'WhatsApp Alerts'), desc: L('Echtzeit-Updates via Twilio WhatsApp.', 'Real-time updates via Twilio WhatsApp.'), icon: MessageSquare, color: 'text-emerald-500' },
    { id: 'push_enabled', label: L('In-App-Hinweise', 'In-App Alerts'), desc: L('Visuelle Markierungen in der Seitenleiste.', 'Visual markers in the dashboard sidebar.'), icon: Bell, color: 'text-amber-500' },
  ]

  const alerts = [
    { id: 'alert_new_lead', label: L('Neue Anfrage erstellt', 'New Lead Created'), desc: L('Wenn ein Kunde eine Anfrage stellt.', 'When a customer submits an inquiry.') },
    { id: 'alert_job_completed', label: L('Auftrag abgeschlossen', 'Job Completed'), desc: L('Wenn ein Mitarbeiter eine Aufgabe erledigt.', 'When a technician finishes a task.') },
    { id: 'alert_low_credits', label: L('Niedriges Guthaben', 'Low Credits Warning'), desc: L('Wenn der Kontostand unter 50 € fällt.', 'When system balance falls below 50€.') },
    { id: 'alert_negative_review', label: L('Negative Bewertung', 'Negative Review'), desc: L('Wenn ein Auftrag 3 Sterne oder weniger erhält.', 'When a job receives 3 stars or less.') },
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
              {L('Ereignisauslöser', 'Event Triggers')}
           </CardTitle>
           <CardDescription>{L('Wählen Sie aus, welche Ereignisse eine Systembenachrichtigung auslösen sollen.', 'Select which events should trigger a system notification.')}</CardDescription>
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
            <Link href="/dashboard/settings">{L('Abbrechen', 'Cancel')}</Link>
         </Button>
         <Button
            className="h-12 px-12 rounded-xl font-black bg-zinc-900 text-white hover:bg-zinc-800 gap-2 shadow-xl shadow-zinc-200"
            onClick={handleSave}
            disabled={isSaving}
         >
            {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
            {L('Einstellungen speichern', 'Save Preferences')}
         </Button>
      </div>
    </div>
  )
}
