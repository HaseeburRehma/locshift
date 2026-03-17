'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Star, CheckCircle2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const reviewSchema = z.object({
  rating: z.number().min(1, 'Bitte wählen Sie eine Bewertung').max(5),
  title: z.string().max(100).optional(),
  review_text: z.string().min(10, 'Mindestens 10 Zeichen').max(1000)
})

type ReviewValues = z.infer<typeof reviewSchema>

interface ReviewFormProps {
  token: string
  technicianName: string
  preSelectedRating?: number
}

export function ReviewForm({ token, technicianName, preSelectedRating }: ReviewFormProps) {
  const [rating, setRating] = useState(preSelectedRating || 0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<ReviewValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      rating: preSelectedRating || 0
    }
  })

  const handleRatingClick = (val: number) => {
    setRating(val)
    setValue('rating', val, { shouldValidate: true })
  }

  const onSubmit = async (values: ReviewValues) => {
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/reviews/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, token })
      })

      if (response.ok) {
        setSubmitted(true)
      } else {
        const err = await response.json()
        alert(err.error || 'Fehler beim Senden der Bewertung')
      }
    } catch (err) {
      console.error(err)
      alert('Ein Fehler ist aufgetreten')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <Card className="w-full max-w-lg mx-auto border-none shadow-2xl glass-premium">
        <CardContent className="flex flex-col items-center text-center p-12">
          <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center mb-6 animate-bounce">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900 mb-2">Vielen Dank!</CardTitle>
          <CardDescription className="text-base text-slate-500 mb-8">
            Ihre Bewertung wurde erfolgreich übermittelt. Ihr Feedback hilft uns, unseren Service stetig zu verbessern.
          </CardDescription>
          <Button
            className="w-full bg-slate-900 hover:bg-slate-800 text-white flex gap-2 items-center justify-center p-6 h-auto text-lg"
            onClick={() => window.open('https://g.page/r/your-google-id/review', '_blank')}
          >
            <span>Auch bei Google bewerten</span>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-lg mx-auto border-none shadow-2xl glass-premium">
      <CardHeader className="text-center p-8 pb-0">
        <CardTitle className="text-2xl font-bold text-slate-900">Wie war Ihr Erlebnis?</CardTitle>
        <CardDescription className="text-slate-500 mt-2">
          Bewerten Sie den Service von <strong>{technicianName}</strong>
        </CardDescription>
      </CardHeader>
      <CardContent className="p-8">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  onClick={() => handleRatingClick(star)}
                  className="transition-transform active:scale-95"
                >
                  <Star
                    className={cn(
                      "h-10 w-10 transition-colors",
                      (hoveredRating || rating) >= star
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-slate-200"
                    )}
                  />
                </button>
              ))}
            </div>
            {errors.rating && (
              <p className="text-xs text-red-500">{errors.rating.message}</p>
            )}
            <span className="text-sm font-medium text-slate-600">
              {rating === 1 && "Sehr schlecht"}
              {rating === 2 && "Schlecht"}
              {rating === 3 && "Gut"}
              {rating === 4 && "Sehr gut"}
              {rating === 5 && "Exzellent"}
            </span>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Titel (optional)</label>
            <Input
              {...register('title')}
              placeholder="Z.B. Schneller Service, sehr freundlich"
              className="border-slate-200 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Ihre Erfahrung</label>
            <Textarea
              {...register('review_text')}
              placeholder="Was hat Ihnen besonders gut gefallen? Was können wir besser machen?"
              className="min-h-[120px] border-slate-200 focus:ring-blue-500"
            />
            {errors.review_text && (
              <p className="text-xs text-red-500">{errors.review_text.message}</p>
            )}
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 h-auto text-lg font-bold shadow-lg shadow-blue-200"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Sende Bewertung...
              </>
            ) : (
              "Bewertung abschicken"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
