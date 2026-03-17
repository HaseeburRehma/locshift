'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Pencil } from 'lucide-react'
import { RuleBuilder } from './RuleBuilder'
import { useRouter } from 'next/navigation'
import type { AutomationRuleRow } from '@/lib/types/database.types'

export function EditRuleButton({ rule }: { rule: AutomationRuleRow }) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="h-8 w-8 p-0 rounded-lg hover:bg-blue-50 hover:text-blue-600"
      >
        <Pencil className="w-3.5 h-3.5" />
      </Button>
      <RuleBuilder
        open={open}
        initialRule={rule}
        onClose={() => {
          setOpen(false)
          router.refresh()
        }}
      />
    </>
  )
}
