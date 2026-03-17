import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Phone, Mail, MapPin, Calendar, Clock, ArrowLeft, CheckCircle2, MessageSquare } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { cn } from '@/lib/utils'

interface PageProps {
  params: { id: string }
}

export default async function PartnerLeadDetailPage({ params }: PageProps) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('partner_id')
    .eq('id', user.id)
    .single()

  const { data: pl } = await supabase
    .from('partner_leads')
    .select('*, leads(*)')
    .eq('id', params.id)
    .eq('partner_id', profile?.partner_id)
    .single()

  if (!pl || !pl.leads) {
    return notFound()
  }

  const { leads: lead } = pl

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="rounded-full" asChild>
          <Link href="/partner/my-leads">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-purple-950">{lead.name}</h1>
          <p className="text-muted-foreground">Lead-ID: {lead.id.substring(0, 8)}</p>
        </div>
        <div className="ml-auto flex gap-3">
          <Badge variant="outline" className="h-9 px-4 border-purple-200 text-purple-700 bg-purple-50 font-bold uppercase tracking-widest text-[10px]">
            {pl.status}
          </Badge>
          <Button className="bg-purple-600 hover:bg-purple-700 font-bold px-6">
            Status ändern
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Contact Details */}
          <Card className="rounded-3xl border-purple-50 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl">Kontaktinformationen</CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600 shrink-0">
                    <Phone className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Telefon</p>
                    <p className="text-lg font-bold text-purple-950">{lead.phone || 'Keine Angabe'}</p>
                    <Button variant="link" className="p-0 h-auto text-purple-600 font-bold" asChild>
                      <a href={`tel:${lead.phone}`}>Jetzt anrufen</a>
                    </Button>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600 shrink-0">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">E-Mail</p>
                    <p className="text-lg font-bold text-purple-950">{lead.email || 'Keine Angabe'}</p>
                    <Button variant="link" className="p-0 h-auto text-purple-600 font-bold" asChild>
                      <a href={`mailto:${lead.email}`}>E-Mail schreiben</a>
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600 shrink-0">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Adresse</p>
                    <p className="text-lg font-bold text-purple-950">
                      {lead.address}<br />
                      {lead.postcode} {lead.city}
                    </p>
                    <Button variant="link" className="p-0 h-auto text-purple-600 font-bold" asChild>
                      <a href={`https://maps.google.com/?q=${encodeURIComponent(`${lead.address}, ${lead.postcode} ${lead.city}`)}`} target="_blank">In Maps öffnen</a>
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Service Details */}
          <Card className="rounded-3xl border-purple-50 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl">Anfragedetails</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="p-4 rounded-2xl bg-muted/30 border border-dashed">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">Service-Typ</p>
                  <Badge className="bg-purple-600 text-sm py-1 px-4">{lead.service_type || 'Elektronik'}</Badge>
                </div>
                <div className="p-4 rounded-2xl bg-muted/30 border border-dashed">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">Dringlichkeit</p>
                  <Badge variant="outline" className="border-orange-500 text-orange-600 bg-orange-50 text-sm py-1 px-4">
                    {lead.urgency || 'Normal'}
                  </Badge>
                </div>
              </div>
              
              <div className="space-y-2">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Beschreibung</p>
                <div className="p-5 rounded-2xl bg-slate-50 border text-slate-700 leading-relaxed italic">
                  "{lead.description || 'Keine Beschreibung vorhanden.'}"
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          {/* Status Timeline */}
          <Card className="rounded-3xl border-purple-50 shadow-sm overflow-hidden">
            <CardHeader className="bg-purple-50/50">
              <CardTitle className="text-lg">Lead-Historie</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-6 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-purple-100">
                <TimelineItem 
                  title="Lead gekauft" 
                  date={format(new Date(pl.created_at), 'dd. MMM yyyy, HH:mm', { locale: de })}
                  icon={CheckCircle2}
                  active
                />
                <TimelineItem 
                  title="Eingang Bestätigt" 
                  date={format(new Date(lead.created_at), 'dd. MMM yyyy, HH:mm', { locale: de })}
                  icon={MessageSquare}
                />
              </div>
            </CardContent>
          </Card>

          {/* Action Card */}
          <Card className="rounded-3xl bg-purple-950 text-white border-none shadow-xl shadow-purple-900/40">
            <CardContent className="pt-8 space-y-6">
              <div className="text-center">
                <p className="text-purple-300 text-sm font-bold uppercase tracking-widest mb-2">Nächster Schritt</p>
                <h3 className="text-xl font-bold">Kunden kontaktieren</h3>
              </div>
              <Button className="w-full h-12 bg-white text-purple-950 hover:bg-purple-50 font-black rounded-2xl" size="lg" asChild>
                <a href={`tel:${lead.phone}`}>
                  <Phone className="h-5 w-5 mr-2" />
                  ANRUFEN
                </a>
              </Button>
              <div className="flex gap-4">
                <Button variant="ghost" className="flex-1 text-purple-200 hover:text-white hover:bg-white/10" asChild>
                  <a href={`mailto:${lead.email}`}>E-Mail</a>
                </Button>
                <Button variant="ghost" className="flex-1 text-purple-200 hover:text-white hover:bg-white/10">
                  Notiz
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function TimelineItem({ title, date, icon: Icon, active = false }: any) {
  return (
    <div className="flex gap-4 relative z-10">
      <div className={cn(
        "h-4 w-4 rounded-full border-2 border-white flex items-center justify-center shrink-0 mt-1",
        active ? "bg-purple-600 shadow-sm shadow-purple-400" : "bg-purple-200"
      )}>
      </div>
      <div>
        <h4 className={cn("text-sm font-bold", active ? "text-purple-900" : "text-muted-foreground")}>{title}</h4>
        <p className="text-[10px] text-muted-foreground font-medium uppercase">{date}</p>
      </div>
    </div>
  )
}


