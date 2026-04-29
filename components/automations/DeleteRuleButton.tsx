'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Trash2, AlertTriangle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useTranslation } from '@/lib/i18n'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

export function DeleteRuleButton({
  ruleId,
  ruleName,
}: {
  ruleId: string
  ruleName: string
}) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const { locale } = useTranslation()
  const L = (de: string, en: string) => locale === 'de' ? de : en

  const handleDelete = () => {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/automations/rules/${ruleId}`, {
          method: 'DELETE',
        })
        if (!res.ok) throw new Error('Delete failed')
        toast.success(`"${ruleName}" ${L('gelöscht', 'deleted')}`)
        setOpen(false)
        router.refresh()
      } catch {
        toast.error(L('Regel konnte nicht gelöscht werden', 'Failed to delete rule'))
      }
    })
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="h-8 w-8 p-0 rounded-lg hover:bg-red-50 hover:text-red-600"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              {L('Automatisierungsregel löschen', 'Delete Automation Rule')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {L('Soll', 'Are you sure you want to delete')} <strong>&ldquo;{ruleName}&rdquo;</strong> {L('wirklich gelöscht werden? Diese Aktion kann nicht rückgängig gemacht werden.', 'permanently? This action cannot be undone.')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{L('Abbrechen', 'Cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isPending}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-500"
            >
              {isPending ? L('Wird gelöscht…', 'Deleting...') : L('Regel löschen', 'Delete Rule')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
