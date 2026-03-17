import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { NewTechnicianForm } from '@/components/technicians/NewTechnicianForm'
import { Users, ChevronRight } from 'lucide-react'
import Link from 'next/link'

export default async function NewTechnicianPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  return (
    <div className="space-y-8 pb-20">
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/dashboard" className="hover:text-primary transition-colors">Dashboard</Link>
        <ChevronRight className="h-4 w-4" />
        <Link href="/dashboard/technicians" className="hover:text-primary transition-colors">Technicians</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium">New Technician</span>
      </nav>

      <div className="space-y-2">
        <h1 className="text-4xl font-black tracking-tight flex items-center gap-3">
           <div className="h-10 w-10 flex items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
              <Users className="h-6 w-6" />
           </div>
           Add New Technician
        </h1>
        <p className="text-muted-foreground font-medium">Capture profile details and assign default service areas.</p>
      </div>

      <div className="max-w-4xl">
        <NewTechnicianForm />
      </div>
    </div>
  )
}
