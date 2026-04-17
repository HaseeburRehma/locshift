'use client'

import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTranslation } from '@/lib/i18n'

export function CreateLeadButton() {
  const { locale } = useTranslation()
  
  return (
    <Button size="sm" className="gap-2">
      <Plus className="h-4 w-4" />
      {locale === 'en' ? 'Create Lead' : 'Lead erstellen'}
    </Button>
  )
}
