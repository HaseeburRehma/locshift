import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Users, 
  ChevronRight, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Star, 
  TrendingUp,
  Clock,
  Briefcase,
  Edit2
} from 'lucide-react'
import Link from 'next/link'
import { TechnicianPerformance } from '@/components/technicians/TechnicianPerformance'
import { EditTechnicianDrawer } from '@/components/technicians/EditTechnicianDrawer'

export default async function TechnicianDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: technician, error } = await supabase
    .from('technicians')
    .select('*, jobs:jobs(count)')
    .eq('id', id)
    .single()

  if (error || !technician) {
    return notFound()
  }

  return (
    <div className="space-y-8 pb-20">
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/dashboard" className="hover:text-primary transition-colors">Dashboard</Link>
        <ChevronRight className="h-4 w-4" />
        <Link href="/dashboard/technicians" className="hover:text-primary transition-colors">Technicians</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium">{technician.name}</span>
      </nav>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-border/50">
        <div className="flex items-center gap-6">
          <div className="h-20 w-20 rounded-[2rem] bg-emerald-100 text-emerald-600 flex items-center justify-center">
            <Users className="h-10 w-10" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-4xl font-black tracking-tight">{technician.name}</h1>
              <Badge className={technician.is_active ? "bg-emerald-500" : "bg-zinc-300"}>
                {technician.is_active ? "Active" : "Offline"}
              </Badge>
            </div>
            <p className="text-muted-foreground font-medium flex items-center gap-2">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              <span className="font-bold text-zinc-900">4.8 Rating</span>
              <span className="text-zinc-300">•</span>
              <span>{technician.role || 'Service Technician'}</span>
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
           <EditTechnicianDrawer technician={technician} />
           <Button variant="outline" className="rounded-xl font-bold gap-2">
              <Calendar className="h-4 w-4" /> Schedule Outage
           </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-border/50 rounded-3xl overflow-hidden shadow-sm">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Briefcase className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Jobs Completed</p>
                  <p className="text-2xl font-black">{technician.jobs?.[0]?.count || 0}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/50 rounded-3xl overflow-hidden shadow-sm">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Revenue Gen.</p>
                  <p className="text-2xl font-black">€1,240</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/50 rounded-3xl overflow-hidden shadow-sm">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Clock className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Response Time</p>
                  <p className="text-2xl font-black">34m</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-border/50 rounded-[2.5rem] shadow-sm overflow-hidden">
             <CardHeader className="p-8 pb-4">
                <CardTitle className="text-xl font-bold">Performance Analytics</CardTitle>
                <p className="text-xs text-muted-foreground font-medium">Monthly efficiency and customer satisfaction trends.</p>
             </CardHeader>
             <CardContent className="p-8 pt-0">
                <TechnicianPerformance technicianId={technician.id} />
             </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
           <Card className="border-border/50 rounded-[2.5rem] shadow-sm overflow-hidden">
              <CardHeader className="p-8 pb-4">
                 <CardTitle className="text-xl font-bold">Contact Details</CardTitle>
              </CardHeader>
              <CardContent className="p-8 pt-0 space-y-6">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-zinc-50 border flex items-center justify-center text-zinc-400">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Email Address</p>
                    <p className="font-bold">{technician.email || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-zinc-50 border flex items-center justify-center text-zinc-400">
                    <Phone className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Phone Number</p>
                    <p className="font-bold">{technician.phone || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-zinc-50 border flex items-center justify-center text-zinc-400">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Base Location</p>
                    <p className="font-bold">{technician.address || 'Berlin, DE'}</p>
                  </div>
                </div>
              </CardContent>
           </Card>

           <Card className="bg-zinc-900 border-none text-white rounded-[2.5rem] overflow-hidden shadow-2xl">
              <CardHeader className="p-8">
                 <CardTitle className="text-xl font-bold">Skills & Certs</CardTitle>
              </CardHeader>
              <CardContent className="p-8 pt-0">
                 <div className="flex flex-wrap gap-2">
                    {['Electrician', 'HVAC', 'Smart Home', 'Security'].map(skill => (
                       <Badge key={skill} variant="secondary" className="bg-zinc-800 border-zinc-700 text-zinc-300 font-bold px-3 py-1">
                          {skill}
                       </Badge>
                    ))}
                 </div>
              </CardContent>
           </Card>
        </div>
      </div>
    </div>
  )
}
