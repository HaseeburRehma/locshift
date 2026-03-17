import { createClient } from '@/lib/supabase/server'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ExternalLink, Phone, MessageSquare, Search } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'

export default async function MyLeadsPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('partner_id')
    .eq('id', user.id)
    .single()

  const { data: partnerLeads } = await supabase
    .from('partner_leads')
    .select('*, leads(*)')
    .eq('partner_id', profile?.partner_id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-purple-950">Meine Leads</h1>
        <p className="text-muted-foreground">Verwalten Sie Ihre gekauften und zugewiesenen Leads</p>
      </div>

      <div className="border border-purple-100 rounded-3xl bg-white overflow-hidden shadow-sm shadow-purple-200/20">
        <Table>
          <TableHeader className="bg-purple-50/50">
            <TableRow className="border-purple-100">
              <TableHead className="font-bold text-purple-900">Kunde</TableHead>
              <TableHead className="font-bold text-purple-900">Service</TableHead>
              <TableHead className="font-bold text-purple-900 text-center">Status</TableHead>
              <TableHead className="font-bold text-purple-900">Gekauft am</TableHead>
              <TableHead className="font-bold text-purple-900 text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {partnerLeads?.map((pl) => (
              <TableRow key={pl.id} className="border-purple-50 hover:bg-purple-50/30 transition-colors">
                <TableCell>
                  <div className="font-bold text-purple-950">{pl.leads?.name}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {pl.leads?.phone}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="bg-white border-purple-200 text-purple-700">{pl.leads?.service_type}</Badge>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant={pl.status === 'converted' ? 'default' : 'secondary'} className={pl.status === 'converted' ? 'bg-green-600' : ''}>
                    {pl.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm font-medium">
                  {format(new Date(pl.created_at), 'dd.MM.yyyy')}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-purple-700 hover:text-purple-900 hover:bg-purple-100" asChild>
                      <a href={`tel:${pl.leads?.phone}`}>
                        <Phone className="h-4 w-4" />
                      </a>
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 border-purple-200 text-purple-700 hover:bg-purple-50" asChild>
                      <Link href={`/partner/my-leads/${pl.id}`}>
                        <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                        Details
                      </Link>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {(!partnerLeads || partnerLeads.length === 0) && (
              <TableRow>
                <TableCell colSpan={5} className="h-40 text-center text-muted-foreground">
                  Bisher keine Leads vorhanden.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
