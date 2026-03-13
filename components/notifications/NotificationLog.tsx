'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatRelative } from 'date-fns'
import { de } from 'date-fns/locale'
import { Message } from '@/lib/types'
import { Mail, MessageCircle, Smartphone, Calendar, ArrowRight, ArrowLeft } from 'lucide-react'

export function NotificationLog({ messages }: { messages: Message[] }) {
  const getIcon = (channel: string) => {
    switch(channel) {
      case 'email': return <Mail className="w-4 h-4 text-blue-500" />
      case 'whatsapp': return <MessageCircle className="w-4 h-4 text-green-500" />
      case 'sms': return <Smartphone className="w-4 h-4 text-orange-500" />
      case 'calendar': return <Calendar className="w-4 h-4 text-purple-500" />
      default: return <Mail className="w-4 h-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'sent':
      case 'delivered': return 'bg-green-500'
      case 'pending': return 'bg-yellow-500'
      case 'failed': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="text-lg">Notifications Sent</CardTitle>
        <CardDescription>History of all alerts for this job</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="text-sm text-muted-foreground italic p-4 text-center border rounded-lg bg-muted/20">
            Noch keine Benachrichtigungen gesendet.
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className="relative pl-6 pb-4 border-l last:border-0 last:pb-0 border-muted">
                <div className={`absolute -left-1.5 top-1.5 w-3 h-3 rounded-full border-2 border-background ${getStatusColor(msg.status)}`} />
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    {getIcon(msg.channel)}
                    <span className="text-sm font-semibold capitalize">{msg.channel}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {msg.created_at ? formatRelative(new Date(msg.created_at), new Date(), { locale: de }) : ''}
                  </span>
                </div>
                
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className={`text-[10px] uppercase h-5 px-1.5 ${msg.direction === 'outbound' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-gray-50 text-gray-700 border-gray-200'}`}>
                    {msg.direction === 'outbound' ? <ArrowRight className="w-3 h-3 mr-1" /> : <ArrowLeft className="w-3 h-3 mr-1" />}
                    {msg.direction}
                  </Badge>
                  <Badge variant="secondary" className="text-[10px] uppercase h-5 px-1.5 font-normal">
                    {msg.status}
                  </Badge>
                </div>

                <div className="text-sm bg-muted/40 p-3 rounded-md border text-muted-foreground line-clamp-3 hover:line-clamp-none transition-all">
                  {msg.content}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
