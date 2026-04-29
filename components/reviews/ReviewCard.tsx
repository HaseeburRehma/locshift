'use client'

import { useState } from 'react'
import { useTranslation } from '@/lib/i18n'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { 
  Star, 
  MessageSquare, 
  User, 
  Wrench, 
  Eye, 
  EyeOff, 
  MoreVertical, 
  ShieldCheck, 
  CornerDownRight,
  Send,
  Loader2,
  Trash2
} from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'

interface ReviewCardProps {
  review: any
  onUpdate: (updates: any) => void
}

export function ReviewCard({ review, onUpdate }: ReviewCardProps) {
  const { locale } = useTranslation()
  const L = (de: string, en: string) => locale === 'de' ? de : en
  const [isResponding, setIsResponding] = useState(false)
  const [response, setResponse] = useState(review.admin_response || '')
  const [isLoading, setIsLoading] = useState(false)

  const handlePublishToggle = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/reviews/${review.id}/publish`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_published: !review.is_published })
      })
      if (!res.ok) throw new Error()
      onUpdate({ is_published: !review.is_published })
      toast.success(review.is_published ? L('Bewertung ausgeblendet', 'Review hidden') : L('Bewertung veröffentlicht', 'Review published'))
    } catch {
      toast.error(L('Sichtbarkeit konnte nicht aktualisiert werden', 'Failed to update visibility'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleResponseSubmit = async () => {
    if (!response.trim()) return
    setIsLoading(true)
    try {
      const res = await fetch(`/api/reviews/${review.id}/respond`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_response: response })
      })
      if (!res.ok) throw new Error()
      onUpdate({ admin_response: response, admin_response_at: new Date().toISOString() })
      setIsResponding(false)
      toast.success(L('Antwort gespeichert', 'Response saved'))
    } catch {
      toast.error(L('Antwort konnte nicht gespeichert werden', 'Failed to save response'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className={cn(
      "border-border/50 shadow-sm overflow-hidden group transition-all",
      !review.is_published && "opacity-75 grayscale-[0.5]"
    )}>
      <CardContent className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-600 font-bold border border-zinc-200">
              {review.customer_name?.[0] || 'C'}
            </div>
            <div>
              <h4 className="text-sm font-black text-zinc-900 flex items-center gap-2">
                {review.customer_name}
                {!review.is_published && <Badge variant="secondary" className="text-[8px] h-4 font-black uppercase tracking-widest bg-zinc-100 text-zinc-500">Hidden</Badge>}
              </h4>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">{formatDate(review.created_at)} • via {review.source}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-0.5 mr-2">
              {[1, 2, 3, 4, 5].map(s => (
                <Star key={s} className={cn("h-3.5 w-3.5", s <= review.rating ? "fill-amber-400 text-amber-400" : "text-zinc-200")} />
              ))}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-xl">
                <DropdownMenuItem className="gap-2 font-bold cursor-pointer" onClick={handlePublishToggle}>
                  {review.is_published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  {review.is_published ? L('Bewertung ausblenden', 'Hide Review') : L('Bewertung veröffentlichen', 'Publish Review')}
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2 font-bold cursor-pointer text-destructive focus:text-destructive">
                  <Trash2 className="h-4 w-4" />
                  {L('Bewertung löschen', 'Delete Review')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-4">
          <div className="p-4 bg-muted/30 rounded-2xl relative">
             {review.title && <h5 className="text-sm font-black mb-1">{review.title}</h5>}
             <p className="text-sm text-zinc-700 leading-relaxed italic">"{review.review_text}"</p>
          </div>

          <div className="flex flex-wrap items-center gap-6 pt-2">
             <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
               <Wrench className="h-3.5 w-3.5 text-primary" />
               {review.technician?.name || 'Assigned Tech'}
             </div>
             <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
               <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
               Job #{review.job?.id?.slice(0, 8)}
             </div>
          </div>
        </div>

        {/* Admin Response */}
        <div className="space-y-3 pt-2">
           {review.admin_response && !isResponding && (
             <div className="flex gap-3 pl-4 animate-in fade-in slide-in-from-left-2 duration-300">
                <CornerDownRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                <div className="flex-1 p-3 bg-blue-50/50 border border-blue-100 rounded-xl relative">
                   <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-1">{L('Unternehmensantwort', 'Company Response')}</p>
                   <p className="text-xs text-zinc-600 font-medium">"{review.admin_response}"</p>
                   <Button 
                    variant="ghost" 
                    size="sm" 
                    className="absolute top-1 right-1 h-6 px-2 text-[8px] font-black uppercase text-blue-600 hover:bg-blue-100 rounded-full"
                    onClick={() => setIsResponding(true)}
                   >
                     {L('Bearbeiten', 'Edit')}
                   </Button>
                </div>
             </div>
           )}

           {!review.admin_response && !isResponding && (
             <Button 
               variant="outline" 
               size="sm" 
               className="h-9 px-4 rounded-full text-[10px] font-black uppercase tracking-widest gap-2 ml-4 border-dashed border-primary/40 text-primary hover:bg-primary/5"
               onClick={() => setIsResponding(true)}
             >
               <MessageSquare className="h-3.5 w-3.5" />
               {L('Antwort hinzufügen', 'Add Response')}
             </Button>
           )}

           {isResponding && (
             <div className="flex flex-col gap-3 pl-4 animate-in slide-in-from-top-2 duration-300">
                <div className="flex gap-3">
                   <CornerDownRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                   <Textarea 
                     value={response}
                     onChange={(e) => setResponse(e.target.value)}
                     placeholder={L('Antwort an den Kunden eingeben...', 'Type your response to the customer...')}
                     className="min-h-[100px] rounded-xl text-xs bg-white border-primary/20 focus:ring-primary/10"
                   />
                </div>
                <div className="flex justify-end gap-2 pr-4">
                   <Button variant="ghost" size="sm" className="h-8 rounded-full text-[10px] font-bold" onClick={() => setIsResponding(false)} disabled={isLoading}>
                      {L('Abbrechen', 'Cancel')}
                   </Button>
                   <Button size="sm" className="h-8 rounded-full text-[10px] font-black gap-2 bg-primary text-white" onClick={handleResponseSubmit} disabled={isLoading || !response.trim()}>
                      {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                      {L('Antwort speichern', 'Save Response')}
                   </Button>
                </div>
             </div>
           )}
        </div>
      </CardContent>
    </Card>
  )
}
