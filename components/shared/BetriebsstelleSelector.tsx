'use client'

/**
 * Betriebsstelle (Operational-Location) selector — Phase 3 / CR #1.
 *
 * A thin, role-agnostic Select wrapper around `useOperationalLocations`.
 * Used in PlanForm and TimeEntryForm to pick Start or Destination.
 *
 * Design notes:
 *   • Coexists with the free-text `location` field — selecting a
 *     Betriebsstelle is optional.
 *   • Only active locations are offered; inactive ones stay selectable
 *     only if they are the current value (so editing historical rows
 *     doesn't lose data).
 *   • Shows short_code alongside name when available — dispatchers asked
 *     for the internal codes (e.g. "RM-DEP-01") to be visible for quick
 *     recognition.
 */

import { MapPin, MapPinOff } from 'lucide-react'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useOperationalLocations } from '@/hooks/useOperationalLocations'
import type { OperationalLocation } from '@/lib/types'

const TYPE_LABELS_DE: Record<OperationalLocation['type'], string> = {
  depot: 'Depot',
  station: 'Bahnhof',
  yard: 'Abstellanlage',
  workshop: 'Werkstatt',
  office: 'Büro',
  other: 'Sonstige',
}
const TYPE_LABELS_EN: Record<OperationalLocation['type'], string> = {
  depot: 'Depot',
  station: 'Station',
  yard: 'Yard',
  workshop: 'Workshop',
  office: 'Office',
  other: 'Other',
}

// Sentinel string because shadcn Select doesn't allow empty-string values.
// We map it to null on the way out.
const NO_VALUE = '__none__'

interface Props {
  value: string | null | undefined
  onChange: (value: string | null) => void
  /** 'start' or 'destination' — only affects the icon and default label. */
  kind?: 'start' | 'destination'
  label?: string
  placeholder?: string
  disabled?: boolean
  locale?: 'de' | 'en'
  className?: string
}

export function BetriebsstelleSelector({
  value,
  onChange,
  kind = 'start',
  label,
  placeholder,
  disabled = false,
  locale = 'de',
  className = '',
}: Props) {
  const { locations, loading } = useOperationalLocations()
  const t = (de: string, en: string) => (locale === 'de' ? de : en)

  const TYPE_LABELS = locale === 'de' ? TYPE_LABELS_DE : TYPE_LABELS_EN

  // Keep inactive rows in the list if they are the current value so
  // previously-selected (now archived) Betriebsstellen still render.
  const visible = locations.filter(l => l.is_active || l.id === value)

  const computedLabel =
    label ??
    (kind === 'start'
      ? t('Startort (Betriebsstelle)', 'Start (Operational Location)')
      : t('Zielort (Betriebsstelle)', 'Destination (Operational Location)'))

  const computedPlaceholder =
    placeholder ??
    (loading
      ? t('Lade Betriebsstellen…', 'Loading locations…')
      : visible.length === 0
      ? t('Keine Betriebsstellen angelegt', 'No operational locations yet')
      : t('Betriebsstelle auswählen…', 'Pick a location…'))

  const Icon = kind === 'start' ? MapPin : MapPinOff

  const handleChange = (next: string) => {
    onChange(next === NO_VALUE ? null : next)
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <Label className="flex items-center gap-1.5 text-[10px] font-semibold uppercase text-gray-500 tracking-widest">
        <Icon className="w-3.5 h-3.5 text-[#0064E0]" />
        {computedLabel}
      </Label>
      <Select
        value={value ?? NO_VALUE}
        onValueChange={handleChange}
        disabled={disabled || loading}
      >
        <SelectTrigger className="h-12 rounded-xl border border-slate-100 bg-white font-semibold px-4 text-sm">
          <SelectValue placeholder={computedPlaceholder} />
        </SelectTrigger>
        <SelectContent className="rounded-2xl border-gray-100 shadow-2xl p-2">
          <SelectItem value={NO_VALUE} className="font-semibold py-3 rounded-xl text-gray-500">
            {t('— Keine —', '— None —')}
          </SelectItem>
          {visible.map(loc => (
            <SelectItem
              key={loc.id}
              value={loc.id}
              className="font-semibold py-3 rounded-xl"
            >
              <div className="flex items-center justify-between w-full gap-3">
                <span className="truncate">
                  {loc.name}
                  {loc.short_code ? (
                    <span className="ml-2 text-[10px] font-medium opacity-50">
                      {loc.short_code}
                    </span>
                  ) : null}
                </span>
                <span className="text-[10px] font-medium opacity-50 shrink-0">
                  {TYPE_LABELS[loc.type]}
                  {!loc.is_active ? ` · ${t('inaktiv', 'inactive')}` : ''}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
