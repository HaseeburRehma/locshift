import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PartnerConfigPanel } from '@/components/dashboard/partner-config-panel'
import { Handshake, ChevronRight } from 'lucide-react'
import Link from 'next/link'

export default async function PartnersManagementPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  return (
    <div className="space-y-8 pb-10">
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/dashboard" className="hover:text-primary transition-colors">Dashboard</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium">Business Partners</span>
      </nav>

      <div className="space-y-2">
        <h1 className="text-4xl font-black tracking-tight flex items-center gap-3">
           <div className="h-10 w-10 flex items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
              <Handshake className="h-6 w-6" />
           </div>
           Marketplace Partners
        </h1>
        <p className="text-muted-foreground font-medium">B2B entities registered to purchase or receive service leads.</p>
      </div>

      <PartnerConfigPanel />
    </div>
  )
}
