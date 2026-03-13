//components/landing/inquiry-form.tsx
'use client'

import { useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Sparkles, Loader2, Send, CheckCircle2, ShieldCheck, MapPin, Map as MapIcon } from 'lucide-react'
import { useTranslation } from '@/lib/i18n'
import { toast } from 'sonner'

// Dynamically import MapSelector to avoid SSR issues
const MapSelector = dynamic(() => import('./MapSelector'), { 
    ssr: false,
    loading: () => <div className="h-[300px] w-full bg-zinc-100 animate-pulse rounded-2xl flex items-center justify-center text-zinc-400">Loading Map...</div>
})

const formSchema = z.object({
    name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
    email: z.string().email({ message: 'Please enter a valid email address.' }),
    phone: z.string().min(6, { message: 'Please enter a valid phone number.' }),
    service_type: z.string().min(1, { message: 'Please select a service.' }),
    street: z.string().min(2, { message: 'Street required' }),
    house_no: z.string().min(1, { message: 'House number required' }),
    postcode: z.string().min(5, { message: 'Valid postcode required' }),
    city: z.string().min(2, { message: 'City required' }),
    budget: z.string().min(1, { message: 'Estimated budget required' }),
    description: z.string().min(10, { message: 'Please describe your request in more detail.' }),
})

export function InquiryForm() {
    const { t } = useTranslation()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [submitted, setSubmitted] = useState(false)
    const [mapCenter, setMapCenter] = useState<[number, number]>([51.1657, 10.4515])

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: '',
            email: '',
            phone: '',
            service_type: 'electrician',
            street: '',
            house_no: '',
            postcode: '',
            city: '',
            budget: '',
            description: '',
        },
    })

    const handleLocationSelect = async (lat: number, lng: number) => {
        setMapCenter([lat, lng])
        toast.info(t('inquiry.geocoding.loading'))
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`)
            const data = await res.json()
            if (data.address) {
                // Better address parsing
                const street = data.address.road || data.address.pedestrian || data.address.suburb || ''
                const houseNo = data.address.house_number || ''
                const postcode = data.address.postcode || ''
                const city = data.address.city || data.address.town || data.address.village || data.address.municipality || ''
                
                form.setValue('street', street)
                form.setValue('house_no', houseNo)
                form.setValue('postcode', postcode)
                form.setValue('city', city)
                toast.success(t('inquiry.geocoding.success'))
            }
        } catch (err) {
            toast.error(t('inquiry.geocoding.error'))
        }
    }

    const handleUseGps = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(async (pos) => {
                handleLocationSelect(pos.coords.latitude, pos.coords.longitude)
            }, (err) => {
                toast.error("GPS access denied or unavailable")
            })
        }
    }

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsSubmitting(true)
        try {
            const response = await fetch('/api/inquiry', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values),
            })

            if (!response.ok) throw new Error('Failed to submit')

            setSubmitted(true)
            toast.success(t('inquiry.success'))
        } catch (error) {
            console.error('Submission error:', error)
            toast.error(t('inquiry.error'))
        } finally {
            setIsSubmitting(false)
        }
    }

    if (submitted) {
        return (
            <div className="p-[2px] bg-gradient-to-br from-primary via-accent to-primary rounded-[2.5rem] animate-in fade-in zoom-in duration-500 shadow-2xl">
                <Card className="border-0 bg-white rounded-[2.4rem] shadow-2xl">
                    <CardHeader className="text-center pb-8 p-12">
                        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/10 mb-6 animate-bounce">
                            <CheckCircle2 className="h-10 w-10 text-primary" />
                        </div>
                        <CardTitle className="text-3xl font-black text-black">{t('inquiry.success')}</CardTitle>
                        <CardDescription className="text-lg mt-4 text-zinc-600">
                            {t('inquiry.analysis.success')}
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        )
    }

    return (
        <div className="group relative p-[1px] bg-gradient-to-br from-zinc-200 via-white to-zinc-100 rounded-[2.5rem] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] transition-all hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.15)]">
            <Card className="border-0 bg-white/95 backdrop-blur-3xl rounded-[2.4rem] overflow-hidden">
                <CardHeader className="space-y-4 pb-8 pt-10 px-10 border-b border-zinc-100 bg-zinc-50/50">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                        </div>
                        <span className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">
                            {t('inquiry.status.active')}
                        </span>
                    </div>
                    <div>
                        <CardTitle className="text-3xl lg:text-4xl font-black text-zinc-900 leading-tight">
                            {t('inquiry.title')}
                        </CardTitle>
                        <CardDescription className="text-zinc-500 text-base mt-2 font-medium">
                            {t('inquiry.subtitle')}
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="px-10 py-10">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                            {/* Personal Info */}
                            <div className="space-y-6">
                                <h3 className="text-sm font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                                    <span className="h-px w-8 bg-zinc-200" />
                                    {t('inquiry.section.personal')}
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FormField
                                        control={form.control}
                                        name="name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest">{t('inquiry.name')}</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder={t('inquiry.placeholder.name')}
                                                        className="h-14 bg-zinc-50 border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:ring-primary/20 focus:border-primary rounded-2xl transition-all shadow-sm"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage className="text-destructive/80 text-xs" />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="email"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest">{t('inquiry.email')}</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder={t('inquiry.placeholder.email')}
                                                        type="email"
                                                        className="h-14 bg-zinc-50 border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:ring-primary/20 focus:border-primary rounded-2xl transition-all shadow-sm"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage className="text-destructive/80 text-xs" />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                <FormField
                                    control={form.control}
                                    name="phone"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest">{t('inquiry.phone')}</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder={t('inquiry.placeholder.phone')}
                                                    className="h-14 bg-zinc-50 border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:ring-primary/20 focus:border-primary rounded-2xl transition-all shadow-sm"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage className="text-destructive/80 text-xs" />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* Service Details */}
                            <div className="space-y-6">
                                <h3 className="text-sm font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                                    <span className="h-px w-8 bg-zinc-200" />
                                    {t('inquiry.section.service')}
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FormField
                                        control={form.control}
                                        name="service_type"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest">Service</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger className="h-14 bg-zinc-50 border-zinc-200 text-zinc-900 rounded-2xl focus:ring-primary/20 focus:border-primary transition-all shadow-sm">
                                                            <SelectValue placeholder={t('inquiry.placeholder.service')} />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent className="rounded-2xl border-zinc-200 shadow-xl">
                                                        <SelectItem value="electrician" className="py-3">Electrician</SelectItem>
                                                        <SelectItem value="plumber" className="py-3">Plumber</SelectItem>
                                                        <SelectItem value="cleaner" className="py-3">Cleaner</SelectItem>
                                                        <SelectItem value="other" className="py-3">Other</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage className="text-destructive/80 text-xs" />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="budget"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest">Budget (€)</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder={t('inquiry.placeholder.budget')}
                                                        className="h-14 bg-zinc-50 border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:ring-primary/20 focus:border-primary rounded-2xl transition-all shadow-sm"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage className="text-destructive/80 text-xs" />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>

                            {/* Location Section */}
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                                        <span className="h-px w-8 bg-zinc-200" />
                                        {t('inquiry.section.location')}
                                    </h3>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/5 rounded-full px-4"
                                        onClick={handleUseGps}
                                    >
                                        <MapPin className="h-3 w-3 mr-2" />
                                        {t('inquiry.gps.button')}
                                    </Button>
                                </div>
                                
                                <MapSelector onLocationSelect={handleLocationSelect} initialPos={mapCenter} />

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FormField
                                        control={form.control}
                                        name="street"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest">Street</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder={t('inquiry.placeholder.street')}
                                                        className="h-14 bg-zinc-50 border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:ring-primary/20 focus:border-primary rounded-2xl transition-all shadow-sm"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage className="text-destructive/80 text-xs" />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="house_no"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest">House Number</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder={t('inquiry.placeholder.house_no')}
                                                        className="h-14 bg-zinc-50 border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:ring-primary/20 focus:border-primary rounded-2xl transition-all shadow-sm"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage className="text-destructive/80 text-xs" />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <FormField
                                        control={form.control}
                                        name="postcode"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest">{t('inquiry.postcode')}</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder="12345"
                                                        className="h-14 bg-zinc-50 border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:ring-primary/20 focus:border-primary rounded-2xl transition-all shadow-sm"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage className="text-destructive/80 text-xs" />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="city"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest">{t('inquiry.city')}</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder={t('inquiry.placeholder.city')}
                                                        className="h-14 bg-zinc-50 border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:ring-primary/20 focus:border-primary rounded-2xl transition-all shadow-sm"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage className="text-destructive/80 text-xs" />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>

                            <div className="space-y-6">
                                <h3 className="text-sm font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                                    <span className="h-px w-8 bg-zinc-200" />
                                    {t('inquiry.section.description')}
                                </h3>
                                <FormField
                                    control={form.control}
                                    name="description"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest">{t('inquiry.description')}</FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    placeholder={t('inquiry.placeholder.description')}
                                                    className="min-h-[120px] bg-zinc-50 border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:ring-primary/20 focus:border-primary rounded-2xl transition-all resize-none shadow-sm"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage className="text-destructive/80 text-xs" />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <Button
                                type="submit"
                                className="w-full h-16 text-xl font-black transition-all shadow-[0_20px_40px_rgba(var(--primary),0.2)] hover:shadow-primary/40 group relative overflow-hidden rounded-2xl bg-primary text-white"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <span className="flex items-center gap-3">
                                        <Loader2 className="h-6 w-6 animate-spin" />
                                        {t('inquiry.analysis.loading')}
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-3">
                                        {t('inquiry.button')}
                                        <Send className="h-6 w-6 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                                    </span>
                                )}
                            </Button>

                            <div className="flex flex-col items-center justify-center gap-2 pt-4 text-zinc-400">
                                <div className="flex items-center gap-2">
                                    <ShieldCheck className="h-4 w-4" />
                                    <span className="text-[10px] font-bold uppercase tracking-widest">{t('inquiry.disclaimer')}</span>
                                </div>
                                <p className="text-[9px] text-zinc-300 text-center px-10">
                                    Your data is securely encrypted and used only for quote generation.
                                </p>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    )
}
