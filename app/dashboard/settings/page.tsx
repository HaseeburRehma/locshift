import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Settings, Bell, Lock, Globe } from 'lucide-react'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const settings = [
    {
      icon: Bell,
      title: 'Benachrichtigungen',
      description: 'E-Mail- und Push-Benachrichtigungen verwalten',
    },
    {
      icon: Lock,
      title: 'Sicherheit',
      description: 'Passwort ändern und Zwei-Faktor-Authentifizierung',
    },
    {
      icon: Globe,
      title: 'Sprache & Region',
      description: 'Sprache, Zeitzone und Datumsformat',
    },
  ]

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">
          Angemeldet als <span className="font-medium text-foreground">{user.email}</span>
        </p>
      </div>

      <div className="grid gap-4">
        {settings.map(({ icon: Icon, title, description }) => (
          <Card key={title} className="hover:shadow-sm transition-shadow cursor-pointer">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                {title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
