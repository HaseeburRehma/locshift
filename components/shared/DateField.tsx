'use client'

import * as React from 'react'
import { isValidDate } from '@/lib/time/shift-hours'

/** "YYYY-MM" in the same sane year range as isValidDate. */
export function isValidMonth(value: string | null | undefined): value is string {
  return !!value && /^\d{4}-\d{2}$/.test(value) && isValidDate(`${value}-01`)
}

type DateFieldProps = Omit<React.ComponentProps<'input'>, 'type' | 'value' | 'onChange'> & {
  type?: 'date' | 'month'
  value: string
  /** Called only with a complete, valid value (or '' when allowEmpty). */
  onValueChange: (value: string) => void
  /** Clearing the field reports '' instead of keeping the last valid value. */
  allowEmpty?: boolean
  /** Render with another input component, e.g. the styled ui/Input. */
  as?: React.ComponentType<React.ComponentProps<'input'>>
}

/**
 * Date / month input that is safe to type into. While the user types a year
 * digit by digit the browser reports 0002 → 0020 → 0202 → 2026; those
 * half-typed values stay inside this field and never reach the form, so no
 * lookup, calculation or toISOString() ever sees them (QA P0-1).
 */
export function DateField({ type = 'date', value, onValueChange, allowEmpty = false, as: Component, onBlur, ...rest }: DateFieldProps) {
  const [draft, setDraft] = React.useState(value)
  const reported = React.useRef(value)

  // Follow outside changes (preset buttons, "Planzeit übernehmen", reset).
  React.useEffect(() => {
    if (value !== reported.current) {
      reported.current = value
      setDraft(value)
    }
  }, [value])

  const isValid = type === 'month' ? isValidMonth : isValidDate

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value
    setDraft(next)
    if (isValid(next) || (allowEmpty && next === '')) {
      reported.current = next
      if (next !== value) onValueChange(next)
    }
  }

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    // Leaving a half-typed value shows the last valid one again.
    if (draft !== value && !isValid(draft) && !(allowEmpty && draft === '')) setDraft(value)
    onBlur?.(e)
  }

  const props = {
    ...rest,
    type,
    value: draft,
    onChange: handleChange,
    onBlur: handleBlur,
    min: rest.min ?? (type === 'month' ? '2000-01' : '2000-01-01'),
    max: rest.max ?? (type === 'month' ? '2100-12' : '2100-12-31'),
  }
  return Component ? <Component {...props} /> : <input {...props} />
}
