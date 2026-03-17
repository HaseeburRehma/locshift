'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { RuleBuilder } from './RuleBuilder'
import { useRouter } from 'next/navigation'

export function CreateRuleButton() {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  const handleClose = () => {
    setOpen(false)
    router.refresh()
  }

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="rounded-[1.5rem] h-14 px-8 bg-violet-600 hover:bg-violet-700 text-white font-black text-lg gap-2 shadow-xl shadow-violet-200 dark:shadow-violet-900/20 transition-all hover:scale-[1.02]"
      >
        <Plus className="w-5 h-5" />
        New Automation
      </Button>
      <RuleBuilder open={open} onClose={handleClose} />
    </>
  )
}
