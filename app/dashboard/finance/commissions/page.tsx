import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { withTimeout } from '@/lib/supabase/with-timeout'
import { CommissionsList } from '@/components/finance/CommissionsList'
import { Layers, ChevronRight } from 'lucide-react'
import Link from 'next/link'

export default async function CommissionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await withTimeout(
    supabase.auth.getUser(),
    5000,
    { data: { user: null }, error: null as any }
  )
  if (!user) redirect('/auth/login')

  const { data: technicians } = await withTimeout(
    supabase
      .from('technicians')
      .select(`
        id,
        name,
        jobs(id, total_price, status, commission_paid, completed_at)
      `)
      .eq('is_active', true)
      .returns<any>() as any,
    15000,
    { data: [] as any[], error: null }
  )

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/dashboard" className="hover:text-primary transition-colors">Dashboard</Link>
        <ChevronRight className="h-4 w-4" />
        <Link href="/dashboard/finance" className="hover:text-primary transition-colors">Finance</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium">Commissions</span>
      </nav>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-border/50">
        <div className="space-y-2">
          <h1 className="text-4xl font-black tracking-tight flex items-center gap-3">
             <div className="h-10 w-10 flex items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
                <Layers className="h-6 w-6" />
             </div>
             Commissions Hub
          </h1>
          <p className="text-muted-foreground font-medium">Track earnings, calculate payouts, and manage technician/partner commissions.</p>
        </div>
      </div>

      <CommissionsList initialData={technicians || []} />
    </div>
  )
}
