'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Star, Loader2, Send, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const reviewSchema = z.object({
  rating: z.number().min(1, 'Please select a rating').max(5),
  comment: z.string().min(10, 'Please share at least 10 characters about your experience').max(1000),
})

type ReviewFormValues = z.infer<typeof reviewSchema>

export function PublicReviewForm({ job, reviewId }: { job: any, reviewId?: string }) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hoverRating, setHoverRating] = useState(0)

  const form = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      rating: 0,
      comment: ''
    }
  })

  const rating = form.watch('rating')

  const onSubmit = async (values: ReviewFormValues) => {
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/reviews/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          review_id: reviewId,
          job_id: job.id,
          rating: values.rating,
          comment: values.comment,
          customer_name: job.lead?.name || job.lead?.full_name || 'Customer'
        })
      })

      if (!res.ok) throw new Error('Failed to submit review')

      toast.success('Vielen Dank für Ihr Feedback!')
      router.refresh()
    } catch (err) {
      toast.error('Senden fehlgeschlagen')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="border-0 shadow-2xl rounded-[3rem] overflow-hidden">
      <CardContent className="p-8 sm:p-12 space-y-10">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">
            
            {/* Rating Selector */}
            <FormField
              control={form.control}
              name="rating"
              render={({ field }) => (
                <FormItem className="space-y-4 text-center">
                  <FormLabel className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">Erfahrung bewerten</FormLabel>
                  <FormControl>
                    <div className="flex justify-center gap-2">
                       {[1, 2, 3, 4, 5].map((star) => (
                         <button
                           key={star}
                           type="button"
                           className="transition-all hover:scale-125 active:scale-95"
                           onMouseEnter={() => setHoverRating(star)}
                           onMouseLeave={() => setHoverRating(0)}
                           onClick={() => field.onChange(star)}
                         >
                           <Star 
                             className={cn(
                               "h-12 w-12 sm:h-16 sm:w-16 transition-colors",
                               (hoverRating || field.value) >= star 
                                 ? "fill-amber-400 text-amber-400" 
                                 : "text-zinc-200"
                             )} 
                           />
                         </button>
                       ))}
                    </div>
                  </FormControl>
                  <div className="h-6">
                    {field.value > 0 && (
                      <p className="text-sm font-black text-amber-600 uppercase tracking-widest animate-in fade-in slide-in-from-top-1">
                        {field.value === 5 ? 'Ausgezeichnet!' : field.value === 4 ? 'Sehr gut!' : field.value === 3 ? 'Gut' : field.value === 2 ? 'Mittelmäßig' : 'Schlecht'}
                      </p>
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Comment Section */}
            <FormField
              control={form.control}
              name="comment"
              render={({ field }) => (
                <FormItem className="space-y-4">
                  <FormLabel className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400 flex items-center gap-2">
                    <MessageSquare className="h-3 w-3" />
                    Ihre Meinung teilen
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Erzählen Sie uns von der Arbeitsqualität, Sauberkeit und Professionalität..."
                      className="min-h-[160px] rounded-[2rem] p-6 bg-zinc-50 border-zinc-100 text-zinc-900 placeholder:text-zinc-400 focus:ring-blue-500/10 focus:border-blue-500 resize-none text-lg"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button 
              type="submit" 
              className="w-full h-20 rounded-[2rem] bg-blue-600 hover:bg-blue-700 text-white font-black text-xl shadow-xl shadow-blue-200 transition-all hover:scale-[1.02] flex items-center gap-3"
              disabled={isSubmitting || !rating}
            >
              {isSubmitting ? (
                <><Loader2 className="h-6 w-6 animate-spin" /> Wird gesendet...</>
              ) : (
                <><Send className="h-6 w-6" /> Bewertung absenden</>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
