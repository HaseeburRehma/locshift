'use client'

import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AlertCircle, Loader2, Send, MessageSquare } from 'lucide-react'
import { toast } from 'sonner'
import { sendMessage } from '@/app/actions/leads'

// ─── Schema ───────────────────────────────────────────────────────────────────

const SendSchema = z.object({
  channel: z.enum(['whatsapp', 'sms', 'email']),
  content: z.string().min(10, 'Message must be at least 10 characters'),
})

type SendValues = z.infer<typeof SendSchema>

const CHANNELS: { value: 'whatsapp' | 'sms' | 'email'; label: string; badge: string }[] = [
  { value: 'whatsapp', label: 'WhatsApp', badge: 'bg-green-100 text-green-700 border-green-200' },
  { value: 'sms', label: 'SMS', badge: 'bg-blue-100 text-blue-700 border-blue-200' },
  { value: 'email', label: 'Email', badge: 'bg-gray-100 text-gray-700 border-gray-200' },
]

// ─── Message Bubble ───────────────────────────────────────────────────────────

interface MessageBubbleProps {
  direction: 'inbound' | 'outbound'
  channel: 'whatsapp' | 'sms' | 'email' | 'phone'
  content: string
  sentAt: string | null
}

function MessageBubble({ direction, channel, content, sentAt }: MessageBubbleProps) {
  const ch = CHANNELS.find((c) => c.value === channel)
  const isOutbound = direction === 'outbound'
  const timeStr = sentAt
    ? new Date(sentAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
    : ''

  return (
    <div className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] space-y-1`}>
        <div
          className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
            isOutbound
              ? 'bg-primary text-primary-foreground rounded-br-sm'
              : 'bg-muted text-foreground rounded-bl-sm'
          }`}
        >
          {content}
        </div>
        <div className={`flex items-center gap-1.5 ${isOutbound ? 'justify-end' : 'justify-start'}`}>
          {ch && (
            <Badge variant="outline" className={`text-[10px] h-4 px-1.5 ${ch.badge}`}>
              {ch.label}
            </Badge>
          )}
          {timeStr && (
            <span className="text-[10px] text-muted-foreground">{timeStr}</span>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface MessageHistoryEntry {
  id: string
  direction: 'inbound' | 'outbound'
  channel: 'whatsapp' | 'sms' | 'email' | 'phone'
  content: string
  sent_at: string | null
}

interface SendMessageFormProps {
  leadId: string
  jobId?: string
  messages: MessageHistoryEntry[]
}

export function SendMessageForm({ leadId, jobId, messages }: SendMessageFormProps) {
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<SendValues>({
    resolver: zodResolver(SendSchema),
    defaultValues: { channel: 'email', content: '' },
  })

  const channelValue = watch('channel')

  const onSubmit = (values: SendValues) => {
    setServerError(null)
    startTransition(async () => {
      const result = await sendMessage({
        leadId,
        jobId,
        channel: values.channel,
        content: values.content,
      })

      if (result.success) {
        toast.success('Message sent!')
        reset({ channel: values.channel, content: '' })
      } else {
        setServerError(result.error ?? 'Failed to send message')
      }
    })
  }

  return (
    <div className="space-y-4">
      {/* Message history */}
      <div className="space-y-3 max-h-64 overflow-y-auto px-1">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-2">
            <MessageSquare className="h-8 w-8 opacity-30" />
            <p className="text-sm">No messages yet</p>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              direction={msg.direction}
              channel={msg.channel}
              content={msg.content}
              sentAt={msg.sent_at}
            />
          ))
        )}
      </div>

      {/* Send form */}
      <div className="border-t border-border pt-4">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          {/* Channel selector */}
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground shrink-0">Via:</Label>
            <Select
              value={channelValue}
              onValueChange={(v) => setValue('channel', v as SendValues['channel'])}
            >
              <SelectTrigger className="h-8 text-xs w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CHANNELS.map((ch) => (
                  <SelectItem key={ch.value} value={ch.value} className="text-xs">
                    {ch.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Content */}
          <Textarea
            placeholder="Type your message... (min. 10 characters)"
            className="resize-none h-20 text-sm"
            {...register('content')}
          />
          {errors.content && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {errors.content.message}
            </p>
          )}

          {serverError && (
            <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/10 p-2.5 rounded-lg border border-destructive/20">
              <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>{serverError}</span>
            </div>
          )}

          <Button type="submit" size="sm" className="w-full gap-2" disabled={isPending}>
            {isPending ? (
              <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Sending...</>
            ) : (
              <><Send className="h-3.5 w-3.5" /> Send Message</>
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}
