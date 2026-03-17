'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { CreditCard, CheckCircle, Loader2, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

type PaymentMethod = 'card' | 'sepa_debit' | 'sofort' | 'giropay'

const CREDIT_PACKAGES = [
  { amount: 50,  credits: 50,  label: '50€',  bonus: null,         popular: false },
  { amount: 100, credits: 110, label: '100€', bonus: '+10 bonus',  popular: true  },
  { amount: 250, credits: 300, label: '250€', bonus: '+50 bonus',  popular: false },
  { amount: 500, credits: 650, label: '500€', bonus: '+150 bonus', popular: false },
]

const PAYMENT_METHODS = [
  { value: 'sepa_debit' as const, icon: '🏦', name: 'SEPA-Lastschrift', desc: 'Bankabbuchung (empfohlen)' },
  { value: 'sofort'     as const, icon: '⚡', name: 'Sofort / Klarna',  desc: 'Sofortüberweisung'       },
  { value: 'giropay'   as const, icon: '🏧', name: 'Giropay',           desc: 'Online-Banking'          },
  { value: 'card'      as const, icon: '💳', name: 'Kreditkarte',       desc: 'Visa & Mastercard'       },
]

function formatEUR(v: number) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(v)
}

export default function AddCreditsPage() {
  const [selectedPackage, setSelectedPackage] = useState(CREDIT_PACKAGES[1])
  const [customAmount, setCustomAmount] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('sepa_debit')
  const [currentBalance] = useState(0) // fetched server-side in real app

  const finalAmount = customAmount ? (parseInt(customAmount) || 0) : selectedPackage.amount
  const finalCredits = customAmount ? (parseInt(customAmount) || 0) : selectedPackage.credits

  const handlePurchase = async () => {
    if (finalAmount < 10) {
      toast.error('Minimum amount is 10€')
      return
    }
    setIsLoading(true)
    try {
      const res = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: finalAmount, credits: finalCredits, paymentMethod }),
      })
      const { checkoutUrl, error } = await res.json()
      if (error) throw new Error(error)
      window.location.href = checkoutUrl
    } catch (err: any) {
      toast.error(err?.message ?? 'Payment setup failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-8 pb-20">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/dashboard" className="hover:text-primary transition-colors">Dashboard</Link>
        <ChevronRight className="h-4 w-4" />
        <Link href="/dashboard/finance" className="hover:text-primary transition-colors">Finance</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium">Add Credits</span>
      </nav>

      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-black tracking-tight flex items-center gap-3">
          <div className="h-10 w-10 flex items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
            <CreditCard className="h-6 w-6" />
          </div>
          Add Credits
        </h1>
        <p className="text-muted-foreground font-medium">
          Recharge your system balance for AI processing and automations.
        </p>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* Package Selection */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">
            Select Amount
          </p>

          <div className="grid grid-cols-4 gap-3 mb-4">
            {CREDIT_PACKAGES.map((pkg) => (
              <button
                key={pkg.amount}
                onClick={() => { setSelectedPackage(pkg); setCustomAmount('') }}
                className={cn(
                  'relative flex flex-col items-center justify-center py-4 rounded-xl border-2 transition-all font-semibold text-sm',
                  selectedPackage.amount === pkg.amount && !customAmount
                    ? 'border-emerald-500 bg-emerald-500 text-white shadow-lg scale-105'
                    : 'border-gray-200 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-600'
                )}
              >
                {pkg.popular && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
                    POPULAR
                  </span>
                )}
                <span className="text-lg">{pkg.label}</span>
                {pkg.bonus && (
                  <span className={cn(
                    'text-xs mt-1',
                    selectedPackage.amount === pkg.amount && !customAmount
                      ? 'text-emerald-100'
                      : 'text-emerald-600'
                  )}>
                    {pkg.bonus}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Custom amount */}
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">€</span>
            <input
              type="number"
              min="10"
              max="10000"
              placeholder="Custom amount..."
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              className="w-full pl-8 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
            />
          </div>
        </div>

        {/* Payment Method — German Focus */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">
            Zahlungsmethode / Payment Method
          </p>

          <div className="grid grid-cols-2 gap-3">
            {PAYMENT_METHODS.map((pm) => (
              <button
                key={pm.value}
                onClick={() => setPaymentMethod(pm.value)}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all',
                  paymentMethod === pm.value
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10'
                    : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
                )}
              >
                <span className="text-2xl">{pm.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{pm.name}</p>
                  <p className="text-xs text-muted-foreground">{pm.desc}</p>
                </div>
                {paymentMethod === pm.value && (
                  <CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0" />
                )}
              </button>
            ))}
          </div>

          <p className="text-xs text-muted-foreground mt-3 text-center">
            🔒 Sicher verarbeitet durch Stripe · SSL verschlüsselt
          </p>
        </div>

        {/* Order Summary */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Credits</span>
            <span className="font-medium">{finalCredits} Credits</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Processing Fee</span>
            <span className="font-medium text-emerald-600">0,00€ (Free)</span>
          </div>
          <div className="border-t dark:border-gray-700 pt-3 flex justify-between">
            <span className="font-semibold">Final Total</span>
            <span className="font-bold text-xl text-emerald-600">{formatEUR(finalAmount)}</span>
          </div>
        </div>

        {/* CTA Button */}
        <button
          onClick={handlePurchase}
          disabled={isLoading || finalAmount < 10}
          className={cn(
            'w-full py-4 rounded-2xl font-semibold text-white text-base',
            'flex items-center justify-center gap-3 transition-all',
            'bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99]',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'shadow-lg shadow-emerald-500/20'
          )}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Weiterleitung zu Stripe...
            </>
          ) : (
            <>
              <CreditCard className="w-5 h-5" />
              Complete Purchase — {formatEUR(finalAmount)}
            </>
          )}
        </button>

        {/* Balance Preview */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-100 dark:border-gray-800 text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">Current Balance</p>
            <p className="text-2xl font-bold">{formatEUR(currentBalance)}</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-emerald-200 dark:border-emerald-500/20 text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">New Balance</p>
            <p className="text-2xl font-bold text-emerald-600">{formatEUR(currentBalance + finalAmount)}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
