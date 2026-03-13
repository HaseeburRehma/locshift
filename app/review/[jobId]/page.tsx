'use client'

import { useState, use } from 'react'
import { Zap, Star, Send, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Spinner } from '@/components/ui/spinner'

export default function ReviewPage({ params }: { params: Promise<{ jobId: string }> }) {
  const resolvedParams = use(params)
  const [rating, setRating] = useState<number>(0)
  const [hoveredRating, setHoveredRating] = useState<number>(0)
  const [reviewText, setReviewText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (rating === 0) {
      setError('Bitte wählen Sie eine Bewertung aus.')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_id: resolvedParams.jobId,
          rating,
          text: reviewText.trim() || null
        })
      })

      if (!res.ok) {
        throw new Error('Fehler beim Senden der Bewertung')
      }

      setIsSubmitted(true)
    } catch {
      setError('Etwas ist schief gelaufen. Bitte versuchen Sie es erneut.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <div className="h-16 w-16 rounded-full bg-chart-3/10 flex items-center justify-center mb-4">
                <CheckCircle className="h-8 w-8 text-chart-3" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Vielen Dank!</h2>
              <p className="text-muted-foreground">
                Ihre Bewertung wurde erfolgreich übermittelt. Ihr Feedback hilft uns, 
                unseren Service stetig zu verbessern.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 rounded-lg bg-primary flex items-center justify-center">
              <Zap className="h-6 w-6 text-primary-foreground" />
            </div>
          </div>
          <CardTitle>Wie war Ihr Service?</CardTitle>
          <CardDescription>
            Ihre Meinung ist uns wichtig. Bewerten Sie Ihre Erfahrung mit fixdone.de.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center gap-2">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star 
                    className={`h-10 w-10 transition-colors ${
                      star <= (hoveredRating || rating) 
                        ? 'fill-accent text-accent' 
                        : 'text-muted-foreground/30'
                    }`}
                  />
                </button>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              {rating === 0 ? 'Klicken Sie auf einen Stern' :
               rating === 1 ? 'Sehr schlecht' :
               rating === 2 ? 'Schlecht' :
               rating === 3 ? 'Okay' :
               rating === 4 ? 'Gut' :
               'Ausgezeichnet'}
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="review-text" className="text-sm font-medium">
              Möchten Sie mehr erzählen? (optional)
            </label>
            <Textarea
              id="review-text"
              placeholder="Teilen Sie uns Ihre Erfahrung mit..."
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}

          <Button 
            className="w-full" 
            onClick={handleSubmit}
            disabled={isSubmitting || rating === 0}
          >
            {isSubmitting ? (
              <Spinner className="h-4 w-4" />
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Bewertung absenden
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
