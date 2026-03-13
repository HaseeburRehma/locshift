'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { MarketingHeader } from '@/components/marketing/header'
import { MarketingFooter } from '@/components/marketing/footer'
import { InquiryForm } from '@/components/landing/inquiry-form'
import { Button } from '@/components/ui/button'
import { useTranslation } from '@/lib/i18n'
import {
    Zap,
    ShieldCheck,
    Clock,
    CheckCircle2,
    Star,
    ChevronRight,
    Sparkles,
    ArrowLeft,
    ArrowRight,
    TrendingUp,
} from 'lucide-react'

// ─── Testimonials data ──────────────────────────────────────────────────────
const TESTIMONIALS = [
    { name: 'Michael W.', text: 'Nach dem Sicherungsfall war in 15 Minuten ein Techniker da. Unglaublich schnell und professionell!', city: 'Berlin', avatar: 'MW', rating: 5 },
    { name: 'Sarah L.', text: 'Die KI-Analyse hat mir sofort einen fairen Preisbereich genannt. Endlich Transparenz im Handwerk.', city: 'München', avatar: 'SL', rating: 5 },
    { name: 'Thomas K.', text: 'Die smartesten Elektriker, die ich bisher im Haus hatte. Absolut empfehlenswert.', city: 'Hamburg', avatar: 'TK', rating: 5 },
    { name: 'Anna P.', text: 'Innerhalb von 3 Stunden war das Problem gelöst. Der Service übertrifft alle Erwartungen.', city: 'Frankfurt', avatar: 'AP', rating: 5 },
    { name: 'Klaus B.', text: 'Faire Preise, kompetente Handwerker, schnelle Vermittlung. Fixdone ist mein neuer Standard.', city: 'Stuttgart', avatar: 'KB', rating: 5 },
    { name: 'Julia M.', text: 'Einfach, schnell, transparent. Ich habe endlich einen zuverlässigen Partner für alle Projekte.', city: 'Köln', avatar: 'JM', rating: 5 },
]

// ─── Review Carousel ─────────────────────────────────────────────────────────
function ReviewCarousel() {
    const [current, setCurrent] = useState(0)
    const [perPage, setPerPage] = useState(3)
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

    useEffect(() => {
        const update = () => {
            if (window.innerWidth < 640) setPerPage(1)
            else if (window.innerWidth < 1024) setPerPage(2)
            else setPerPage(3)
        }
        update()
        window.addEventListener('resize', update)
        return () => window.removeEventListener('resize', update)
    }, [])

    const maxIndex = Math.max(0, TESTIMONIALS.length - perPage)

    const startTimer = useCallback(() => {
        if (timerRef.current) clearInterval(timerRef.current)
        timerRef.current = setInterval(() => {
            setCurrent(i => (i >= maxIndex ? 0 : i + 1))
        }, 4500)
    }, [maxIndex])

    useEffect(() => {
        startTimer()
        return () => { if (timerRef.current) clearInterval(timerRef.current) }
    }, [startTimer])

    const go = (dir: number) => {
        setCurrent(i => Math.max(0, Math.min(maxIndex, i + dir)))
        startTimer()
    }

    const cardW = perPage === 1 ? 100 : perPage === 2 ? 50 : 33.333
    const gap = 24

    return (
        <section className="py-28 bg-white">
            <div className="max-w-7xl mx-auto px-6">
                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-14">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600 mb-3">Kundenstimmen</p>
                        <h2 className="text-4xl lg:text-5xl font-black tracking-tight text-slate-900 leading-tight">
                            Was unsere Kunden{' '}
                            <span className="italic font-serif text-blue-600">sagen</span>
                        </h2>
                    </div>
                    <div className="flex gap-3 shrink-0">
                        <button
                            onClick={() => go(-1)}
                            disabled={current === 0}
                            className="w-12 h-12 rounded-2xl border-2 border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </button>
                        <button
                            onClick={() => go(1)}
                            disabled={current >= maxIndex}
                            className="w-12 h-12 rounded-2xl border-2 border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            <ArrowRight className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Track */}
                <div className="overflow-hidden">
                    <div
                        className="flex transition-transform duration-500 ease-[cubic-bezier(0.25,0.46,0.45,0.94)]"
                        style={{ transform: `translateX(calc(-${current * (cardW + (gap * 100) / (perPage === 1 ? 400 : 1200))}% - ${current * gap}px))` }}
                    >
                        {TESTIMONIALS.map((r, i) => (
                            <div
                                key={i}
                                style={{ flex: `0 0 calc(${cardW}% - ${gap * (perPage - 1) / perPage}px)`, marginRight: `${gap}px` }}
                                className="bg-slate-50 border border-slate-100 rounded-3xl p-8 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-50 hover:-translate-y-1 transition-all duration-300"
                            >
                                <div className="flex gap-1 mb-5">
                                    {Array.from({ length: r.rating }).map((_, s) => (
                                        <Star key={s} className="h-4 w-4 fill-amber-400 text-amber-400" />
                                    ))}
                                </div>
                                <p className="text-slate-700 text-[15px] leading-relaxed italic mb-7">"{r.text}"</p>
                                <div className="flex items-center gap-3 pt-5 border-t border-slate-100">
                                    <div className="w-11 h-11 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700 text-sm font-black">
                                        {r.avatar}
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-900 text-sm">{r.name}</div>
                                        <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold mt-0.5">{r.city}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Dots */}
                <div className="flex justify-center gap-2 mt-10">
                    {Array.from({ length: maxIndex + 1 }).map((_, i) => (
                        <button
                            key={i}
                            onClick={() => { setCurrent(i); startTimer() }}
                            className={`h-2 rounded-full transition-all duration-300 border-none cursor-pointer ${i === current ? 'w-8 bg-blue-600' : 'w-2 bg-slate-200'}`}
                        />
                    ))}
                </div>
            </div>
        </section>
    )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function LandingPage() {
    const { t } = useTranslation()

    const features = [
        { icon: Zap, title: t('features.matching.title'), desc: t('features.matching.desc'), color: 'bg-blue-50 text-blue-600' },
        { icon: Clock, title: t('features.speed.title'), desc: t('features.speed.desc'), color: 'bg-emerald-50 text-emerald-600' },
        { icon: ShieldCheck, title: t('features.quality.title'), desc: t('features.quality.desc'), color: 'bg-violet-50 text-violet-600' },
    ]

    const stats = [
        { value: '10k+', label: t('hero.stats.projects') },
        { value: '500+', label: t('hero.stats.techs') },
        { value: '< 5 min', label: t('hero.stats.matching') },
    ]

    const steps = [1, 2, 3, 4].map(n => ({
        n,
        title: t(`process.step${n}.title`),
        desc: t(`process.step${n}.desc`),
    }))

    return (
        <div className="min-h-screen bg-white selection:bg-blue-100">
            <MarketingHeader />

            <main>
                {/* ── HERO ─────────────────────────────────────────────── */}
                <section className="relative pt-20 pb-20 lg:pt-32 lg:pb-32 overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/40 to-white">
                    {/* Subtle grid pattern */}
                    <div
                        className="absolute inset-0 opacity-[0.03] pointer-events-none"
                        style={{
                            backgroundImage: `linear-gradient(#1e40af 1px, transparent 1px), linear-gradient(90deg, #1e40af 1px, transparent 1px)`,
                            backgroundSize: '48px 48px',
                        }}
                    />
                    {/* Soft glow blobs */}
                    <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-blue-100/60 rounded-full blur-[120px] -translate-y-1/3 pointer-events-none" />
                    <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-blue-50 rounded-full blur-[100px] pointer-events-none" />

                    <div className="max-w-4xl mx-auto px-6 text-center space-y-10 relative z-10">
                        {/* Badge */}
                        <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white border border-blue-100 shadow-sm text-blue-700 text-xs font-bold uppercase tracking-widest">
                            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                            Germany's AI-Powered Field Service Marketplace
                        </div>

                        <h1 className="text-5xl lg:text-7xl font-black tracking-tight leading-[1.05] text-slate-900">
                            {t('hero.title').split(' ').map((word, i) => (
                                <span
                                    key={i}
                                    className={
                                        i >= 4
                                            ? 'text-blue-600 italic font-serif inline-block mr-2'
                                            : 'inline-block mr-2'
                                    }
                                >
                                    {word}
                                </span>
                            ))}
                        </h1>

                        <p className="text-xl text-slate-500 leading-relaxed max-w-2xl mx-auto">
                            {t('hero.subtitle')}
                        </p>

                        <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
                            <Button
                                size="lg"
                                className="h-16 px-10 text-lg font-bold group rounded-2xl bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 transition-all hover:scale-[1.02] hover:shadow-blue-300"
                                asChild
                            >
                                <a href="#quote">
                                    {t('hero.cta')}
                                    <ChevronRight className="ml-1 h-5 w-5 transition-transform group-hover:translate-x-1" />
                                </a>
                            </Button>
                            <Button
                                size="lg"
                                variant="outline"
                                className="h-16 px-10 text-lg font-bold rounded-2xl border-slate-200 text-slate-700 hover:border-blue-300 hover:text-blue-700 hover:bg-blue-50 transition-all"
                            >
                                ▶&nbsp; Watch Video
                            </Button>
                        </div>

                        {/* Stats */}
                        <div className="flex justify-center gap-12 lg:gap-24 pt-12 border-t border-slate-100 max-w-2xl mx-auto">
                            {stats.map((stat) => (
                                <div key={stat.label}>
                                    <div className="text-3xl font-black text-slate-900">{stat.value}</div>
                                    <div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mt-1">{stat.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── TRUST STRIP ──────────────────────────────────────── */}
                <section className="py-10 border-y border-slate-100 bg-white">
                    <div className="max-w-7xl mx-auto px-6">
                        <div className="flex flex-wrap justify-center items-center gap-10 lg:gap-20">
                            {['Handelsblatt', 'Focus Money', 'DIE WELT', 'TÜV SÜD'].map(name => (
                                <span
                                    key={name}
                                    className="text-lg font-black tracking-tight text-slate-300 hover:text-slate-500 transition-colors cursor-default select-none"
                                >
                                    {name}
                                </span>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── INQUIRY SECTION (Moved here) ────────────────────── */}
                <section id="quote" className="py-24 bg-slate-50 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1/2 bg-white" />
                    <div className="max-w-4xl mx-auto px-6 relative z-10">
                        <div className="text-center mb-12">
                            <h2 className="text-4xl lg:text-5xl font-black tracking-tight text-slate-900 mb-4">
                                Get Your <span className="text-blue-600 italic font-serif">Free Quote</span>
                            </h2>
                            <p className="text-slate-500 text-lg max-w-xl mx-auto">
                                Tell us about your project and our AI will find the perfect technician within minutes.
                            </p>
                        </div>
                        <div className="relative">
                            <div className="absolute -inset-4 bg-gradient-to-br from-blue-100 to-blue-50 rounded-[3rem] opacity-40 blur-2xl pointer-events-none" />
                            <InquiryForm />
                        </div>
                    </div>
                </section>

                {/* ── FEATURES ─────────────────────────────────────────── */}
                <section id="features" className="py-28 bg-slate-50 relative overflow-hidden">
                    <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-100/50 rounded-full blur-[80px] pointer-events-none" />

                    <div className="max-w-7xl mx-auto px-6">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-6">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600 mb-3">
                                    {t('features.title')}
                                </p>
                                <h2 className="text-4xl lg:text-5xl font-black tracking-tight text-slate-900 leading-tight">
                                    Zukunft des{' '}
                                    <span className="italic font-serif text-blue-600">Handwerks</span>
                                </h2>
                            </div>
                            <p className="text-base text-slate-500 max-w-xs leading-relaxed">
                                {t('features.subtitle')}
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {features.map((feature, i) => (
                                <div
                                    key={feature.title}
                                    className="group p-8 rounded-3xl bg-white border border-slate-100 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-50 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden"
                                >
                                    {/* Corner accent */}
                                    <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-blue-50 to-transparent rounded-bl-[2rem] opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <div className={`h-14 w-14 rounded-2xl ${feature.color} flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300`}>
                                        <feature.icon className="h-6 w-6" />
                                    </div>
                                    <h3 className="text-xl font-black text-slate-900 mb-3">{feature.title}</h3>
                                    <p className="text-slate-500 leading-relaxed text-[15px]">{feature.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── PROCESS ──────────────────────────────────────────── */}
                <section className="py-28 px-6 bg-white">
                    <div className="max-w-7xl mx-auto">
                        {/* Dark pill container */}
                        <div className="bg-slate-900 rounded-[2.5rem] p-10 lg:p-20 relative overflow-hidden">
                            {/* Subtle blue glow top-right */}
                            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />
                            <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-800/10 rounded-full blur-[80px] pointer-events-none" />

                            <div className="relative z-10 text-center mb-16">
                                <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-400 mb-3">So einfach geht's</p>
                                <h2 className="text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight">
                                    {t('process.title')}
                                </h2>
                                <p className="text-slate-400 mt-4 text-base">In 4 Schritten zum fertigen Projekt</p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 relative z-10">
                                {steps.map((step, i) => (
                                    <div key={step.n} className="group flex flex-col items-center text-center">
                                        <div className="relative mb-8">
                                            <div className="h-16 w-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl font-black text-white transition-all group-hover:bg-blue-600 group-hover:border-blue-500 group-hover:scale-110 group-hover:rotate-3 duration-300">
                                                {step.n}
                                            </div>
                                            {i < 3 && (
                                                <div className="hidden lg:block absolute top-8 left-[calc(100%+8px)] w-[calc(100%+16px)] h-px bg-gradient-to-r from-white/10 to-transparent" />
                                            )}
                                        </div>
                                        <h4 className="text-lg font-bold text-white mb-3">{step.title}</h4>
                                        <p className="text-slate-400 text-sm leading-relaxed">{step.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── REVIEW CAROUSEL ──────────────────────────────────── */}
                <ReviewCarousel />

                {/* ── CTA ──────────────────────────────────────────────── */}
                <section className="py-32 relative overflow-hidden bg-gradient-to-br from-blue-700 via-blue-600 to-blue-500">
                    {/* Decorative mesh */}
                    <div
                        className="absolute inset-0 opacity-[0.04] pointer-events-none"
                        style={{
                            backgroundImage: `linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)`,
                            backgroundSize: '40px 40px',
                        }}
                    />
                    <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-white/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-900/20 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2 pointer-events-none" />

                    <div className="max-w-3xl mx-auto px-6 text-center space-y-8 relative z-10">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-white/80 text-xs font-bold uppercase tracking-widest mb-4">
                            <TrendingUp className="h-3.5 w-3.5" />
                            Kostenlos & unverbindlich
                        </div>
                        <h2 className="text-5xl lg:text-7xl font-black tracking-tighter text-white leading-[1.0]">
                            {t('cta.title')}
                        </h2>
                        <p className="text-xl text-white/70 font-medium">
                            {t('cta.subtitle')}
                        </p>
                        <Button
                            size="lg"
                            className="h-16 px-14 text-lg font-black rounded-2xl bg-white text-blue-700 hover:bg-blue-50 transition-all shadow-[0_20px_60px_rgba(0,0,0,0.2)] hover:scale-105 hover:shadow-[0_28px_80px_rgba(0,0,0,0.3)] group"
                            asChild
                        >
                            <a href="#quote">
                                {t('hero.cta')}
                                <Zap className="ml-2 h-5 w-5 fill-blue-600 text-blue-600 transition-transform group-hover:scale-125 group-hover:rotate-12" />
                            </a>
                        </Button>

                        {/* Trust micro-signals */}
                        <div className="flex flex-wrap justify-center gap-6 pt-4">
                            {['Kostenlos', 'DSGVO-konform', 'Keine Verpflichtung'].map(tag => (
                                <div key={tag} className="flex items-center gap-2 text-white/60 text-sm font-medium">
                                    <CheckCircle2 className="h-4 w-4 text-white/40" />
                                    {tag}
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            </main>

            <MarketingFooter />
        </div>
    )
}