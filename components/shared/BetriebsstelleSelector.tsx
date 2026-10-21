'use client'

/**
 * Betriebsstelle picker with search (Kundenfeedback Punkt 12): finds a
 * location by full name, part of the name or code/abbreviation — usable
 * with several hundred imported Betriebsstellen.
 */

import React, { useMemo, useState } from 'react'
import { Check, ChevronsUpDown, MapPin, MapPinOff, X } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { cn } from '@/lib/utils'
import { useOperationalLocations } from '@/hooks/useOperationalLocations'
import type { OperationalLocation } from '@/lib/types'
import { searchLocations } from '@/lib/operational-locations/parse'

const TYPE_LABELS: Record<OperationalLocation['type'], [string, string]> = {
  depot: ['Depot', 'Depot'],
  station: ['Bahnhof', 'Station'],
  yard: ['Abstellanlage', 'Yard'],
  workshop: ['Werkstatt', 'Workshop'],
  office: ['Büro', 'Office'],
  other: ['Sonstige', 'Other'],
}

interface Props {
  value: string | null | undefined
  onChange: (value: string | null) => void
  kind?: 'start' | 'destination'
  label?: string
  placeholder?: string
  disabled?: boolean
  locale?: 'de' | 'en'
  className?: string
  /** Hides this id (the other side's selection). */
  excludeId?: string | null
  /** Pre-fetched list shared by several pickers. */
  locations?: OperationalLocation[]
  loading?: boolean
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
  excludeId,
  locations: locationsProp,
  loading: loadingProp,
}: Props) {
  const fallback = useOperationalLocations()
  const locations = locationsProp ?? fallback.locations
  const loading = loadingProp ?? fallback.loading
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const t = (de: string, en: string) => (locale === 'de' ? de : en)

  const selectable = useMemo(
    () => locations.filter((l) => l.id === value || (l.is_active && l.id !== excludeId)),
    [locations, value, excludeId],
  )
  const results = useMemo(() => searchLocations(selectable, query, 60), [selectable, query])
  const selected = locations.find((l) => l.id === value) ?? null
  const Icon = kind === 'start' ? MapPin : MapPinOff

  const computedLabel =
    label ?? (kind === 'start' ? t('Startort (Betriebsstelle)', 'Start (operational location)') : t('Zielort (Betriebsstelle)', 'Destination (operational location)'))

  return (
    <div className={cn('space-y-2', className)}>
      <Label className="flex items-center gap-1.5 text-[10px] font-semibold uppercase text-gray-500 tracking-widest">
        <Icon className="w-3.5 h-3.5 text-[#0064E0]" />
        {computedLabel}
      </Label>
      <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setQuery('') }}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled || loading}
            className="flex h-12 w-full items-center justify-between gap-2 rounded-xl border border-slate-100 bg-white px-4 text-left text-sm font-semibold disabled:opacity-50"
          >
            {selected ? (
              <span className="truncate">
                {selected.short_code && <span className="mr-2 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs font-black text-slate-700">{selected.short_code}</span>}
                {selected.name}
              </span>
            ) : (
              <span className="text-slate-400">
                {placeholder ?? (loading ? t('Lade Betriebsstellen…', 'Loading locations…') : t('Name oder Kürzel suchen…', 'Search name or code…'))}
              </span>
            )}
            <span className="flex items-center gap-1 shrink-0">
              {selected && !disabled && (
                <span
                  role="button"
                  tabIndex={0}
                  aria-label={t('Auswahl entfernen', 'Clear selection')}
                  onClick={(e) => { e.stopPropagation(); onChange(null) }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onChange(null) } }}
                  className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <X className="w-4 h-4" />
                </span>
              )}
              <ChevronsUpDown className="w-4 h-4 text-slate-400" />
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[280px] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput value={query} onValueChange={setQuery} placeholder={t('Name, Namensteil oder Kürzel …', 'Name, part of name or code …')} />
            <CommandList className="max-h-72">
              <CommandEmpty>{t('Keine Betriebsstelle gefunden.', 'No location found.')}</CommandEmpty>
              {results.map((loc) => (
                <CommandItem
                  key={loc.id}
                  value={loc.id}
                  onSelect={() => {
                    onChange(loc.id)
                    setOpen(false)
                    setQuery('')
                  }}
                  className="flex items-center gap-2 py-2"
                >
                  <Check className={cn('w-4 h-4 shrink-0', loc.id === value ? 'opacity-100 text-[#0064E0]' : 'opacity-0')} />
                  {loc.short_code && <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs font-black text-slate-700">{loc.short_code}</span>}
                  <span className="flex-1 truncate font-semibold">{loc.name}</span>
                  <span className="shrink-0 text-[10px] text-slate-400">
                    {TYPE_LABELS[loc.type]?.[locale === 'de' ? 0 : 1] ?? ''}
                    {!loc.is_active ? ` · ${t('inaktiv', 'inactive')}` : ''}
                  </span>
                </CommandItem>
              ))}
              {results.length === 60 && (
                <p className="px-3 py-2 text-[11px] text-slate-400">{t('Weitere Treffer – Suche verfeinern.', 'More results – refine your search.')}</p>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
