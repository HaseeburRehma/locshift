'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, CalendarPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PlanForm } from '@/components/shared/PlanForm'
import { useTranslation } from '@/lib/i18n'

export default function NewPlanPage() {
  const router = useRouter()
  const { locale } = useTranslation()

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      {/* Header & Back Button */}
      <div className="flex flex-col gap-6">
        <Button 
          variant="ghost" 
          className="w-fit h-10 rounded-xl px-4 -ml-4 text-gray-500 font-bold hover:bg-gray-50 gap-2"
          onClick={() => router.back()}
        >
          <ChevronLeft className="w-4 h-4" />
          {locale === 'en' ? 'Back to Dashboard' : 'Zurück zum Dashboard'}
        </Button>

        <div className="flex items-center gap-5">
           <div className="w-14 h-14 rounded-3xl bg-gray-900 flex items-center justify-center shadow-xl shadow-gray-200">
              <CalendarPlus className="w-7 h-7 text-white" />
           </div>
           <div className="space-y-1">
              <h1 className="text-3xl font-black text-gray-900 tracking-tight">
                {locale === 'en' ? 'Create New Operational Plan' : 'Neuen Einsatzplan erstellen'}
              </h1>
              <p className="text-sm font-bold text-gray-400 uppercase tracking-widest leading-none">
                {locale === 'en' ? 'Assign employees to customers and routes' : 'Mitarbeiter Kunden und Touren zuweisen'}
              </p>
           </div>
        </div>
      </div>

      {/* Main Form */}
      <PlanForm />
    </div>
  )
}
