'use client'

import { Lock, LogOut, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { usePermissions } from '@/lib/rbac/usePermissions'

export default function UnauthorizedPage() {
  const router = useRouter()
  const { role } = usePermissions()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-destructive/10 text-destructive mb-2 shadow-sm">
          <Lock className="h-10 w-10" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Keine Berechtigung</h1>
          <p className="text-muted-foreground text-lg">
            Sie haben keine Berechtigung für diesen Bereich.
          </p>
        </div>

        <div className="bg-muted/50 p-4 rounded-xl border border-border/50 text-sm">
          <p className="text-muted-foreground mb-1">Ihre aktuelle Rolle:</p>
          <span className="font-bold text-foreground uppercase tracking-widest">{role}</span>
        </div>

        <div className="flex flex-col gap-3 pt-4">
          <Button size="lg" className="w-full text-base font-semibold" onClick={() => router.push('/')}>
            <Home className="h-5 w-5 mr-2" />
            Zur Startseite
          </Button>
          
          <div className="grid grid-cols-2 gap-3">
            <Button size="lg" variant="outline" className="w-full" onClick={() => router.back()}>
              Zurück
            </Button>
            <Button size="lg" variant="ghost" className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Abmelden
            </Button>
          </div>
        </div>

        <p className="text-xs text-muted-foreground pt-8">
          Falls Sie glauben, dass dies ein Fehler ist, kontaktieren Sie bitte Ihren Administrator.
        </p>
      </div>
    </div>
  )
}
