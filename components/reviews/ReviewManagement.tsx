'use client'

import { useState } from 'react'
import { useTranslation } from '@/lib/i18n'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { 
  Star, 
  Search, 
  Filter, 
  MessageSquare, 
  CheckCircle2, 
  Eye, 
  EyeOff,
  User,
  Wrench,
  Clock
} from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { ReviewCard } from './ReviewCard'

interface ReviewManagementProps {
  initialReviews: any[]
}

export function ReviewManagement({ initialReviews }: ReviewManagementProps) {
  const { locale } = useTranslation()
  const L = (de: string, en: string) => locale === 'de' ? de : en
  const [reviews, setReviews] = useState(initialReviews)
  const [filterRating, setFilterRating] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  const filteredReviews = reviews.filter(review => {
    const matchesRating = filterRating === 'all' || review.rating.toString() === filterRating
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'published' && review.is_published) || 
      (filterStatus === 'pending' && !review.is_published) ||
      (filterStatus === 'responded' && !!review.admin_response) ||
      (filterStatus === 'no_response' && !review.admin_response)
    
    const matchesSearch = !searchQuery || 
      review.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      review.technician?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      review.review_text?.toLowerCase().includes(searchQuery.toLowerCase())

    return matchesRating && matchesStatus && matchesSearch
  })

  const stats = [
    { label: L('Durchschn. Bewertung', 'Avg. Rating'), value: (reviews.reduce((acc, r) => acc + r.rating, 0) / (reviews.length || 1)).toFixed(1), icon: Star, color: 'text-amber-500' },
    { label: L('Bewertungen gesamt', 'Total Reviews'), value: reviews.length, icon: MessageSquare, color: 'text-blue-500' },
    { label: L('Ausstehende Antworten', 'Pending Response'), value: reviews.filter(r => !r.admin_response).length, icon: Clock, color: 'text-orange-500' },
    { label: L('Veröffentlicht', 'Published'), value: reviews.filter(r => r.is_published).length, icon: Eye, color: 'text-emerald-500' },
  ]

  const handleUpdateReview = (id: string, updates: any) => {
    setReviews(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r))
  }

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <Card key={i} className="border-border/50 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className={cn("p-3 rounded-2xl bg-muted/50", stat.color)}>
                  <stat.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{stat.label}</p>
                  <p className="text-2xl font-black text-zinc-900">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col lg:flex-row gap-4 bg-white p-4 rounded-2xl border border-border/50 shadow-sm sticky top-4 z-20">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder={L('Suche nach Kunde, Techniker oder Inhalt...', 'Search by customer, technician, or content...')}
            className="pl-10 h-11 rounded-xl bg-zinc-50 border-zinc-100"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={filterRating} onValueChange={setFilterRating}>
            <SelectTrigger className="w-[140px] h-11 rounded-xl bg-zinc-50 border-zinc-100">
              <div className="flex items-center gap-2">
                <Star className="h-3 w-3" />
                <SelectValue placeholder="Rating" />
              </div>
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">{L('Alle Sterne', 'All Stars')}</SelectItem>
              <SelectItem value="5">5 {L('Sterne', 'Stars')}</SelectItem>
              <SelectItem value="4">4 {L('Sterne', 'Stars')}</SelectItem>
              <SelectItem value="3">3 {L('Sterne', 'Stars')}</SelectItem>
              <SelectItem value="2">2 {L('Sterne', 'Stars')}</SelectItem>
              <SelectItem value="1">1 {L('Stern', 'Star')}</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[160px] h-11 rounded-xl bg-zinc-50 border-zinc-100">
               <div className="flex items-center gap-2">
                <Filter className="h-3 w-3" />
                <SelectValue placeholder="Status" />
              </div>
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">{L('Alle Status', 'All Status')}</SelectItem>
              <SelectItem value="published">{L('Veröffentlicht', 'Published')}</SelectItem>
              <SelectItem value="pending">{L('Ausgeblendet/Entwurf', 'Hidden/Draft')}</SelectItem>
              <SelectItem value="responded">{L('Beantwortet', 'Responded')}</SelectItem>
              <SelectItem value="no_response">{L('Antwort ausstehend', 'Needs Response')}</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="ghost" className="h-11 rounded-xl font-bold gap-2" onClick={() => {
            setFilterRating('all')
            setFilterStatus('all')
            setSearchQuery('')
          }}>
            {L('Zurücksetzen', 'Reset')}
          </Button>
        </div>
      </div>

      {/* Reviews Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredReviews.map((review) => (
          <ReviewCard 
             key={review.id} 
             review={review} 
             onUpdate={(updates) => handleUpdateReview(review.id, updates)} 
          />
        ))}

        {filteredReviews.length === 0 && (
           <div className="col-span-full py-20 text-center space-y-4 bg-muted/20 rounded-3xl border-2 border-dashed border-border/50">
              <div className="mx-auto h-16 w-16 bg-muted flex items-center justify-center rounded-full text-muted-foreground">
                 <MessageSquare className="h-8 w-8" />
              </div>
              <p className="text-zinc-500 font-medium">{L('Keine Bewertungen gefunden, die Ihren Filtern entsprechen.', 'No reviews found matching your filters.')}</p>
           </div>
        )}
      </div>
    </div>
  )
}
