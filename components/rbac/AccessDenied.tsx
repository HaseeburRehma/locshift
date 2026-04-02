'use client'

import { Lock, LogOut, ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { usePermissions } from '@/lib/rbac/usePermissions'

export function AccessDenied() {
  const router = useRouter()
  const { role } = usePermissions()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-6 text-center">
      <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive mb-6">
        <Lock className="h-8 w-8" />
      </div>
      <h1 className="text-2xl font-bold mb-2">Zugriff verweigert</h1>
      <p className="text-muted-foreground max-w-xs mb-8">
        Sie haben keine Berechtigung für diesen Bereich. Ihre aktuelle Rolle ist: <span className="font-semibold text-foreground uppercase tracking-wider text-xs">{role}</span>.
        Bitte kontaktieren Sie einen Administrator, falls dies ein Fehler ist.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
        <Button variant="outline" className="flex-1" onClick={() => router.back()}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          Zurück
        </Button>
        <Button variant="ghost" className="flex-1" onClick={handleLogout}>
          <LogOut className="h-4 w-4 mr-2" />
          Abmelden
        </Button>
      </div>
    </div>
  )
}

export function AccessDeniedInline() {
  return (
    <div className="flex flex-col items-center justify-center p-8 border rounded-lg bg-muted/30 text-center">
      <Lock className="h-6 w-6 text-muted-foreground mb-4" />
      <p className="text-sm font-medium">Inhalt eingeschränkt</p>
      <p className="text-xs text-muted-foreground">Keine Berechtigung</p>
    </div>
  )
}
