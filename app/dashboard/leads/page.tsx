import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { LeadsView } from '@/components/leads/LeadsView'
import { CreateLeadButton } from '@/components/leads/CreateLeadButton'
import { Users } from 'lucide-react'

export default async function LeadsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: leads, error } = await supabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return (
      <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
        Failed to load leads: {error.message}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Users className="h-4 w-4" />
          <span className="text-sm">{leads?.length ?? 0} leads</span>
        </div>
        <CreateLeadButton />
      </div>

      {/* Interactive table / kanban view */}
      <LeadsView leads={leads ?? []} />
    </div>
  )
}
