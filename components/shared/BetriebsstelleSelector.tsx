'use client'

/**
 * Betriebsstelle picker with type-ahead search (billing spec section 9):
 * typing a name ("Aachen") lists every matching operating point with name
 * and code, typing a code ("KAW") finds its full name. Searches the
 * ~24 000 RIL100 points on the server; nothing is loaded up front.
 */

import React, { useEffect, useRef, useState } from 'react'
import { Check, ChevronsUpDown, Loader2, MapPin, MapPinOff, X } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/user-context'
import type { OperationalLocation } from '@/lib/types'
import { cachedLocation, fetchLocationsByIds, searchLocationsRemote } from '@/lib/operational-locations/remote'
import { ril100StatusLabel } from '@/lib/operational-locations/parse'

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
  /** @deprecated Ignored — the picker searches on the server. */
  locations?: OperationalLocation[]
  /** @deprecated Ignored. */
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
  const { profile } = useUser()
  const supabaseRef = useRef(createClient())
  const orgId = profile?.organization_id ?? null
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<OperationalLocation[]>([])
  const [searching, setSearching] = useState(false)
  const [failed, setFailed] = useState(false)
  const [selected, setSelected] = useState<OperationalLocation | null>(() => cachedLocation(value))
  const t = (de: string, en: string) => (locale === 'de' ? de : en)
  const LIMIT = 40

  // The selected location (also when it is inactive or not in the results).
  useEffect(() => {
    if (!value) { setSelected(null); return }
    const hit = cachedLocation(value)
    if (hit) { setSelected(hit); return }
    let alive = true
    fetchLocationsByIds(supabaseRef.current, [value])
      .then((rows) => { if (alive) setSelected(rows[0] ?? null) })
      .catch(() => { /* keeps the placeholder */ })
    return () => { alive = false }
  }, [value])

  // Type-ahead: debounced, only the latest answer counts.
  const seq = useRef(0)
  useEffect(() => {
    if (!open || !orgId) return
    const id = ++seq.current
    setSearching(true)
    const timer = setTimeout(() => {
      searchLocationsRemote(supabaseRef.current, orgId, query, { limit: LIMIT })
        .then((rows) => {
          if (id !== seq.current) return
          setResults(rows.filter((l) => l.id !== excludeId))
          setFailed(false)
        })
        .catch(() => { if (id === seq.current) { setResults([]); setFailed(true) } })
        .finally(() => { if (id === seq.current) setSearching(false) })
    }, query.trim() ? 180 : 0)
    return () => clearTimeout(timer)
  }, [open, orgId, query, excludeId])

  const loading = !orgId
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
                {ril100StatusLabel(selected.ril100_status, locale === 'de' ? 'de' : 'en') && (
                  <span className="ml-2 text-[10px] font-bold text-amber-600">{ril100StatusLabel(selected.ril100_status, locale === 'de' ? 'de' : 'en')}</span>
                )}
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
              {searching && results.length === 0 ? (
                <div className="flex items-center gap-2 px-3 py-4 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" />{t('Suche…', 'Searching…')}</div>
              ) : (
                <CommandEmpty>
                  {failed
                    ? t('Suche fehlgeschlagen – bitte erneut versuchen.', 'Search failed – please try again.')
                    : query.trim()
                      ? t('Keine Betriebsstelle gefunden.', 'No location found.')
                      : t('Name oder Kürzel eingeben, z. B. „Aachen“ oder „KAW“.', 'Type a name or code, e.g. “Aachen” or “KAW”.')}
                </CommandEmpty>
              )}
              {!query.trim() && results.length > 0 && (
                <p className="px-3 pt-2 pb-1 text-[10px] font-black uppercase tracking-widest text-slate-400">{t('Eigene Betriebsstellen', 'Your locations')}</p>
              )}
              {results.map((loc) => (
                <CommandItem
                  key={loc.id}
                  value={loc.id}
                  onSelect={() => {
                    setSelected(loc)
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
                    {ril100StatusLabel(loc.ril100_status, locale === 'de' ? 'de' : 'en') ? ` · ${ril100StatusLabel(loc.ril100_status, locale === 'de' ? 'de' : 'en')}` : ''}
                    {!loc.is_active ? ` · ${t('inaktiv', 'inactive')}` : ''}
                  </span>
                </CommandItem>
              ))}
              {results.length >= LIMIT && (
                <p className="px-3 py-2 text-[11px] text-slate-400">{t('Weitere Treffer – Suche verfeinern.', 'More results – refine your search.')}</p>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
