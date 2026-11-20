import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { formatInTimeZone } from 'date-fns-tz'
import { de } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number | string) {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(numericAmount)) return '0,00 €'
  return numericAmount.toLocaleString('de-DE', {
    style: 'currency',
    currency: 'EUR',
  })
}

export function formatDate(date: Date | string | number, formatStr: string = 'PPP') {
  return formatInTimeZone(new Date(date), 'Europe/Berlin', formatStr, {
    locale: de,
  })
}

/** Display name of a person: full name, else e-mail, else null. */
export function personName(p: { full_name?: string | null; email?: string | null } | null | undefined): string | null {
  const name = p?.full_name?.trim()
  if (name) return name
  return p?.email?.trim() || null
}
