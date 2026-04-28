'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/user-context'
import { useTranslation } from '@/lib/i18n'
import { toast } from 'sonner'
import {
  ChevronLeft,
  Loader2,
  CreditCard,
  Users,
  FileText,
  HardDrive,
  Sparkles,
  Check,
  Download,
  ArrowUpRight,
} from 'lucide-react'

/**
 * Abrechnung & Tarife — admin-only billing & usage overview.
 * Reads plan_tier / plan_seats / plan_renews_at from organizations and
 * derives current usage by counting profiles, plans, time_entries.
 *
 * Note: invoice download links assume a Stripe integration; we render a
 * placeholder list with mock invoices when the org has no Stripe data.
 */

type Plan = {
  id: string
  name: { de: string; en: string }
  priceEur: number
  features: { de: string; en: string }[]
  highlight?: boolean
}

const PLANS: Plan[] = [
  {
    id: 'starter',
    name: { de: 'Starter', en: 'Starter' },
    priceEur: 49,
    features: [
      { de: 'Bis zu 10 Mitarbeiter', en: 'Up to 10 employees' },
      { de: 'Basis-Disposition', en: 'Basic dispatch' },
      { de: 'In-App Benachrichtigungen', en: 'In-app notifications' },
    ],
  },
  {
    id: 'professional',
    name: { de: 'Professional', en: 'Professional' },
    priceEur: 149,
    highlight: true,
    features: [
      { de: 'Bis zu 50 Mitarbeiter', en: 'Up to 50 employees' },
      { de: 'Kalender-Sync & Erinnerungen', en: 'Calendar sync & reminders' },
      { de: 'WhatsApp-Integration', en: 'WhatsApp integration' },
      { de: 'PDF-Berichte', en: 'PDF reports' },
    ],
  },
  {
    id: 'enterprise',
    name: { de: 'Enterprise', en: 'Enterprise' },
    priceEur: 0, // "On request"
    features: [
      { de: 'Unbegrenzte Mitarbeiter', en: 'Unlimited employees' },
      { de: 'SSO & SCIM-Bereitstellung', en: 'SSO & SCIM provisioning' },
      { de: 'Audit-Log & Erweiterte RBAC', en: 'Audit log & advanced RBAC' },
      { de: 'Dedizierter Support', en: 'Dedicated support' },
    ],
  },
]

export default function BillingPage() {
  const router = useRouter()
  const supabase = createClient()
  const { profile, isAdmin, isLoading } = useUser()
  const { locale } = useTranslation()
  const L = (de: string, en: string) => (locale === 'de' ? de : en)

  const [loading, setLoading] = useState(true)
  const [planTier, setPlanTier] = useState<string>('starter')
  const [planSeats, setPlanSeats] = useState<number>(10)
  const [renewsAt, setRenewsAt] = useState<string | null>(null)
  const [usage, setUsage] = useState({ users: 0, plans: 0, missions30d: 0, storageMb: 0 })

  useEffect(() => {
    if (!isLoading && !isAdmin) router.replace('/dashboard')
  }, [isLoading, isAdmin, router])

  useEffect(() => {
    if (!profile?.organization_id) return
    ;(async () => {
      const { data: org } = await supabase
        .from('organizations')
        .select('plan_tier, plan_seats, plan_renews_at')
        .eq('id', profile.organization_id)
        .single()
      if (org) {
        setPlanTier(org.plan_tier || 'starter')
        setPlanSeats(org.plan_seats || 10)
        setRenewsAt(org.plan_renews_at || null)
      }

      const since = new Date()
      since.setDate(since.getDate() - 30)

      const [usersRes, plansRes, recentRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('organization_id', profile.organization_id),
        supabase.from('plans').select('id', { count: 'exact', head: true }).eq('organization_id', profile.organization_id),
        supabase.from('plans').select('id', { count: 'exact', head: true })
          .eq('organization_id', profile.organization_id)
          .gte('start_time', since.toISOString()),
      ])

      setUsage({
        users: usersRes.count || 0,
        plans: plansRes.count || 0,
        missions30d: recentRes.count || 0,
        storageMb: 0, // computed by a separate aggregation; placeholder for now
      })
      setLoading(false)
    })()
  }, [profile?.organization_id, supabase])

  const switchPlan = async (newTier: string) => {
    if (!profile?.organization_id || newTier === planTier) return
    try {
      const { error } = await supabase
        .from('organizations')
        .update({ plan_tier: newTier })
        .eq('id', profile.organization_id)
      if (error) throw error
      setPlanTier(newTier)
      toast.success(L('Tarif geändert', 'Plan changed'))
    } catch (err: any) {
      toast.error(err.message || L('Wechsel fehlgeschlagen', 'Plan change failed'))
    }
  }

  if (isLoading || loading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <Loader2 className="w-7 h-7 animate-spin text-blue-500" />
      </div>
    )
  }

  const currentPlan = PLANS.find(p => p.id === planTier) || PLANS[0]
  const seatPct = Math.min(100, Math.round((usage.users / planSeats) * 100))

  // Mock invoice list — replace with Stripe customer portal once integration ships
  const invoices = renewsAt
    ? Array.from({ length: 3 }).map((_, i) => {
        const d = new Date(renewsAt)
        d.setMonth(d.getMonth() - (i + 1))
        return {
          id: `INV-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`,
          date: d.toISOString(),
          amount: currentPlan.priceEur,
          status: 'paid' as const,
        }
      })
    : []

  return (
    <div className="max-w-5xl mx-auto pb-12">
      <Link
        href="/dashboard/settings"
        className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 transition-colors mb-4"
      >
        <ChevronLeft className="w-3 h-3" /> {L('Einstellungen', 'Settings')}
      </Link>

      <div className="flex items-center gap-4 mb-8">
        <div className="h-12 w-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg">
          <CreditCard className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-[#0064E0] leading-tight">
            {L('Abrechnung & Tarife', 'Billing & Plans')}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {L('Aktueller Tarif, Verbrauch und Rechnungen.', 'Current plan, usage and invoices.')}
          </p>
        </div>
      </div>

      {/* Current plan card */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-500 rounded-3xl p-8 text-white shadow-xl shadow-blue-200 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-100">
              {L('Aktueller Tarif', 'Current plan')}
            </p>
            <h2 className="text-3xl font-bold mt-1">{L(currentPlan.name.de, currentPlan.name.en)}</h2>
            <p className="text-blue-100 text-sm mt-2">
              {currentPlan.priceEur === 0
                ? L('Auf Anfrage', 'On request')
                : `${currentPlan.priceEur} € / ${L('Monat', 'month')}`}
              {renewsAt && (
                <> · {L('Verlängerung', 'Renews')}: {new Date(renewsAt).toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-US')}</>
              )}
            </p>
          </div>
          <button className="bg-white text-blue-600 px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-blue-50 transition-colors inline-flex items-center gap-1.5 self-start md:self-center">
            <ArrowUpRight className="w-4 h-4" />
            {L('Tarif verwalten', 'Manage plan')}
          </button>
        </div>
      </div>

      {/* Usage stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <UsageCard icon={Users} label={L('Mitarbeiter', 'Employees')} value={`${usage.users} / ${planSeats}`} pct={seatPct} />
        <UsageCard icon={FileText} label={L('Einsätze gesamt', 'Total missions')} value={String(usage.plans)} />
        <UsageCard icon={Sparkles} label={L('Letzte 30 Tage', 'Last 30 days')} value={String(usage.missions30d)} />
        <UsageCard icon={HardDrive} label={L('Speicher', 'Storage')} value={`${usage.storageMb} MB`} />
      </div>

      {/* Plan options */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 md:p-8 mb-8">
        <h2 className="text-base font-bold text-slate-900 mb-1">
          {L('Tarif wechseln', 'Switch plan')}
        </h2>
        <p className="text-sm text-slate-500 mb-6">
          {L('Wählen Sie den passenden Tarif für Ihr Team.', 'Choose the right plan for your team.')}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PLANS.map(p => {
            const isCurrent = p.id === planTier
            return (
              <div
                key={p.id}
                className={`rounded-2xl border p-6 flex flex-col ${p.highlight ? 'border-blue-200 bg-blue-50/40' : 'border-slate-100'}`}
              >
                {p.highlight && (
                  <span className="inline-flex items-center self-start mb-3 px-2.5 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest">
                    {L('Beliebt', 'Popular')}
                  </span>
                )}
                <h3 className="text-lg font-bold text-slate-900">{L(p.name.de, p.name.en)}</h3>
                <p className="mt-1 text-2xl font-black text-slate-900">
                  {p.priceEur === 0 ? L('Auf Anfrage', 'On request') : `${p.priceEur} €`}
                  {p.priceEur > 0 && <span className="text-sm font-semibold text-slate-400 ml-1">/ {L('Monat', 'mo')}</span>}
                </p>
                <ul className="mt-4 space-y-2 flex-1">
                  {p.features.map(f => (
                    <li key={f.en} className="flex items-start gap-2 text-sm text-slate-600">
                      <Check className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                      {L(f.de, f.en)}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => switchPlan(p.id)}
                  disabled={isCurrent}
                  className={`mt-6 w-full py-2.5 rounded-xl font-semibold text-sm transition-colors ${
                    isCurrent
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      : p.highlight
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {isCurrent ? L('Aktuell', 'Current') : L('Wählen', 'Select')}
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Invoices */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 md:px-8 py-5 border-b border-slate-100 flex items-center justify-between gap-4">
          <h2 className="text-base font-bold text-slate-900">{L('Rechnungen', 'Invoices')}</h2>
        </div>
        {invoices.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            {L('Noch keine Rechnungen vorhanden.', 'No invoices yet.')}
          </div>
        ) : (
          <ul className="divide-y divide-slate-50">
            {invoices.map(inv => (
              <li key={inv.id} className="flex items-center justify-between gap-4 px-6 md:px-8 py-4">
                <div>
                  <p className="text-sm font-bold text-slate-800">{inv.id}</p>
                  <p className="text-xs text-slate-500">
                    {new Date(inv.date).toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-US')}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-slate-700">{inv.amount} €</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">
                    {L('Bezahlt', 'Paid')}
                  </span>
                  <button className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700">
                    <Download className="w-4 h-4" />
                    PDF
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function UsageCard({
  icon: Icon,
  label,
  value,
  pct,
}: { icon: any; label: string; value: string; pct?: number }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</span>
        <Icon className="w-4 h-4 text-slate-400" />
      </div>
      <p className="text-2xl font-black text-slate-900 mt-2">{value}</p>
      {pct !== undefined && (
        <div className="mt-3 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full ${pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  )
}
