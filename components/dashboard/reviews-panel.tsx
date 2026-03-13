'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Star, MessageSquare, Calendar, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Job } from '@/lib/types'
import { useTranslation } from '@/lib/i18n'

interface ReviewsPanelProps {
    jobs: Job[]
}

export function ReviewsPanel({ jobs }: ReviewsPanelProps) {
    const { locale } = useTranslation()
    const reviewedJobs = (jobs || [])
        .filter(j => j.review_received)
        .sort((a, b) => new Date(b.updated_at ?? 0).getTime() - new Date(a.updated_at ?? 0).getTime())

    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5 text-accent fill-accent" />
                    {locale === 'en' ? 'Customer Reviews' : 'Kundenbewertungen'}
                </CardTitle>
                <CardDescription>
                    {locale === 'en'
                        ? `Feedback from completed jobs · ${reviewedJobs.length} reviews`
                        : `Feedback von abgeschlossenen Aufträgen · ${reviewedJobs.length} Bewertung${reviewedJobs.length !== 1 ? 'en' : ''}`}
                </CardDescription>
            </CardHeader>
            <CardContent>
                {reviewedJobs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground border border-dashed rounded-xl gap-3">
                        <div className="flex gap-1">
                            {[...Array(5)].map((_, i) => (
                                <Star key={i} className="h-5 w-5 opacity-20" />
                            ))}
                        </div>
                        <div className="text-center">
                            <p className="font-medium text-sm">
                                {locale === 'en' ? 'No reviews yet' : 'Noch keine Bewertungen'}
                            </p>
                            <p className="text-xs mt-1">
                                {locale === 'en'
                                    ? 'Reviews will appear here once completed jobs are rated.'
                                    : 'Bewertungen erscheinen hier, sobald abgeschlossene Aufträge bewertet wurden.'}
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {reviewedJobs.map((job) => (
                            <div key={job.id} className="rounded-xl border bg-card p-5 space-y-3 hover:border-primary/20 transition-colors">
                                <div className="flex items-start justify-between">
                                    <div className="space-y-1">
                                        <div className="font-semibold text-sm">
                                            {job.lead?.name ?? (locale === 'en' ? 'Unknown' : 'Unbekannt')}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <User className="h-3 w-3" />
                                            <span>{job.technician?.name ?? (locale === 'en' ? 'No technician' : 'Kein Techniker')}</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        <div className="flex gap-0.5">
                                            {[...Array(5)].map((_, i) => (
                                                <Star
                                                    key={i}
                                                    className={cn(
                                                        "h-3.5 w-3.5",
                                                        i < (job.review_rating ?? 0) ? "text-accent fill-accent" : "text-border"
                                                    )}
                                                />
                                            ))}
                                        </div>
                                        <span className="text-xs font-medium text-accent">{job.review_rating}/5</span>
                                    </div>
                                </div>

                                {job.review_text && (
                                    <p className="text-sm italic text-muted-foreground leading-relaxed border-l-2 border-border pl-3">
                                        "{job.review_text}"
                                    </p>
                                )}

                                <div className="flex items-center justify-between pt-1">
                                    <Badge variant="outline" className="text-[10px] px-2 py-0.5">
                                        {job.lead?.job_type ?? (locale === 'en' ? 'General' : 'Allgemein')}
                                    </Badge>
                                    {job.updated_at && (
                                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                            <Calendar className="h-3 w-3" />
                                            <span>{new Date(job.updated_at).toLocaleDateString(locale === 'en' ? 'en-US' : 'de-DE')}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
