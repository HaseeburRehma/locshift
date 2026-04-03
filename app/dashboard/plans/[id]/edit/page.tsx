'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ChevronLeft, PenSquare, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PlanForm } from '@/components/shared/PlanForm'
import { createClient } from '@/lib/supabase/client'
import type { Plan } from '@/lib/types'
import { useTranslation } from '@/lib/i18n'
import { useUser } from '@/lib/user-context'

export default function EditPlanPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { locale } = useTranslation()
  const { isAdmin, isDispatcher } = useUser()
  const [plan, setPlan] = useState<Plan | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!id) return
    const fetchPlan = async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('plans')
        .select('*, employee:profiles!employee_id(*), customer:customers(*)')
        .eq('id', id)
        .single()

      if (error || !data) {
        setNotFound(true)
      } else {
        setPlan(data as Plan)
      }
      setLoading(false)
    }
    fetchPlan()
  }, [id])

  // Only admins and dispatchers can edit
  if (!isAdmin && !isDispatcher) {
    router.replace('/dashboard/plans')
    return null
  }

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Loading Plan...
          </p>
        </div>
      </div>
    )
  }

  if (notFound || !plan) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center gap-4">
        <p className="text-2xl font-black text-slate-900">Plan not found</p>
        <Button variant="ghost" onClick={() => router.push('/dashboard/plans')}>
          ← Back to Plans
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col gap-6">
        <Button
          variant="ghost"
          className="w-fit h-10 rounded-xl px-4 -ml-4 text-gray-500 font-bold hover:bg-gray-50 gap-2"
          onClick={() => router.push('/dashboard/plans')}
        >
          <ChevronLeft className="w-4 h-4" />
          {locale === 'en' ? 'Back to Plans' : 'Zurück zu Plänen'}
        </Button>

        <div className="flex items-center gap-5">
          <div className="w-14 h-14 rounded-3xl bg-blue-600 flex items-center justify-center shadow-xl shadow-blue-200">
            <PenSquare className="w-7 h-7 text-white" />
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">
              {locale === 'en' ? 'Edit Plan' : 'Plan bearbeiten'}
            </h1>
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest leading-none">
              {locale === 'en' ? 'Update assignment details' : 'Einsatzdetails aktualisieren'}
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <PlanForm
        initialPlan={plan}
        onSuccess={() => router.push('/dashboard/plans')}
      />
    </div>
  )
}
