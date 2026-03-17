import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { LeadsTable } from '@/components/leads/LeadsTable'
import { CreateLeadButton } from '@/components/leads/CreateLeadButton'
import { UserPlus, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { withTimeout } from '@/lib/supabase/with-timeout'

export default async function LeadsPage() {
  const supabase = await createClient()
  const { data: { user } } = await withTimeout(
    supabase.auth.getUser(),
    5000,
    { data: { user: null }, error: null } as any
  )
  if (!user) redirect('/auth/login')

  const { data: leads } = await withTimeout(
    supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false }) as any,
    8000,
    { data: [] } as any
  )

  return (
    <div className="space-y-8 pb-10">
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/dashboard" className="hover:text-primary transition-colors">Dashboard</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium">Leads Management</span>
      </nav>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-border/50">
        <div className="space-y-2">
          <h1 className="text-4xl font-black tracking-tight flex items-center gap-3">
             <div className="h-10 w-10 flex items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
                <UserPlus className="h-6 w-6" />
             </div>
             Leads
          </h1>
          <p className="text-muted-foreground font-medium">Capture, qualify, and manage your incoming service inquiries.</p>
        </div>
        
        <CreateLeadButton />
      </div>

      <LeadsTable leads={leads || []} />
    </div>
  )
}
