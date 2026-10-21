'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Euro, FileText, Gift, Loader2, Save, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/user-context'
import { useTranslation } from '@/lib/i18n'
import type { HolidayBonus, HolidayBonusType, SpecialPaymentDistribution } from '@/lib/types'
import type { SpecialPaymentInput } from '@/hooks/useHolidayBonus'
import { DISTRIBUTIONS, SPECIAL_PAYMENT_TYPES, monthsInPeriod, specialPaymentTypeLabel } from '@/lib/special-payments'
import { formatEuro } from '@/lib/time/format'
import { cn } from '@/lib/utils'

interface Props {
  initial?: HolidayBonus | null
  onSubmit: (data: SpecialPaymentInput) => Promise<boolean>
  onCancel: () => void
}

const thisMonth = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
const monthOf = (date?: string | null) => (date ? date.slice(0, 7) : '')
const lastDay = (month: string) => {
  const [y, m] = month.split('-').map(Number)
  return `${month}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`
}

export function SpecialPaymentForm({ initial, onSubmit, onCancel }: Props) {
  const { profile } = useUser()
  const { locale } = useTranslation()
  const L = (de: string, en: string) => (locale === 'de' ? de : en)
  const [employees, setEmployees] = useState<{ id: string; full_name: string | null }[]>([])
  const [saving, setSaving] = useState(false)

  const [employeeId, setEmployeeId] = useState(initial?.employee_id ?? '')
  const [bonusType, setBonusType] = useState<HolidayBonusType>(initial?.bonus_type ?? 'holiday_pay')
  const [title, setTitle] = useState(initial?.title ?? '')
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '')
  const [distribution, setDistribution] = useState<SpecialPaymentDistribution>(initial?.distribution ?? 'once')
  const [billingMonth, setBillingMonth] = useState(monthOf(initial?.billing_month) || thisMonth())
  const [fromMonth, setFromMonth] = useState(monthOf(initial?.period_start) || thisMonth())
  const [toMonth, setToMonth] = useState(monthOf(initial?.period_end) || thisMonth())
  const [notes, setNotes] = useState(initial?.notes ?? '')

  useEffect(() => {
    if (!profile?.organization_id) return
    createClient()
      .from('profiles')
      .select('id, full_name, is_active')
      .eq('organization_id', profile.organization_id)
      .order('full_name')
      .then(({ data }: { data: Array<{ id: string; full_name: string | null; is_active: boolean | null }> | null }) =>
        setEmployees((data ?? []).filter((p) => p.is_active !== false || p.id === initial?.employee_id)),
      )
  }, [profile?.organization_id, initial?.employee_id])

  const value = Number(amount.replace(',', '.'))
  const months = distribution === 'once' ? 1 : fromMonth && toMonth && toMonth >= fromMonth ? monthsInPeriod(fromMonth, toMonth) : 0

  const errors = useMemo(() => {
    const e: string[] = []
    if (!employeeId) e.push(L('Bitte einen Mitarbeiter auswählen.', 'Please select an employee.'))
    if (!(title.trim() || bonusType)) e.push(L('Bitte eine Bezeichnung angeben.', 'Please enter a title.'))
    if (!Number.isFinite(value) || value <= 0) e.push(L('Bitte einen Betrag größer 0 eingeben.', 'Please enter an amount above 0.'))
    if (distribution === 'once' && !billingMonth) e.push(L('Bitte den Abrechnungsmonat wählen.', 'Please choose the billing month.'))
    if (distribution !== 'once' && (!fromMonth || !toMonth || toMonth < fromMonth)) {
      e.push(L('Bitte einen gültigen Zeitraum wählen (bis ≥ von).', 'Please choose a valid period (to ≥ from).'))
    }
    return e
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId, title, bonusType, value, distribution, billingMonth, fromMonth, toMonth, locale])

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (errors.length) return
    setSaving(true)
    const ok = await onSubmit({
      employee_id: employeeId,
      bonus_type: bonusType,
      title: title.trim() || specialPaymentTypeLabel(bonusType, 'de'),
      amount: Math.round(value * 100) / 100,
      distribution,
      billing_month: distribution === 'once' ? `${billingMonth}-01` : null,
      period_start: distribution === 'once' ? null : `${fromMonth}-01`,
      period_end: distribution === 'once' ? null : lastDay(toMonth),
      notes: notes.trim() || null,
    })
    setSaving(false)
    if (ok) onCancel()
  }

  const label = 'text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2'
  const field = 'w-full h-12 rounded-xl border border-gray-100 bg-gray-50/50 px-4 font-bold outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/10'

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="space-y-2">
        <Label className={label}><User className="w-3 h-3" /> {L('Mitarbeiter', 'Employee')} *</Label>
        <select className={field} value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
          <option value="">{L('Mitarbeiter auswählen…', 'Select an employee…')}</option>
          {employees.map((emp) => (
            <option key={emp.id} value={emp.id}>{emp.full_name ?? '—'}</option>
          ))}
        </select>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className={label}><Gift className="w-3 h-3" /> {L('Art', 'Type')}</Label>
          <select
            className={field}
            value={bonusType}
            onChange={(e) => {
              const t = e.target.value as HolidayBonusType
              if (!title.trim() || title === specialPaymentTypeLabel(bonusType, 'de')) setTitle(specialPaymentTypeLabel(t, 'de'))
              setBonusType(t)
            }}
          >
            {(Object.keys(SPECIAL_PAYMENT_TYPES) as HolidayBonusType[]).map((t) => (
              <option key={t} value={t}>{specialPaymentTypeLabel(t, locale)}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label className={label}><Euro className="w-3 h-3" /> {L('Betrag (€)', 'Amount (€)')} *</Label>
          <Input inputMode="decimal" placeholder="0,00" className="h-12 rounded-xl border-gray-100 bg-gray-50/50 font-bold" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
      </div>

      <div className="space-y-2">
        <Label className={label}><FileText className="w-3 h-3" /> {L('Bezeichnung / Anlass', 'Title / occasion')} *</Label>
        <Input
          placeholder={L('z. B. Urlaubsgeld 2026, Prämie Projekt X', 'e.g. holiday pay 2026, project bonus')}
          className="h-12 rounded-xl border-gray-100 bg-gray-50/50 font-bold"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label className={label}>{L('Abrechnung', 'Billing')} *</Label>
        <div className="grid sm:grid-cols-3 gap-2">
          {(Object.keys(DISTRIBUTIONS) as SpecialPaymentDistribution[]).map((d) => (
            <button
              type="button"
              key={d}
              onClick={() => setDistribution(d)}
              className={cn(
                'rounded-xl border px-3 py-2 text-left text-xs font-bold transition-colors',
                distribution === d ? 'border-[#0064E0] bg-blue-50 text-[#0064E0]' : 'border-gray-100 bg-gray-50/50 text-gray-600',
              )}
            >
              {locale === 'de' ? DISTRIBUTIONS[d].de : DISTRIBUTIONS[d].en}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500">{locale === 'de' ? DISTRIBUTIONS[distribution].hintDe : DISTRIBUTIONS[distribution].hintEn}</p>
        {distribution === 'once' ? (
          <div className="space-y-1">
            <span className="text-xs font-bold text-gray-500">{L('Abrechnungsmonat', 'Billing month')}</span>
            <input type="month" className={field} value={billingMonth} onChange={(e) => setBillingMonth(e.target.value)} />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <span className="text-xs font-bold text-gray-500">{L('Gültig von', 'Valid from')}</span>
              <input type="month" className={field} value={fromMonth} onChange={(e) => setFromMonth(e.target.value)} />
            </div>
            <div className="space-y-1">
              <span className="text-xs font-bold text-gray-500">{L('bis', 'to')}</span>
              <input type="month" className={field} value={toMonth} onChange={(e) => setToMonth(e.target.value)} />
            </div>
          </div>
        )}
        {distribution !== 'once' && months > 0 && Number.isFinite(value) && value > 0 && (
          <p className="rounded-xl bg-blue-50/60 border border-blue-100 px-3 py-2 text-xs font-bold text-blue-800">
            {distribution === 'monthly'
              ? L(`${months} Monate × ${formatEuro(value, 'de')} = ${formatEuro(value * months, 'de')} insgesamt`, `${months} months × ${formatEuro(value, 'en')} = ${formatEuro(value * months, 'en')} in total`)
              : L(`${formatEuro(value, 'de')} verteilt auf ${months} Monate ≈ ${formatEuro(value / months, 'de')} je Monat`, `${formatEuro(value, 'en')} split over ${months} months ≈ ${formatEuro(value / months, 'en')} per month`)}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label className={label}>{L('Bemerkung zur Vereinbarung', 'Note on the agreement')}</Label>
        <textarea
          className="w-full min-h-[80px] rounded-xl border border-gray-100 bg-gray-50/50 p-4 text-sm font-medium outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/10"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={L('z. B. laut Vereinbarung vom 01.06.2026', 'e.g. as agreed on 1 June 2026')}
        />
      </div>

      {errors.length > 0 && (
        <p className="flex items-center gap-2 text-sm font-semibold text-red-600">
          <AlertTriangle className="w-4 h-4" /> {errors[0]}
        </p>
      )}

      <div className="flex gap-3">
        <Button type="button" variant="ghost" onClick={onCancel} className="flex-1 h-12 rounded-xl font-bold text-gray-500">
          {L('Abbrechen', 'Cancel')}
        </Button>
        <Button type="submit" disabled={saving || errors.length > 0} className="flex-1 h-12 rounded-xl bg-[#0064E0] hover:bg-blue-700 text-white font-bold gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {initial ? L('Änderung speichern', 'Save changes') : L('Sonderzahlung anlegen', 'Add special payment')}
        </Button>
      </div>
    </form>
  )
}
