'use client'

/**
 * Shift-Template picker + save-as-template dialog.
 * Phase 2 / Change-Request #8 (Rheinmaasrail).
 *
 * Rendered inside PlanForm. The picker loads available templates
 * scoped to the caller's organization and, when one is selected,
 * invokes `onApply` so the parent can pre-fill form state.
 */

import { useState } from 'react'
import { BookMarked, Save, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useShiftTemplates } from '@/hooks/plans/useShiftTemplates'
import type { ShiftTemplate } from '@/lib/types'

export interface TemplatePayload {
  name: string
  customer_id: string | null
  start_time: string
  end_time: string
  duration_days: number
  route: string | null
  location: string | null
  overnight_stay: boolean
  hotel_address: string | null
  notes: string | null
}

interface Props {
  /** Called when the user picks a template from the dropdown. */
  onApply: (template: ShiftTemplate) => void
  /** Current form values to snapshot when the user saves a new template. */
  getCurrentPayload: () => TemplatePayload
  /** Show save controls (admin / dispatcher only). Defaults to true. */
  canSave?: boolean
  locale?: 'de' | 'en'
}

export function ShiftTemplatePicker({
  onApply,
  getCurrentPayload,
  canSave = true,
  locale = 'de',
}: Props) {
  const { templates, loading, createTemplate, deleteTemplate } = useShiftTemplates()
  const [saveOpen, setSaveOpen] = useState(false)
  const [templateName, setTemplateName] = useState('')

  const t = (de: string, en: string) => (locale === 'de' ? de : en)

  const handleApply = (id: string) => {
    const tpl = templates.find(x => x.id === id)
    if (tpl) onApply(tpl)
  }

  const handleSave = async () => {
    const name = templateName.trim()
    if (!name) return
    const payload = getCurrentPayload()
    const created = await createTemplate({ ...payload, name })
    if (created) {
      setSaveOpen(false)
      setTemplateName('')
    }
  }

  return (
    <div className="flex flex-col gap-3 p-4 rounded-2xl border border-slate-100 bg-slate-50/40">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookMarked className="w-4 h-4 text-[#0064E0]" />
          <Label className="text-[10px] font-semibold uppercase text-gray-500 tracking-widest">
            {t('Schichtvorlage', 'Shift Template')}
          </Label>
        </div>
        {canSave && (
          <button
            type="button"
            onClick={() => setSaveOpen(true)}
            className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[#0064E0] hover:text-blue-800 transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            {t('Als Vorlage speichern', 'Save as Template')}
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Select onValueChange={handleApply} disabled={loading || templates.length === 0}>
          <SelectTrigger className="h-12 rounded-xl border border-slate-100 bg-white font-semibold px-4 text-sm">
            <SelectValue
              placeholder={
                loading
                  ? t('Lade Vorlagen…', 'Loading templates…')
                  : templates.length === 0
                  ? t('Keine Vorlagen vorhanden', 'No templates yet')
                  : t('Vorlage auswählen…', 'Pick a template…')
              }
            />
          </SelectTrigger>
          <SelectContent className="rounded-2xl border-gray-100 shadow-2xl p-2">
            {templates.map(tpl => (
              <SelectItem key={tpl.id} value={tpl.id} className="font-semibold py-3 rounded-xl">
                <div className="flex items-center justify-between w-full">
                  <span>{tpl.name}</span>
                  <span className="text-[10px] font-medium opacity-50 ml-3">
                    {tpl.start_time}–{tpl.end_time}
                    {tpl.overnight_stay ? ' · ⌘' : ''}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {templates.length > 0 && canSave && (
        <details className="text-[11px]">
          <summary className="cursor-pointer text-gray-500 hover:text-gray-900 font-semibold uppercase tracking-widest">
            {t('Vorlagen verwalten', 'Manage templates')}
          </summary>
          <ul className="mt-2 space-y-1">
            {templates.map(tpl => (
              <li key={tpl.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-white">
                <span className="font-semibold text-gray-700">{tpl.name}</span>
                <button
                  type="button"
                  onClick={() => deleteTemplate(tpl.id)}
                  className="text-red-500 hover:text-red-700 transition-colors"
                  aria-label={t('Vorlage löschen', 'Delete template')}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>
              {t('Neue Vorlage speichern', 'Save new template')}
            </DialogTitle>
            <DialogDescription>
              {t(
                'Speichert die aktuellen Felder (Kunde, Route, Zeiten, Übernachtung) als wiederverwendbare Vorlage.',
                'Saves the current form values (customer, route, times, overnight stay) as a reusable template.',
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label className="text-[10px] font-semibold uppercase text-gray-500 tracking-widest">
              {t('Vorlagenname', 'Template Name')}
            </Label>
            <Input
              value={templateName}
              onChange={e => setTemplateName(e.target.value)}
              placeholder={t('z. B. "Frankfurt Nachtdienst"', 'e.g. "Frankfurt night shift"')}
              className="h-12 rounded-xl"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSaveOpen(false)}>
              {t('Abbrechen', 'Cancel')}
            </Button>
            <Button onClick={handleSave} disabled={!templateName.trim()}>
              {t('Speichern', 'Save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
