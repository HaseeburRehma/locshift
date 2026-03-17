import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { IntegrationsList } from '@/components/settings/IntegrationsList'
import { Zap, ChevronRight } from 'lucide-react'
import Link from 'next/link'

export default async function IntegrationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Fetch existing integration configs
  const { data: configs } = await supabase
    .from('integration_configs')
    .select('*')

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/dashboard" className="hover:text-primary transition-colors">Dashboard</Link>
        <ChevronRight className="h-4 w-4" />
        <Link href="/dashboard/settings" className="hover:text-primary transition-colors">Settings</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium">Integrations</span>
      </nav>

      <div className="space-y-2">
        <h1 className="text-4xl font-black tracking-tight flex items-center gap-3">
           <div className="h-10 w-10 flex items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
              <Zap className="h-6 w-6" />
           </div>
           Integrations Hub
        </h1>
        <p className="text-muted-foreground font-medium">Connect your Operations Center with third-party infrastructure.</p>
      </div>

      <IntegrationsList initialData={configs || []} />
    </div>
  )
}
