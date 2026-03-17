import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Users, ChevronRight, UserPlus, Plus } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { withTimeout } from '@/lib/supabase/with-timeout'

export default async function TechniciansPage() {
   const supabase = await createClient()
   const { data: { user } } = await withTimeout(
      supabase.auth.getUser(),
      5000,
      { data: { user: null }, error: null } as any
   )
   if (!user) redirect('/auth/login')

   const { data: techs } = await withTimeout(
      supabase
         .from('technicians')
         .select('*, jobs:jobs(count)')
         .order('name') as any,
      8000,
      { data: [] } as any
   )

   return (
      <div className="space-y-8 pb-10">
         <nav className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/dashboard" className="hover:text-primary transition-colors">Dashboard</Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground font-medium">Team Roster</span>
         </nav>

         <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-border/50">
            <div className="space-y-2">
               <h1 className="text-4xl font-black tracking-tight flex items-center gap-3">
                  <div className="h-10 w-10 flex items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                     <Users className="h-6 w-6" />
                  </div>
                  Technicians
               </h1>
               <p className="text-muted-foreground font-medium">Manage your field team, skills, and service area assignments.</p>
            </div>

            <Button className="rounded-xl font-black bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-lg shadow-emerald-100" asChild>
               <Link href="/dashboard/technicians/new">
                  <UserPlus className="h-4 w-4" /> Add Technician
               </Link>
            </Button>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {techs?.map((tech: any) => (
               <div key={tech.id} className="relative group">
                  <Link href={`/dashboard/technicians/${tech.id}`}>
                     <Card className="border-border/50 shadow-sm hover:border-primary/20 transition-all rounded-[2rem] overflow-hidden">
                        <CardContent className="p-8">
                           <div className="flex justify-between items-start mb-6">
                              <div className="h-12 w-12 rounded-2xl bg-zinc-100 flex items-center justify-center text-zinc-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                 <Users className="h-6 w-6" />
                              </div>
                              <Badge variant={tech.is_active ? "outline" : "secondary"} className={cn(
                                 "rounded-full px-3 py-1 font-black text-[10px] uppercase tracking-widest",
                                 tech.is_active ? "border-emerald-500 text-emerald-600 bg-emerald-50" : "bg-zinc-100 text-zinc-500"
                              )}>
                                 {tech.is_active ? "Active" : "Inactive"}
                              </Badge>
                           </div>
                           <div className="space-y-1">
                              <h3 className="text-xl font-bold">{tech.name}</h3>
                              <p className="text-xs text-muted-foreground font-medium">{tech.role || 'Service Technician'}</p>
                           </div>

                           <div className="mt-6 pt-6 border-t border-zinc-100 flex justify-between items-center">
                              <div className="flex flex-col">
                                 <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Jobs</span>
                                 <span className="text-lg font-black">{tech.jobs?.[0]?.count || 0}</span>
                              </div>
                              <div className="flex flex-col text-right">
                                 <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Rating</span>
                                 <span className="text-lg font-black">4.8</span>
                              </div>
                           </div>
                        </CardContent>
                     </Card>
                  </Link>

                  <Button
                     variant="outline"
                     size="sm"
                     className="absolute top-4 right-4 h-8 w-8 p-0 rounded-full bg-white/80 backdrop-blur-sm border-red-100 text-red-600 hover:text-red-700 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                     onClick={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (!confirm('Are you sure you want to (soft) delete this technician?')) return;
                        const res = await fetch(`/api/technicians/${tech.id}`, { method: 'DELETE' });
                        if (res.ok) window.location.reload();
                        else alert('Failed to delete');
                     }}
                  >
                     <Plus className="h-4 w-4 rotate-45" />
                  </Button>
               </div>
            ))}
         </div>
      </div>
   )
}

function cn(...classes: string[]) {
   return classes.filter(Boolean).join(' ')
}
