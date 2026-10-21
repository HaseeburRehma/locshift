'use client'

/**
 * Sonderzahlungen (Kundenfeedback Punkt 6) — table `holiday_bonuses`.
 * Payments appear automatically in the matching Monatsnachweis; the report
 * computes the monthly share on read, so regenerating never double counts.
 */

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import type { HolidayBonus } from '@/lib/types'
import { useUser } from '@/lib/user-context'
import { useTranslation } from '@/lib/i18n'
import { dbErrorMessage } from '@/lib/times/entry-status'
import { sendNotification } from '@/lib/notifications/service'
import { formatEuro } from '@/lib/time/format'
import { paymentPeriodLabel } from '@/lib/special-payments'
import { fetchAllPages } from '@/lib/supabase/paginate'
import { useCoalescedRefetch } from '@/hooks/useCoalescedRefetch'

export type SpecialPaymentInput = Pick<
  HolidayBonus,
  'employee_id' | 'title' | 'amount' | 'bonus_type' | 'distribution' | 'billing_month' | 'period_start' | 'period_end' | 'notes'
>

export function useSpecialPayments() {
  const [payments, setPayments] = useState<HolidayBonus[]>([])
  const [loading, setLoading] = useState(true)
  const { profile, user, isAdmin, isDispatcher } = useUser()
  const { locale } = useTranslation()
  const L = (de: string, en: string) => (locale === 'de' ? de : en)
  const supabase = createClient()
  const isManager = isAdmin || isDispatcher

  const fetchPayments = useCallback(async (silent = false) => {
    if (!profile?.organization_id) return
    if (!silent) setLoading(true)
    const orgId = profile.organization_id
    const ownId = profile.id
    // Rebuilt per page: PostgREST caps each response at 1000 rows.
    const { data, error } = await fetchAllPages<HolidayBonus>((from, to) => {
      let query = supabase
        .from('holiday_bonuses')
        .select('*')
        .eq('organization_id', orgId)
      if (!isManager) query = query.eq('employee_id', ownId)
      return query
        .order('billing_month', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
        .order('id', { ascending: true })
        .range(from, to)
    })
    if (error) console.error('[useSpecialPayments]', error.message)
    else setPayments(data)
    setLoading(false)
  }, [profile?.organization_id, profile?.id, isManager, supabase])

  // Realtime bursts → one silent refetch, never two at once.
  const scheduleRefresh = useCoalescedRefetch(() => fetchPayments(true))

  useEffect(() => {
    fetchPayments()
    if (!profile?.organization_id) return
    const channel = supabase
      .channel(`special-payments-${profile.organization_id}-${Math.random().toString(36).slice(2, 8)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'holiday_bonuses', filter: `organization_id=eq.${profile.organization_id}` },
        () => scheduleRefresh(),
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [profile?.organization_id, fetchPayments, scheduleRefresh, supabase])

  const normalize = (data: SpecialPaymentInput): SpecialPaymentInput => ({
    ...data,
    title: data.title?.trim() || null,
    notes: data.notes?.trim() || null,
    billing_month: data.distribution === 'once' ? data.billing_month : null,
    period_start: data.distribution === 'once' ? null : data.period_start,
    period_end: data.distribution === 'once' ? null : data.period_end,
  })

  const createPayment = async (data: SpecialPaymentInput) => {
    if (!profile?.organization_id) return false
    const payload = normalize(data)
    const { data: created, error } = await supabase
      .from('holiday_bonuses')
      .insert({ ...payload, organization_id: profile.organization_id, created_by: user?.id ?? null })
      .select()
      .single()
    if (error) {
      toast.error(dbErrorMessage(error, locale, L('Sonderzahlung konnte nicht gespeichert werden', 'Could not save special payment')))
      return false
    }
    setPayments((prev) => [created as HolidayBonus, ...prev])
    toast.success(L('Sonderzahlung angelegt', 'Special payment added'))
    void sendNotification({
      userId: payload.employee_id,
      title: 'Neue Sonderzahlung',
      message: `${payload.title ?? 'Sonderzahlung'}: ${formatEuro(payload.amount, 'de')} (${paymentPeriodLabel(payload, 'de')}).`,
      module: 'bonuses',
      moduleId: (created as HolidayBonus).id,
      link: '/dashboard/holiday-bonus',
    })
    return true
  }

  const updatePayment = async (id: string, data: SpecialPaymentInput) => {
    const payload = normalize(data)
    const { error } = await supabase
      .from('holiday_bonuses')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) {
      toast.error(dbErrorMessage(error, locale, L('Änderung konnte nicht gespeichert werden', 'Could not save changes')))
      return false
    }
    toast.success(L('Sonderzahlung aktualisiert', 'Special payment updated'))
    await fetchPayments(true)
    return true
  }

  const deletePayment = async (id: string) => {
    setPayments((prev) => prev.filter((b) => b.id !== id))
    const { error } = await supabase.from('holiday_bonuses').delete().eq('id', id)
    if (error) {
      fetchPayments(true)
      toast.error(dbErrorMessage(error, locale, L('Löschen fehlgeschlagen', 'Delete failed')))
      return false
    }
    toast.success(L('Sonderzahlung gelöscht', 'Special payment deleted'))
    return true
  }

  const year = String(new Date().getFullYear())
  const totalThisYear = payments
    .filter((b) => (b.billing_month ?? b.period_start ?? b.created_at).startsWith(year))
    .reduce((sum, b) => sum + (Number(b.amount) || 0), 0)

  return { payments, loading, createPayment, updatePayment, deletePayment, totalThisYear, refresh: fetchPayments }
}
