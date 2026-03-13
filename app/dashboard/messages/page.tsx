import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { AlertCircle, ArrowDownLeft, ArrowUpRight } from 'lucide-react'
import type { MessageRow } from '@/lib/types/database.types'

const channelLabels: Record<MessageRow['channel'], string> = {
  whatsapp: 'WhatsApp',
  sms: 'SMS',
  email: 'E-Mail',
  phone: 'Telefon',
}

const statusVariant: Record<MessageRow['status'], 'default' | 'secondary' | 'outline' | 'destructive'> = {
  pending: 'outline',
  sent: 'secondary',
  delivered: 'default',
  failed: 'destructive',
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('de-DE', {
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })

export default async function MessagesPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: messages, error } = await supabase
    .from('messages')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    return (
      <div className="flex items-center gap-2 text-destructive p-4 bg-destructive/10 rounded-lg">
        <AlertCircle className="h-4 w-4" />
        <span>Fehler beim Laden der Nachrichten: {error.message}</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">{messages?.length ?? 0} Nachrichten</p>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Richtung</TableHead>
              <TableHead className="hidden sm:table-cell">Kanal</TableHead>
              <TableHead>Inhalt</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden lg:table-cell">Datum</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(messages ?? []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  Keine Nachrichten vorhanden
                </TableCell>
              </TableRow>
            ) : (
              (messages as MessageRow[]).map((msg) => (
                <TableRow key={msg.id}>
                  <TableCell>
                    {msg.direction === 'inbound' ? (
                      <span className="flex items-center gap-1 text-sm text-blue-600">
                        <ArrowDownLeft className="h-3.5 w-3.5" /> Eingehend
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-sm text-emerald-600">
                        <ArrowUpRight className="h-3.5 w-3.5" /> Ausgehend
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant="outline" className="text-xs">
                      {channelLabels[msg.channel]}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <p className="truncate text-sm">{msg.content}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[msg.status]} className="capitalize text-xs">
                      {msg.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                    {formatDate(msg.created_at)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
