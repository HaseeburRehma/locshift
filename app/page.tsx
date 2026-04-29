'use client'

/**
 * LokShift marketing home page.
 *
 * Design language inspired by the Voxr AI reference: dark hero, soft brand-blue
 * glows, glassmorphic floating chips, staggered card reveals on scroll, glowing
 * orb final CTA. All copy is German-first; English flips via the existing
 * useTranslation() helper.
 *
 * Brand color: #0064E0 (matches the dashboard).
 *
 * Animations: zero deps — IntersectionObserver-driven `data-animate` reveals,
 * CSS-only floating chips + gradient glows.
 *
 * Assets expected in /public:
 *   - hero.mp4 (4K loop, mute-autoplay)
 *   - hero.avif (poster + reduced-motion fallback)
 */

import React, { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useTranslation } from '@/lib/i18n'
import {
  Globe,
  Menu,
  X,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Zap,
  Calendar,
  ClipboardList,
  Activity,
  FileText,
  Bell,
  Wallet,
  Shield,
  ChevronDown,
  Linkedin,
  Twitter,
  Facebook,
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
//  Section-progress hook
//  Tracks how far a referenced element has progressed through the viewport,
//  returning a value roughly in [-0.5, 1.5] (clamped). Used by the floating
//  stat cards in the Impact section so they drift as the user scrolls past.
//  Respects prefers-reduced-motion (returns 0 so cards stay still).
// ─────────────────────────────────────────────────────────────────────────────
function useSectionProgress(ref: React.RefObject<HTMLElement | null>) {
  const [progress, setProgress] = useState(0)
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) return
    const onScroll = () => {
      if (!ref.current) return
      const rect = ref.current.getBoundingClientRect()
      const vh = window.innerHeight || 1
      const total = rect.height + vh
      const scrolled = vh - rect.top
      const p = scrolled / total
      setProgress(Math.max(-0.5, Math.min(1.5, p)))
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [ref])
  return progress
}

// ─────────────────────────────────────────────────────────────────────────────
//  Reveal-on-scroll hook
//  Adds .is-visible to elements with data-animate when they enter the viewport.
//  Runs once; respects prefers-reduced-motion (skips the animation altogether).
// ─────────────────────────────────────────────────────────────────────────────
function useScrollReveal() {
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const els = document.querySelectorAll<HTMLElement>('[data-animate]')
    if (reduce) {
      els.forEach((el) => el.classList.add('is-visible'))
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('is-visible')
            io.unobserve(e.target)
          }
        })
      },
      { threshold: 0.15, rootMargin: '0px 0px -50px 0px' }
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])
}

// ─────────────────────────────────────────────────────────────────────────────
//  Marketing header (dark, glassmorphic)
// ─────────────────────────────────────────────────────────────────────────────
function MarketingHeader() {
  const { locale, setLocale } = useTranslation()
  const L = (de: string, en: string) => (locale === 'de' ? de : en)
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const navLinks = [
    { href: '#features', label: L('Funktionen', 'Features') },
    { href: '#impact', label: L('Wirkung', 'Impact') },
    { href: '#why', label: L('Warum LokShift', 'Why LokShift') },
    { href: '#faq', label: L('FAQ', 'FAQ') },
  ]

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-[#040714]/80 backdrop-blur-xl border-b border-white/5'
          : 'bg-transparent'
      }`}
    >
      <div className="mx-auto max-w-7xl px-5 lg:px-8 h-16 md:h-20 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-white">
          {/* Use the white logo asset on the dark marketing surface */}
          <Image
            src="/logo-1.png"
            alt="LokShift"
            width={140}
            height={32}
            priority
            className="h-7 md:h-8 w-auto"
          />
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-[13px] font-medium text-white/70 hover:text-white transition-colors"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-2">
          <button
            onClick={() => setLocale(locale === 'de' ? 'en' : 'de')}
            className="inline-flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-widest text-white/70 hover:text-white px-3 py-2 rounded-full transition-colors"
            aria-label="Toggle language"
          >
            <Globe className="w-3.5 h-3.5" />
            {locale.toUpperCase()}
          </button>
          <Link
            href="/login"
            className="px-4 py-2 rounded-full text-[13px] font-semibold text-white border border-white/15 hover:bg-white/5 transition-colors"
          >
            {L('Anmelden', 'Login')}
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-bold text-white bg-[#0064E0] shadow-lg shadow-[#0064E0]/30 hover:bg-[#0050B3] transition-all"
          >
            {L('Demo starten', 'Start demo')} <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <button
          onClick={() => setOpen((o) => !o)}
          className="md:hidden p-2 text-white"
          aria-label="Menu"
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden bg-[#040714]/95 backdrop-blur-xl border-t border-white/5 px-5 py-6 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          {navLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block text-base font-medium text-white/80 hover:text-white"
            >
              {l.label}
            </a>
          ))}
          <div className="pt-4 border-t border-white/10 flex items-center gap-3">
            <button
              onClick={() => setLocale(locale === 'de' ? 'en' : 'de')}
              className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-white/70 px-3 py-2 rounded-full border border-white/10"
            >
              <Globe className="w-3.5 h-3.5" />
              {locale.toUpperCase()}
            </button>
            <Link href="/login" className="flex-1 text-center px-4 py-2.5 rounded-full text-sm font-semibold text-white border border-white/15">
              {L('Anmelden', 'Login')}
            </Link>
          </div>
          <Link
            href="/register"
            className="block text-center px-4 py-3 rounded-full text-sm font-bold text-white bg-[#0064E0]"
          >
            {L('Demo starten', 'Start demo')}
          </Link>
        </div>
      )}
    </header>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Hero
// ─────────────────────────────────────────────────────────────────────────────
function Hero() {
  const { locale } = useTranslation()
  const L = (de: string, en: string) => (locale === 'de' ? de : en)
  const videoRef = useRef<HTMLVideoElement>(null)

  return (
    <section className="relative isolate overflow-hidden bg-[#040714] pt-28 md:pt-32 pb-24 md:pb-40">
      {/* Background video / poster */}
      <div className="absolute inset-0 -z-10">
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          poster="/hero.avif"
          className="w-full h-full object-cover opacity-50"
        >
          <source src="/hero.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-b from-[#040714]/60 via-[#040714]/40 to-[#040714]" />
        {/* Brand-blue radial glow */}
        <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[1100px] h-[1100px] rounded-full bg-[#0064E0] opacity-[0.18] blur-[180px]" />
      </div>

      <div className="mx-auto max-w-7xl px-5 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        {/* Left: copy */}
        <div className="lg:col-span-7 relative z-10">
          <h1
            className="text-white font-extrabold tracking-tight leading-[1.05] text-5xl md:text-6xl lg:text-7xl"
            data-animate
          >
            {L('Mehr Schichten.', 'More shifts.')}
            <br />
            {L('Weniger', 'Less')}{' '}
            <span className="bg-gradient-to-r from-[#4DA3FF] via-[#0064E0] to-[#0050B3] bg-clip-text text-transparent">
              {L('Papierkram.', 'paperwork.')}
            </span>
          </h1>

          <p
            className="mt-7 max-w-xl text-base md:text-lg text-white/70 leading-relaxed"
            data-animate
            style={{ animationDelay: '120ms' }}
          >
            {L(
              'LokShift ist die Einsatzplattform für Bahnbetriebe und Logistikteams. Disposition, Zeiterfassung, Spesen und Berichte — in einer Oberfläche.',
              'LokShift is the dispatch platform for rail and logistics teams. Scheduling, time tracking, per-diem and reports — in one place.'
            )}
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-3" data-animate style={{ animationDelay: '240ms' }}>
            <Link
              href="/register"
              className="group inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-white text-[#0064E0] font-bold text-sm shadow-2xl shadow-[#0064E0]/40 hover:shadow-[#0064E0]/60 transition-all"
            >
              {L('Jetzt starten', 'Try it now')}
              <span className="w-7 h-7 rounded-full bg-[#0064E0] text-white flex items-center justify-center transition-transform group-hover:translate-x-0.5">
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </Link>
            <a
              href="#features"
              className="px-6 py-3.5 rounded-full text-sm font-semibold text-white/80 hover:text-white transition-colors"
            >
              {L('Funktionen ansehen', 'See features')}
            </a>
          </div>

          {/* Trust strip */}
          <div className="mt-12 flex flex-wrap items-center gap-x-6 gap-y-3 text-[11px] font-bold uppercase tracking-widest text-white/40" data-animate style={{ animationDelay: '320ms' }}>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#4DA3FF]" /> {L('DSGVO-konform', 'GDPR-compliant')}
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#4DA3FF]" /> {L('Hosting in der EU', 'EU hosting')}
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#4DA3FF]" /> {L('SSO + 2FA', 'SSO + 2FA')}
            </span>
          </div>
        </div>

        {/* Right: floating chips column */}
        <div className="lg:col-span-5 relative h-[420px] lg:h-[520px]">
          <FloatingChip
            text={L('Ihr smarter Disponent', 'Your smart dispatcher')}
            icon={<Sparkles className="w-3.5 h-3.5 text-[#4DA3FF]" />}
            className="top-4 left-4 lg:left-0 animate-float-slow"
          />
          <FloatingChip
            text={L('100 % Schichtabdeckung', '100% shift coverage')}
            icon={<CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
            className="top-32 right-2 lg:right-4 animate-float"
          />
          <FloatingChip
            text={L('80 % weniger Aufwand', '80% less effort')}
            icon={<Zap className="w-3.5 h-3.5 text-amber-400" />}
            className="top-72 left-12 lg:left-8 animate-float-delay"
          />

          {/* Mock app card */}
          <div
            className="absolute bottom-0 right-0 w-[300px] md:w-[360px] rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-2xl p-5 shadow-2xl shadow-[#0064E0]/30 animate-float-slow"
            data-animate
            style={{ animationDelay: '400ms' }}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/50">{L('Live-Schicht', 'Live shift')}</span>
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {L('Aktiv', 'Active')}
              </span>
            </div>
            <p className="text-white text-base font-bold">RB 33 — Düren → Köln</p>
            <p className="text-white/50 text-xs mt-1">{L('Tf · 06:42 → 14:30', 'Driver · 06:42 → 14:30')}</p>
            <div className="mt-4 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full w-3/5 bg-gradient-to-r from-[#0064E0] to-[#4DA3FF] rounded-full" />
            </div>
            <div className="mt-3 flex items-center justify-between text-[10px] font-bold text-white/40 uppercase tracking-widest">
              <span>5 / 8 {L('Stationen', 'Stops')}</span>
              <span>62%</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function FloatingChip({
  text,
  icon,
  className = '',
}: {
  text: string
  icon: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={`absolute inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.06] backdrop-blur-xl border border-white/10 text-white text-[12px] font-medium shadow-lg shadow-black/20 ${className}`}
    >
      {icon}
      <span>{text}</span>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Features grid (6 cards)
// ─────────────────────────────────────────────────────────────────────────────
function Features() {
  const { locale } = useTranslation()
  const L = (de: string, en: string) => (locale === 'de' ? de : en)

  const features = [
    {
      icon: ClipboardList,
      title: L('Smarte Disposition', 'Smart dispatch'),
      desc: L(
        'Schichten in Sekunden zuweisen — mit Qualifikations- und Verfügbarkeitscheck in Echtzeit.',
        'Assign shifts in seconds with real-time qualification and availability checks.'
      ),
    },
    {
      icon: Calendar,
      title: L('Zeitkonto & Spesen', 'Time accounts & per diem'),
      desc: L(
        'Soll/Ist, Überstunden und Verpflegungsspesen — automatisch berechnet, gesetzeskonform.',
        'Target/actual, overtime and per-diem — calculated automatically and legally compliant.'
      ),
    },
    {
      icon: Activity,
      title: L('Live-Betrieb', 'Live operations'),
      desc: L(
        'Wer ist wo? Echtzeit-Karte mit Schichten, Statusupdates und ETA-Prognose pro Mitarbeiter.',
        'Who is where? Real-time map with shifts, status updates and per-employee ETA forecasts.'
      ),
    },
    {
      icon: FileText,
      title: L('PDF-Berichte', 'PDF reports'),
      desc: L(
        'Arbeitszeitberichte, Spesenabrechnungen und Lohnvorbereitung mit einem Klick.',
        'Work-time reports, per-diem statements and payroll prep with a single click.'
      ),
    },
    {
      icon: Bell,
      title: L('Benachrichtigungen', 'Notifications'),
      desc: L(
        'E-Mail, In-App und WhatsApp — Schichtänderungen erreichen Ihr Team sofort.',
        'Email, in-app and WhatsApp — shift changes reach your team instantly.'
      ),
    },
    {
      icon: Wallet,
      title: L('Urlaubs- & Bonus', 'Vacation & bonus'),
      desc: L(
        'Urlaubsgeld, Weihnachts­bonus und Sonderzahlungen zentral verwalten und auszahlen.',
        'Vacation pay, Christmas bonuses and special payments — managed and paid centrally.'
      ),
    },
  ]

  return (
    <section id="features" className="relative bg-white py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="mx-auto max-w-2xl text-center" data-animate>
          <span className="inline-block px-3 py-1 rounded-full bg-blue-50 text-[#0064E0] text-[11px] font-bold uppercase tracking-widest">
            {L('Hauptfunktionen', 'Main features')}
          </span>
          <h2 className="mt-5 text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900">
            {L('Eine Oberfläche für')} <span className="text-[#0064E0]">{L('alles.', 'everything.')}</span>
          </h2>
          <p className="mt-4 text-base md:text-lg text-slate-500">
            {L(
              'Sechs KI-gestützte Module, die Disposition, Zeit­erfassung und Reporting auf Autopilot stellen.',
              'Six AI-driven modules that put scheduling, time tracking and reporting on autopilot.'
            )}
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => {
            const Icon = f.icon
            return (
              <div
                key={f.title}
                data-animate
                style={{ animationDelay: `${i * 80}ms` }}
                className="group relative rounded-3xl border border-slate-100 bg-white p-7 shadow-sm hover:shadow-2xl hover:shadow-[#0064E0]/10 hover:-translate-y-1 hover:border-blue-200 transition-all duration-300"
              >
                <div className="absolute top-0 right-0 -mr-12 -mt-12 w-32 h-32 rounded-full bg-[#0064E0]/[0.05] blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#0064E0] flex items-center justify-center group-hover:bg-[#0064E0] group-hover:text-white transition-colors">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="mt-6 text-lg font-bold text-slate-900">{f.title}</h3>
                  <p className="mt-2 text-sm text-slate-500 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Impact (Quantified) — floating stat cards around a giant heading
// ─────────────────────────────────────────────────────────────────────────────
function Impact() {
  const { locale } = useTranslation()
  const L = (de: string, en: string) => (locale === 'de' ? de : en)
  const sectionRef = useRef<HTMLElement>(null)
  // 0 → section just entered viewport; 1 → about to leave. Centered so the
  // cards drift in both directions through the scroll arc.
  const progress = useSectionProgress(sectionRef)
  const t = progress - 0.5

  /*
   * Layout philosophy — match the Voxr reference exactly:
   *
   *  ┌──────────────────────────────────────────────────────────┐
   *  │ [card 1]                                          [card 2]│   ← top quadrants
   *  │                                                          │
   *  │              GIANT  HEADLINE  IN  CENTER                 │   ← uninterrupted
   *  │                                                          │
   *  │            [card 3]                  [card 4]            │   ← bottom quadrants
   *  └──────────────────────────────────────────────────────────┘
   *
   * Each quadrant gets ONE card, anchored to its own corner with explicit
   * percentage offsets so cards never visually collide regardless of scroll
   * position. Parallax depth is small (±18 to ±30px) so cards drift, never swing.
   */
  const cards = [
    {
      big: '120+',
      label: L('Schichten täglich live disponiert', 'Shifts dispatched live each day'),
      // Top-left
      style: { top: '8%', left: '0%' },
      depth: -22,
      highlight: false,
      width: 'w-[210px]',
    },
    {
      big: '24/7',
      label: L('Erreichbar — Nacht, Wochenende, Feiertag', 'Available — nights, weekends, holidays'),
      // Top-right
      style: { top: '4%', right: '0%' },
      depth: -28,
      highlight: false,
      width: 'w-[230px]',
    },
    {
      big: '80 %',
      label: L('Weniger administrativer Aufwand', 'Less admin overhead'),
      // Bottom-left
      style: { bottom: '6%', left: '6%' },
      depth: 24,
      highlight: true,
      width: 'w-[260px]',
    },
    {
      big: '<60 s',
      label: L('Reaktionszeit bei Schichtänderungen', 'Response time on shift changes'),
      // Bottom-right
      style: { bottom: '10%', right: '4%' },
      depth: 18,
      highlight: false,
      width: 'w-[210px]',
    },
  ]

  // Cards fade in as the section enters the viewport so they never overlap
  // the headline before they belong on screen.
  const fade = Math.max(0, Math.min(1, (progress + 0.1) * 1.4))

  return (
    <section
      id="impact"
      ref={sectionRef}
      // Tall enough to give each quadrant real estate; on desktop ~80vh
      className="relative bg-[#F7F9FC] py-32 md:min-h-[88vh] md:flex md:items-center overflow-hidden"
    >
      {/* Inner relative wrapper — cards are positioned against THIS, not the
          section, so percentage offsets work predictably. */}
      <div className="relative w-full mx-auto max-w-7xl px-5 lg:px-8 md:h-[680px]">
        {/* Headline — absolutely centered so it sits behind the cards visually
            but always commands the middle of the section. */}
        <div
          className="md:absolute md:inset-0 flex flex-col items-center justify-center text-center pointer-events-none"
          data-animate
        >
          <span className="inline-block px-3 py-1 rounded-full border border-[#0064E0]/30 text-[#0064E0] text-[11px] font-bold uppercase tracking-widest bg-white pointer-events-auto">
            {L('Kennzahlen', 'Key Stats')}
          </span>
          <h2 className="mt-8 text-6xl md:text-8xl lg:text-[9rem] font-extrabold tracking-tighter text-slate-900 leading-[0.9]">
            {L('Die Wirkung,')}
            <br />
            <span className="bg-gradient-to-r from-[#0064E0] to-[#0050B3] bg-clip-text text-transparent">
              {L('in Zahlen.', 'quantified.')}
            </span>
          </h2>
        </div>

        {/* Floating, parallaxing stat cards — desktop only */}
        <div className="hidden md:block">
          {cards.map((c) => (
            <div
              key={c.big}
              className={`absolute ${c.width} rounded-3xl bg-white p-5 shadow-2xl shadow-slate-200/70 border border-slate-100 ${
                c.highlight ? 'ring-2 ring-[#0064E0]/25' : ''
              }`}
              style={{
                ...c.style,
                transform: `translate3d(0, ${(t * c.depth).toFixed(2)}px, 0)`,
                opacity: fade,
                transition: 'opacity 500ms ease-out',
                willChange: 'transform',
                zIndex: 20, // sits over the headline so the percentages read as full numbers
              }}
            >
              <div
                className={`text-4xl lg:text-5xl font-extrabold tracking-tight tabular-nums leading-none ${
                  c.highlight ? 'text-[#0064E0]' : 'text-slate-900'
                }`}
              >
                {c.big}
              </div>
              <p className="mt-3 text-[11px] text-slate-500 leading-snug">{c.label}</p>
            </div>
          ))}
        </div>

        {/* Mobile fallback — clean 2x2 grid below the headline (no parallax) */}
        <div className="md:hidden mt-10 grid grid-cols-2 gap-3">
          <MobileStat big="120+" label={L('Schichten täglich', 'Shifts daily')} />
          <MobileStat big="24/7" label={L('Erreichbar', 'Available')} />
          <MobileStat big="80 %" label={L('Weniger Aufwand', 'Less effort')} highlight />
          <MobileStat big="<60 s" label={L('Reaktionszeit', 'Response time')} />
        </div>
      </div>
    </section>
  )
}

function MobileStat({ big, label, highlight = false }: { big: string; label: string; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl bg-white p-5 shadow-sm border border-slate-100 ${highlight ? 'ring-2 ring-[#0064E0]/20' : ''}`}>
      <div className={`text-3xl font-extrabold ${highlight ? 'text-[#0064E0]' : 'text-slate-900'} tabular-nums`}>{big}</div>
      <p className="mt-2 text-[11px] text-slate-500 leading-snug">{label}</p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Why LokShift — staggered cards (the "scrolling up/down on scroll" cards)
// ─────────────────────────────────────────────────────────────────────────────
function WhyLokShift() {
  const { locale } = useTranslation()
  const L = (de: string, en: string) => (locale === 'de' ? de : en)

  const cards = [
    {
      title: L('Echtzeit-Disposition', 'Real-time dispatch'),
      desc: L(
        'Verfügbarkeit, Qualifikationen und Standort in einer Ansicht. Disponieren in Sekunden statt Stunden.',
        'Availability, qualifications and location in one view. Dispatch in seconds, not hours.'
      ),
      impact: L('Eine Plattform für jeden Schritt.', 'One platform for every motion.'),
      offset: 'translate-y-12',
    },
    {
      title: L('Mobile-First', 'Mobile-first'),
      desc: L(
        'Mitarbeiter stempeln, melden und kommunizieren direkt vom Smartphone — ohne App-Store-Hürden.',
        'Employees clock in, report and communicate directly from their phones — no app-store hurdles.'
      ),
      impact: L('Jeder im Team. Immer im Bilde.', 'Everyone on the team. Always in the loop.'),
      offset: '',
    },
    {
      title: L('Live-Übergaben', 'Live handovers'),
      desc: L(
        'Wenn ein Mitarbeiter ausfällt, übernimmt LokShift automatisch — Disponent informiert, Ersatz vorgeschlagen.',
        'When someone calls out, LokShift takes over automatically — dispatcher notified, replacement suggested.'
      ),
      impact: L('Weniger Reibung. Mehr Abschlüsse.', 'Less friction. More closes.'),
      offset: 'translate-y-20',
    },
  ]

  return (
    <section id="why" className="relative bg-[#040714] py-28 md:py-40 overflow-hidden">
      {/* glow */}
      <div className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 w-[900px] h-[900px] rounded-full bg-[#0064E0] opacity-[0.12] blur-[160px]" />

      <div className="mx-auto max-w-7xl px-5 lg:px-8 relative">
        <div className="flex items-end justify-between flex-wrap gap-6 mb-16" data-animate>
          <div>
            <span className="inline-block px-3 py-1 rounded-full border border-white/10 text-white/70 text-[11px] font-bold uppercase tracking-widest bg-white/5 backdrop-blur">
              {L('Vorteile', 'Our Benefits')}
            </span>
            <h2 className="mt-6 text-4xl md:text-6xl font-extrabold tracking-tight text-white leading-[1.05]">
              {L('Warum')} <br className="md:hidden" />
              {L('LokShift?', 'LokShift?')}
            </h2>
          </div>
          <div className="hidden md:flex items-center gap-2 text-white/60">
            <button className="w-10 h-10 rounded-full border border-white/10 hover:bg-white/5 flex items-center justify-center transition-colors" aria-label="Previous">
              <ArrowRight className="w-4 h-4 rotate-180" />
            </button>
            <button className="w-10 h-10 rounded-full border border-white/10 hover:bg-white/5 flex items-center justify-center transition-colors" aria-label="Next">
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 items-start">
          {cards.map((c, i) => (
            <div
              key={c.title}
              data-animate
              style={{ animationDelay: `${i * 120}ms` }}
              className={`md:${c.offset} rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] backdrop-blur-xl p-7 hover:border-[#4DA3FF]/40 transition-all duration-500`}
            >
              <h3 className="text-2xl font-bold text-white tracking-tight">{c.title}</h3>
              <p className="mt-4 text-sm text-white/60 leading-relaxed">{c.desc}</p>
              <div className="mt-7 pt-6 border-t border-white/10">
                <p className="text-[10px] font-black uppercase tracking-widest text-[#4DA3FF]">{L('Wirkung', 'Impact')}</p>
                <p className="mt-1.5 text-sm font-semibold text-white">{c.impact}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Case Study
// ─────────────────────────────────────────────────────────────────────────────
function CaseStudy() {
  const { locale } = useTranslation()
  const L = (de: string, en: string) => (locale === 'de' ? de : en)

  return (
    <section className="relative bg-[#040714] pb-28 md:pb-40">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="text-center mb-16" data-animate>
          <span className="inline-block px-3 py-1 rounded-full border border-white/10 text-white/70 text-[11px] font-bold uppercase tracking-widest bg-white/5">
            {L('Praxisbericht', 'Case Studies')}
          </span>
          <h2 className="mt-6 text-4xl md:text-6xl font-extrabold tracking-tight text-white leading-[1.05]">
            {L('Disposition,')} <br className="md:hidden" />
            <span className="bg-gradient-to-r from-[#4DA3FF] to-[#0064E0] bg-clip-text text-transparent">
              {L('die liefert.', 'that delivers.')}
            </span>
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Left side stats — LokShift-specific outcomes for the Rheinmaasrail rollout */}
          <div className="lg:col-span-3 space-y-5" data-animate>
            <CaseStat
              big="7 Tage"
              label={L('Vom Kick-off bis zur produktiven Disposition', 'From kick-off to productive dispatch')}
            />
            <CaseStat
              big="0"
              label={L('Verlorene Schichten seit Go-Live', 'Lost shifts since go-live')}
            />
            <CaseStat
              big="−12 Std."
              label={L('Pro Disponent eingesparte Wochenzeit', 'Hours saved per dispatcher each week')}
            />
          </div>

          {/* Center card */}
          <div className="lg:col-span-6" data-animate style={{ animationDelay: '120ms' }}>
            <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-transparent backdrop-blur-xl p-8 md:p-10">
              <div className="flex flex-wrap gap-2 mb-5">
                {[L('Bahn', 'Rail'), L('Logistik', 'Logistics'), L('ÖPNV', 'Public transit')].map((t) => (
                  <span key={t} className="px-3 py-1 rounded-full bg-white/[0.06] border border-white/10 text-[11px] font-bold text-white/70">
                    {t}
                  </span>
                ))}
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-white">
                {L('Rheinmaasrail → 100 % Schichtabdeckung', 'Rheinmaasrail → 100% shift coverage')}
              </h3>
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#4DA3FF]">{L('Herausforderung', 'Challenge')}</p>
                  <p className="mt-2 text-sm text-white/70 leading-relaxed">
                    {L(
                      'Disposition über Excel und WhatsApp. Keine Echtzeit-Sicht auf Verfügbarkeit, Spesen und Zeitkonten. Auswertungen brauchten Tage.',
                      'Dispatch over Excel and WhatsApp. No real-time view of availability, per-diem or time accounts. Reports took days.'
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#4DA3FF]">{L('Lösung', 'Solution')}</p>
                  <p className="mt-2 text-sm text-white/70 leading-relaxed">
                    {L(
                      'LokShift bündelt Disposition, Zeitkonto und Spesen. Mitarbeiter stempeln vom Smartphone. Berichte stehen auf Knopfdruck bereit.',
                      'LokShift bundles dispatch, time accounts and per-diem. Employees clock in from their phones. Reports are one click away.'
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right testimonial */}
          <div className="lg:col-span-3" data-animate style={{ animationDelay: '240ms' }}>
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-7 relative">
              <div className="absolute -top-4 left-7 w-9 h-9 rounded-full bg-[#0064E0] flex items-center justify-center text-white text-lg font-serif">"</div>
              <p className="text-sm text-white/70 leading-relaxed pt-4">
                {L(
                  'Vorher haben wir die Hälfte der Zeit mit Telefonieren verbracht. Heute sehen wir auf einen Blick, wer wann verfügbar ist — und das Team weiß es vor uns.',
                  'We used to spend half our time on the phone. Today we see at a glance who is available when — and the team knows before we do.'
                )}
              </p>
              <p className="mt-5 text-xs font-bold text-white">— Disponent, Rheinmaasrail</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function CaseStat({ big, label }: { big: string; label: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <div className="text-3xl font-extrabold text-[#4DA3FF] tabular-nums">{big}</div>
      <p className="mt-2 text-xs text-white/60 leading-snug">{label}</p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Promo banner before FAQ
// ─────────────────────────────────────────────────────────────────────────────
function PromoBanner() {
  const { locale } = useTranslation()
  const L = (de: string, en: string) => (locale === 'de' ? de : en)

  return (
    <section className="relative bg-white">
      <div className="mx-auto max-w-7xl px-5 lg:px-8 -translate-y-16">
        <div className="rounded-[2.5rem] bg-gradient-to-br from-[#0064E0] to-[#0050B3] p-8 md:p-14 grid grid-cols-1 md:grid-cols-2 gap-8 items-center shadow-2xl shadow-[#0064E0]/30 overflow-hidden relative" data-animate>
          {/* decorative grid */}
          <div className="pointer-events-none absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />

          <div className="relative">
            <div className="aspect-[16/10] rounded-2xl bg-[#0A0F1F] border border-white/10 shadow-2xl overflow-hidden p-4">
              <div className="flex items-center gap-1.5 mb-3">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <span className="ml-3 text-[10px] font-bold text-white/50">LokShift · {L('Disposition', 'Dispatch')}</span>
              </div>
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-7 rounded-md bg-white/5 flex items-center px-2 gap-2">
                    <div className="w-5 h-5 rounded bg-[#0064E0]/40" />
                    <div className="flex-1 h-2 rounded bg-white/10" />
                    <div className="w-12 h-4 rounded bg-emerald-500/20" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="relative text-white">
            <h3 className="text-3xl md:text-4xl font-extrabold tracking-tight leading-tight">
              {L('Schluss mit verlorenen Schichten.', 'Stop losing shifts.')}
              <br />
              <span className="text-white/80">{L('Mehr Effizienz, mehr Klarheit.', 'More efficiency, more clarity.')}</span>
            </h3>
            <Link
              href="/register"
              className="mt-8 inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-white text-[#0064E0] font-bold text-sm hover:bg-blue-50 transition-colors"
            >
              {L('Jetzt starten', 'Try it now')}
              <span className="w-7 h-7 rounded-full bg-[#0064E0] text-white flex items-center justify-center">
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  FAQ
// ─────────────────────────────────────────────────────────────────────────────
function FAQ() {
  const { locale } = useTranslation()
  const L = (de: string, en: string) => (locale === 'de' ? de : en)
  const [open, setOpen] = useState<number | null>(0)

  const items = [
    {
      q: L('Wie schnell sind wir live?', 'How fast can we launch?'),
      a: L(
        'Die meisten Teams sind innerhalb von 7 Tagen produktiv. Wir migrieren Ihre Mitarbeiter, Schichten und Stammdaten und schulen Disponenten in einer 60-Minuten-Session.',
        'Most teams are productive within 7 days. We migrate your employees, shifts and master data and train dispatchers in a 60-minute session.'
      ),
    },
    {
      q: L('Funktioniert das auch für kleine Teams?', 'Does this work for small teams?'),
      a: L(
        'Ja. LokShift skaliert von 5 bis 5.000 Mitarbeitern. Der Starter-Tarif ist auf kleine Teams zugeschnitten und kostet weniger als ein Wochenende Telefonieren.',
        'Yes. LokShift scales from 5 to 5,000 employees. The Starter plan is built for small teams and costs less than a weekend on the phone.'
      ),
    },
    {
      q: L('Wie sieht es mit DSGVO aus?', 'What about GDPR?'),
      a: L(
        'Wir hosten ausschließlich in der EU (Frankfurt), schließen einen AVV mit Ihnen ab und löschen Daten gemäß Ihren Aufbewahrungs­fristen. Alle Backups sind verschlüsselt.',
        'We host exclusively in the EU (Frankfurt), sign a DPA with you and delete data per your retention rules. All backups are encrypted.'
      ),
    },
    {
      q: L('Können wir bestehende Systeme anbinden?', 'Can we connect existing systems?'),
      a: L(
        'Ja — Lohnbuchhaltung, ERP und Kalender via API oder Webhook. Native Integrationen für DATEV, SAP und Outlook sind in Arbeit.',
        'Yes — payroll, ERP and calendar via API or webhook. Native integrations for DATEV, SAP and Outlook are in progress.'
      ),
    },
    {
      q: L('Was passiert bei einem Ausfall?', 'What happens if someone calls out?'),
      a: L(
        'LokShift schlägt automatisch qualifizierte Ersatzkräfte vor und benachrichtigt Disponent + Mitarbeiter. Die Schicht steht in Minuten — nicht Stunden — wieder.',
        'LokShift automatically suggests qualified replacements and notifies dispatcher + employees. The shift is restored in minutes — not hours.'
      ),
    },
    {
      q: L('Bekommen wir Echtzeit-Support?', 'Do we get real-time support?'),
      a: L(
        'Pro- und Enterprise-Kunden haben einen dedizierten Slack-Kanal mit unserem Team. Antwortzeit < 2 Stunden in Geschäftszeiten.',
        'Pro and Enterprise customers get a dedicated Slack channel with our team. Response time < 2 hours during business hours.'
      ),
    },
  ]

  return (
    <section id="faq" className="relative bg-[#F7F9FC] py-24 md:py-32">
      <div className="mx-auto max-w-3xl px-5 lg:px-8">
        <div className="text-center" data-animate>
          <span className="inline-block px-3 py-1 rounded-full bg-blue-50 text-[#0064E0] text-[11px] font-bold uppercase tracking-widest">
            {L('Häufige Fragen', 'FAQ')}
          </span>
          <h2 className="mt-6 text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight">
            {L('Antworten zu')} <span className="text-[#0064E0]">{L('häufigen Fragen.', 'common questions.')}</span>
          </h2>
        </div>

        <div className="mt-14 space-y-3">
          {items.map((it, i) => (
            <div
              key={i}
              data-animate
              style={{ animationDelay: `${i * 50}ms` }}
              className="rounded-2xl bg-white border border-slate-100 overflow-hidden shadow-sm"
            >
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left hover:bg-slate-50 transition-colors"
              >
                <span className="text-sm md:text-base font-bold text-slate-900">{it.q}</span>
                <span
                  className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                    open === i ? 'bg-[#0064E0] text-white rotate-45' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  <span className="text-lg leading-none">+</span>
                </span>
              </button>
              {open === i && (
                <div className="px-6 pb-5 text-sm text-slate-500 leading-relaxed animate-in fade-in slide-in-from-top-1 duration-200">
                  {it.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Final CTA — glowing orb
// ─────────────────────────────────────────────────────────────────────────────
function FinalCTA() {
  const { locale } = useTranslation()
  const L = (de: string, en: string) => (locale === 'de' ? de : en)

  /*
   * Voxr-style "Get Started" CTA — REBUILT to match the reference layout exactly.
   *
   * Layout (top → bottom, all centered):
   *   1. "Jetzt starten" badge        — sits on the dark page bg
   *   2. Big two-line headline         — sits on the dark page bg
   *   3. Subtitle + buttons            — overlap the orb's upper rim
   *   4. Orb / eclipse                 — fills the lower portion of the section
   *
   * The orb is a real circle (51.25rem × 51.25rem) painted with a vertical
   * gradient body + inset box-shadow stack for the lit upper rim. We do NOT
   * heavy-blur the main orb — only ~6-10px so the rim stays visible as a
   * defined arc of light, exactly like the reference. A second copy of the
   * same orb (heavy blur, lower opacity) sits behind for the soft halo bleed.
   *
   * Color translation Voxr → LokShift:
   *   #fffc     → rgba(255,255,255,0.78)  (lit white rim)
   *   #ca5cf3   → #4DA3FF                 (light brand-blue mid-glow)
   *   #5d248c   → #0050B3                 (deep brand-blue body)
   *   #0b040d   → #040714                 (page background)
   */

  return (
    /*
     * Voxr ".contact-us" section — implemented 1:1 from the inspected CSS the
     * user shared. Brand-blue translation:
     *   #0b040d → #040714   (page background)
     *   #ca5cf3 → #4DA3FF   (light brand-blue mid-glow)
     *   #5d248c → #0050B3   (deep brand-blue rim)
     *   #ddbbf1 → #9CC8FF   (badge accent)
     *
     * Layout (top → bottom of section):
     *   padding-top: 13.19rem
     *   ── badge ──
     *   ── 2-line headline ──
     *   ── 1-line subtitle ──
     *   ── buttons ──
     *   wrapper @ top:26.25rem, h:25.19rem, overflow:hidden
     *     └ orb (anchored at bottom:0 of wrapper, 51.25rem circle)
     *       inset shadows at NEGATIVE y → glow at BOTTOM rim
     *   decoration-blur @ top:25.94rem, h:23.88rem (dark fade over orb top)
     *   wrapper.is-shadow @ top:56.31rem, h:16.06rem (REFLECTION, smaller)
     *   decoration-blur.is-shadow @ top:54.69rem, h:15.31rem
     *   padding-bottom: 50rem (lots of space below for reflection)
     */
    /*
      Eclipse uses min()/clamp() so every dimension scales between
      mobile (430px viewport) and ultrawide (1600px+) without distortion.
      The orb stays circular because width === height (both clamped to
      `min(orbMaxRem, vwScalar)`). The section min-height is also
      responsive so we don't get hundreds of pixels of dead space on
      mobile while still fitting the reflection on desktop.
    */
    <section
      className="relative overflow-hidden"
      style={{
        backgroundColor: '#040714',
        paddingTop: 'clamp(4rem, 14vw, 8rem)',
        // Reflection ends at ~72.37rem from section top on desktop. On
        // mobile the eclipse is half-scale, so 50rem covers it. clamp
        // gives a smooth ramp.
        minHeight: 'clamp(46rem, 160vw, 74rem)',
        paddingBottom: 0,
      }}
    >
      {/* Decorative question mark glyphs — match Voxr's .contact-us-symbol */}
      <DecorativeQuestionMark
        className="absolute w-32 md:w-44 hidden sm:block"
        style={{ top: '3.03rem', left: '4.88rem', height: '8rem', transform: 'rotate(-18deg)', opacity: 0.08 }}
      />
      <DecorativeQuestionMark
        className="absolute w-32 md:w-44 hidden sm:block"
        style={{ top: '-3.94rem', right: '9.63rem', height: '9.38rem', transform: 'rotate(14deg)', opacity: 0.08 }}
      />

      {/* ── Centered content (badge + headline + subtitle + buttons) ─────── */}
      <div className="relative z-10 mx-auto px-5 lg:px-8 text-center flex flex-col items-center gap-6 md:gap-8" data-animate>
        {/* Badge with subtle base-glow (matches Voxr .hero-label) */}
        <div
          className="inline-flex items-center px-5 py-3 rounded-full text-[14px] font-medium text-[#9CC8FF] relative"
          style={{
            backgroundColor: 'rgba(255,255,255,0.03)',
            backgroundImage:
              'radial-gradient(circle farthest-side at 50% 600%, rgba(112,170,235,0.5) 65%, rgba(14,14,14,0.5))',
            outline: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          {L('Jetzt starten', 'Get started')}
        </div>

        {/* Headline — short + 2 hard lines, scaled down so it never overflows */}
        <h2 className="font-bold tracking-tight text-white text-center max-w-[640px] mx-auto"
            style={{ fontSize: 'clamp(1.875rem, 4vw, 3.25rem)', lineHeight: 1.1 }}>
          {L('Mehr Schichten.', 'More shifts.')}
          <br />
          <span
            style={{
              backgroundImage: 'linear-gradient(135deg, #FFFFFF 0%, #9CC8FF 60%, #4DA3FF 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            {L('Weniger Papierkram.', 'Less paperwork.')}
          </span>
        </h2>

        {/* Subtitle */}
        <p className="text-white/70 text-base max-w-[370px]">
          {L(
            'Starten Sie Ihre erste Disposition diese Woche. Ergebnisse in Tagen, nicht Monaten.',
            'Launch your first dispatch this week. Results in days, not months.'
          )}
        </p>

        {/* Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 mt-2">
          <Link
            href="/register"
            className="group inline-flex items-center gap-3 pl-6 pr-1.5 py-1.5 rounded-full bg-white text-slate-900 font-semibold text-[15px] shadow-[0_0_30px_rgba(0,100,224,0.35)] hover:shadow-[0_0_45px_rgba(0,100,224,0.55)] transition-all"
            style={{ outline: '1px solid rgba(255,255,255,0.6)' }}
          >
            {L('Demo starten', 'Start demo')}
            <span className="w-10 h-10 rounded-full bg-[#0064E0] text-white flex items-center justify-center">
              <ArrowRight className="w-4 h-4" />
            </span>
          </Link>
          <a
            href="mailto:hello@lokshift.de"
            className="group inline-flex items-center gap-3 pl-6 pr-1.5 py-1.5 rounded-full text-white font-semibold text-[15px] transition-colors"
            style={{
              backgroundColor: 'rgba(255,255,255,0.04)',
              outline: '1px solid rgba(255,255,255,0.15)',
            }}
          >
            {L('Kontakt', 'Contact us')}
            <span className="w-10 h-10 rounded-full border border-white/15 bg-white/5 text-white flex items-center justify-center">
              <ArrowRight className="w-4 h-4" />
            </span>
          </a>
        </div>
      </div>

      {/* ─── ECLIPSE — exact 1:1 port of Voxr's CSS, responsive via clamp() ── */}

      {/*
        ORB SIZE — `min(51.25rem, 110vw)` for BOTH width and height so the
        orb stays circular on every viewport (was tall-oval on mobile when
        only width was clamped). On desktop ≥ 880px we get the full
        51.25rem (820px); on a 430px phone we get ~470px (110vw).

        WRAPPER HEIGHT — clamp(13rem, 50vw, 25.19rem). On mobile the
        wrapper is shorter so the visible portion of the orb stays a
        balanced half-dome instead of a thin slice.

        TOP INSET — clamp(13rem, 50vw, 26.25rem). Pushes the eclipse down
        proportionally to where the centered content ends.
      */}

      {/*
        Centering technique — was using `left:0 right:0 mx-auto` which is
        unreliable when the element is wider than its parent (the eclipse
        wrappers are 120vw on mobile, intentionally wider than the
        viewport for visual bleed). Switched to `left:50% +
        translateX(-50%)` everywhere — guaranteed center regardless of
        width or viewport size.
      */}

      {/* Decoration blur — dark gradient veil over the orb's top edge so the
          orb fades into the page instead of cutting off sharply. */}
      <div
        aria-hidden
        className="absolute pointer-events-none"
        style={{
          width: 'min(57.56rem, 120vw)',
          height: 'clamp(13rem, 47vw, 23.88rem)',
          top: 'clamp(13rem, 50vw, 25.94rem)',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundImage: 'linear-gradient(#040714, rgba(4,7,20,0))',
          zIndex: 2,
        }}
      />

      {/* Main orb wrapper — overflow:hidden, clips orb to its bottom half. */}
      <div
        aria-hidden
        className="absolute pointer-events-none"
        style={{
          width: 'min(57.56rem, 120vw)',
          height: 'clamp(13rem, 50vw, 25.19rem)',
          top: 'clamp(13rem, 50vw, 26.25rem)',
          left: '50%',
          transform: 'translateX(-50%)',
          overflow: 'hidden',
          zIndex: 1,
        }}
      >
        {/* The orb itself — anchored at bottom of wrapper, centered
            horizontally with translateX(-50%). Inset shadows with NEGATIVE
            y-offsets put the bright rim at the BOTTOM curve. */}
        <div
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0), rgba(255,255,255,0.15)), linear-gradient(#040714, #040714)',
            borderRadius: '100%',
            width: 'min(51.25rem, 110vw)',
            height: 'min(51.25rem, 110vw)', // === width to keep it a circle
            position: 'absolute',
            bottom: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            boxShadow: [
              'inset 0 -19px 20px 2px rgba(255,255,255,0.78)',
              'inset 0 -28px 42.7px 12px #4DA3FF',
              'inset 0 -79px 62.5px 14px #0050B3',
            ].join(', '),
          }}
        />
      </div>

      {/* ─── REFLECTION (the .is-shadow copy below the orb) ───────────────── */}

      {/* Reflection's decoration-blur veil */}
      <div
        aria-hidden
        className="absolute pointer-events-none"
        style={{
          width: 'min(57.56rem, 120vw)',
          height: 'clamp(8rem, 30vw, 15.31rem)',
          top: 'clamp(35rem, 105vw, 54.69rem)',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundImage: 'linear-gradient(#040714, rgba(4,7,20,0))',
          zIndex: 2,
        }}
      />

      {/* Reflection wrapper — same overflow:hidden trick, smaller slot. */}
      <div
        aria-hidden
        className="absolute pointer-events-none"
        style={{
          width: 'min(57.56rem, 120vw)',
          height: 'clamp(8rem, 32vw, 16.06rem)',
          top: 'clamp(36rem, 108vw, 56.31rem)',
          left: '50%',
          transform: 'translateX(-50%)',
          overflow: 'hidden',
          opacity: 0.55,
          zIndex: 1,
        }}
      >
        <div
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0), rgba(255,255,255,0.15)), linear-gradient(#040714, #040714)',
            borderRadius: '100%',
            width: 'min(51.25rem, 110vw)',
            height: 'min(51.25rem, 110vw)', // circle
            position: 'absolute',
            bottom: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            boxShadow: [
              'inset 0 -19px 20px 2px rgba(255,255,255,0.78)',
              'inset 0 -28px 42.7px 12px #4DA3FF',
              'inset 0 -79px 62.5px 14px #0050B3',
            ].join(', '),
            filter: 'blur(10px)',
          }}
        />
      </div>
    </section>
  )
}

/**
 * Decorative question mark — inline SVG so we don't depend on the Voxr CDN.
 * The user pointed at https://cdn.prod.website-files.com/.../Title.svg but we
 * recreate the glyph from scratch here in a serif-ish weight that matches
 * the reference, with currentColor for theming.
 */
function DecorativeQuestionMark({
  className = '',
  style,
}: {
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <svg
      viewBox="0 0 100 140"
      fill="currentColor"
      className={`text-white ${className}`}
      style={style}
      aria-hidden
    >
      <path d="M50 20c-15 0-26 9-26 22h12c0-7 5-12 14-12s14 5 14 11c0 5-3 8-9 12-9 6-13 11-13 22v3h12v-3c0-7 3-10 10-15 8-6 12-11 12-20 0-12-11-20-26-20z" />
      <circle cx="50" cy="116" r="7" />
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Footer
// ─────────────────────────────────────────────────────────────────────────────
function Footer() {
  const { locale } = useTranslation()
  const L = (de: string, en: string) => (locale === 'de' ? de : en)

  return (
    /*
      Footer is pulled up over the bottom of the eclipse section so the
      frosted-glass card sits on top of the orb's glow bleed. The negative
      top margin overlaps the section above; the card's `backdrop-blur-xl`
      then frosts that area, producing the soft glass-on-eclipse effect.
    */
    <footer className="relative pb-10 -mt-24 sm:-mt-32 md:-mt-56 z-10">
      <div className="mx-auto max-w-7xl px-5 lg:px-8 relative">
        <div className="rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-xl p-8 md:p-12 grid grid-cols-1 md:grid-cols-4 gap-10">
          <div>
            <Link href="/" className="flex items-center gap-2 text-white">
              <Image src="/logo-1.png" alt="LokShift" width={150} height={36} className="h-9 w-auto" />
            </Link>
            <div className="mt-5 flex items-center gap-2">
              {[Linkedin, Facebook, Twitter].map((Icon, i) => (
                <a key={i} href="#" className="w-9 h-9 rounded-full border border-white/10 bg-white/[0.04] flex items-center justify-center text-white/60 hover:text-white hover:bg-white/[0.08] transition-colors">
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-widest text-white/40">{L('Rechtliches', 'Legal')}</h4>
            <ul className="mt-5 space-y-3 text-sm">
              {[
                { label: L('Datenschutz', 'Privacy Policy'), href: '/privacy' },
                { label: L('AGB', 'Terms of Service'), href: '/terms' },
                { label: L('Impressum', 'Imprint'), href: '/imprint' },
                { label: L('AVV', 'DPA'), href: '/dpa' },
              ].map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-white/70 hover:text-white transition-colors">{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-widest text-white/40">{L('Navigation', 'Navigation')}</h4>
            <ul className="mt-5 space-y-3 text-sm">
              {[
                { label: L('Funktionen', 'Features'), href: '#features' },
                { label: L('Wirkung', 'Impact'), href: '#impact' },
                { label: L('FAQ', 'FAQ'), href: '#faq' },
              ].map((l) => (
                <li key={l.href}>
                  <a href={l.href} className="text-white/70 hover:text-white transition-colors">{l.label}</a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-widest text-white/40">{L('Kontakt', 'Contact')}</h4>
            <p className="mt-5 text-sm text-white/70 leading-relaxed">
              LokShift GmbH<br />
              Berliner Str. 123<br />
              10115 Berlin
            </p>
            <a href="mailto:hello@lokshift.de" className="mt-3 block text-sm text-[#4DA3FF] hover:underline">hello@lokshift.de</a>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-between text-xs text-white/40">
          <span>© {new Date().getFullYear()} LokShift GmbH. {L('Alle Rechte vorbehalten.', 'All rights reserved.')}</span>
          <span className="hidden md:inline">{L('Hosting in Frankfurt · DSGVO-konform', 'Hosted in Frankfurt · GDPR-compliant')}</span>
        </div>
      </div>
    </footer>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Page
// ─────────────────────────────────────────────────────────────────────────────
export default function HomePage() {
  useScrollReveal()

  return (
    /*
      Page-level background is dark to match the hero, eclipse and footer.
      Every "light" section below (Features, Impact, PromoBanner, FAQ) sets
      its own explicit `bg-white` / `bg-[#F7F9FC]` so this default only
      shows through above the hero (header) and below the footer — exactly
      where we want a continuous dark surface, no more white strip below.
    */
    <main className="bg-[#040714] text-slate-900 overflow-x-hidden">
      <MarketingHeader />
      <Hero />
      <Features />
      <Impact />
      <WhyLokShift />
      <CaseStudy />
      <PromoBanner />
      <FAQ />
      <FinalCTA />
      <Footer />

      {/* Page-scoped CSS — scroll reveal + floating chip animation */}
      <style jsx global>{`
        [data-animate] {
          opacity: 0;
          transform: translateY(24px);
          transition: opacity 700ms cubic-bezier(0.16, 1, 0.3, 1),
                      transform 700ms cubic-bezier(0.16, 1, 0.3, 1);
        }
        [data-animate].is-visible {
          opacity: 1;
          transform: translateY(0);
        }
        @media (prefers-reduced-motion: reduce) {
          [data-animate] {
            opacity: 1 !important;
            transform: none !important;
            transition: none !important;
          }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-10px); }
        }
        @keyframes float-delay {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-14px); }
        }
        @keyframes float-slow {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-7px); }
        }
        .animate-float       { animation: float 4.5s ease-in-out infinite; }
        .animate-float-delay { animation: float-delay 5.5s ease-in-out infinite 0.7s; }
        .animate-float-slow  { animation: float-slow 6.5s ease-in-out infinite 0.3s; }
      `}</style>
    </main>
  )
}
