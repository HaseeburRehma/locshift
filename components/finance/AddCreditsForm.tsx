'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Euro, 
  Zap, 
  CheckCircle2, 
  Loader2, 
  ArrowRight,
  ShieldCheck,
  CreditCard
} from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'
import { useTranslation } from '@/lib/i18n'

const PRESETS = [50, 100, 250, 500]

export function AddCreditsForm({ currentBalance }: { currentBalance: number }) {
  const router = useRouter()
  const [amount, setAmount] = useState<number>(100)
  const [isPending, setIsPending] = useState(false)
  const { locale } = useTranslation()
  const L = (de: string, en: string) => locale === 'de' ? de : en

  const handleDeposit = async () => {
    if (amount < 20) {
      toast.error(L('Mindesteinzahlung beträgt 20 €', 'Minimum deposit is 20€'))
      return
    }
    
    setIsPending(true)
    try {
      const res = await fetch('/api/finance/add-credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount })
      })

      if (!res.ok) throw new Error()

      toast.success(L(`${formatCurrency(amount)} erfolgreich aufgeladen!`, `Successfully added ${formatCurrency(amount)} to balance!`))
      router.push('/dashboard/finance')
      router.refresh()
    } catch {
      toast.error(L('Zahlung konnte nicht verarbeitet werden', 'Failed to process payment'))
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className="space-y-8">
      <Card className="border-0 shadow-2xl rounded-[3rem] overflow-hidden bg-white">
        <CardContent className="p-10 space-y-10">
          {/* Amount Selection */}
          <div className="space-y-6">
             <label className="text-xs font-black uppercase tracking-widest text-zinc-400 text-center block w-full">Select Amount</label>
             <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {PRESETS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={cn(
                      "h-16 rounded-2xl font-black text-xl transition-all border-2",
                      amount === p 
                        ? "bg-emerald-600 border-emerald-600 text-white shadow-xl shadow-emerald-200 scale-105" 
                        : "bg-white border-zinc-100 text-zinc-600 hover:border-emerald-200 hover:bg-emerald-50/50"
                    )}
                    onClick={() => setAmount(p)}
                  >
                    {p}€
                  </button>
                ))}
             </div>
             
             <div className="relative mt-4">
                <Euro className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
                <Input 
                   type="number" 
                   value={amount} 
                   onChange={(e) => setAmount(Number(e.target.value))}
                   placeholder="Custom amount..." 
                   className="h-16 pl-12 pr-6 rounded-2xl text-2xl font-black bg-zinc-50 border-zinc-100 text-zinc-900 focus:ring-emerald-500/10 focus:border-emerald-500"
                />
             </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-zinc-100">
             <div className="flex justify-between items-center text-sm">
                <span className="font-bold text-zinc-500">Processing Fee</span>
                <span className="font-black text-zinc-900">0.00€ (Free)</span>
             </div>
             <div className="flex justify-between items-center text-xl">
                <span className="font-black text-zinc-900">Final Total</span>
                <span className="font-black text-emerald-600 underline underline-offset-8 decoration-4 decoration-emerald-100">{formatCurrency(amount)}</span>
             </div>
          </div>

          <Button 
             className="w-full h-20 rounded-[2rem] bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xl shadow-xl shadow-emerald-200 transition-all hover:scale-[1.02] flex items-center justify-center gap-3"
             disabled={isPending || amount < 20}
             onClick={handleDeposit}
          >
            {isPending ? (
              <><Loader2 className="h-6 w-6 animate-spin" /> Processing...</>
            ) : (
              <><CreditCard className="h-6 w-6" /> Complete Purchase</>
            )}
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4">
         <Card className="rounded-3xl border-border/50 bg-muted/20">
            <CardContent className="p-6">
               <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">Current Balance</h4>
               <p className="text-2xl font-black text-zinc-900">{formatCurrency(currentBalance)}</p>
            </CardContent>
         </Card>
         <Card className="rounded-3xl border-border/50 bg-muted/20">
            <CardContent className="p-6">
               <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">New Balance</h4>
               <p className="text-2xl font-black text-emerald-600">{formatCurrency(currentBalance + (amount || 0))}</p>
            </CardContent>
         </Card>
      </div>
    </div>
  )
}
