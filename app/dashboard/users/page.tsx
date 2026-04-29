import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { withTimeout } from '@/lib/supabase/with-timeout'
import { UserManagementPanel } from '@/components/dashboard/user-management-panel'
import { Shield, ChevronRight } from 'lucide-react'
import Link from 'next/link'

export default async function UsersManagementPage() {
  const supabase = await createClient()
  const { data: { user } } = await withTimeout(
    supabase.auth.getUser(),
    8000,
    { data: { user: null }, error: null as any }
  )
  if (!user) redirect('/login')

  return (
    <div className="space-y-8 pb-10">
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/dashboard" className="hover:text-primary transition-colors">Übersicht</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium">Benutzerverwaltung</span>
      </nav>

      <div className="space-y-2">
        <h1 className="text-4xl font-black tracking-tight flex items-center gap-3">
           <div className="h-10 w-10 flex items-center justify-center rounded-2xl bg-purple-100 text-purple-600">
              <Shield className="h-6 w-6" />
           </div>
           Plattform-Benutzer
        </h1>
        <p className="text-muted-foreground font-medium">Rollen und Berechtigungen für Ihre gesamte Belegschaft und Partner verwalten.</p>
      </div>

      <UserManagementPanel />
    </div>
  )
}
