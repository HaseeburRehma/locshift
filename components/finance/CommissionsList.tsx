'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  CheckCircle2, 
  Clock, 
  TrendingUp, 
  User, 
  ArrowUpRight,
  Loader2,
  AlertCircle
} from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'

interface CommissionData {
  id: string
  name: string
  jobs: any[]
}

export function CommissionsList({ initialData }: { initialData: CommissionData[] }) {
  const [data, setData] = useState(initialData)
  const [isProcessing, setIsProcessing] = useState<string | null>(null)

  const handleMarkPaid = async (techId: string) => {
    const unpaidJobs = data.find(d => d.id === techId)?.jobs.filter(j => j.status === 'completed' && !j.commission_paid) || []
    if (unpaidJobs.length === 0) return

    setIsProcessing(techId)
    try {
      const jobIds = unpaidJobs.map(j => j.id)
      const res = await fetch('/api/finance/mark-commission-paid', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobIds })
      })

      if (!res.ok) throw new Error()

      setData(prev => prev.map(d => {
        if (d.id === techId) {
          return {
            ...d,
            jobs: d.jobs.map(j => jobIds.includes(j.id) ? { ...j, commission_paid: true } : j)
          }
        }
        return d
      }))
      
      toast.success(`Commission paid for ${unpaidJobs.length} jobs`)
    } catch {
      toast.error('Failed to update commission status')
    } finally {
      setIsProcessing(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {data.map((tech) => {
          const unpaidJobs = tech.jobs.filter(j => j.status === 'completed' && !j.commission_paid)
          const unpaidAmount = unpaidJobs.reduce((acc, j) => acc + (j.total_price || 0) * 0.20, 0) // Assume 20% commission
          const totalPaid = tech.jobs.filter(j => j.commission_paid).reduce((acc, j) => acc + (j.total_price || 0) * 0.20, 0)

          return (
            <Card key={tech.id} className="border-border/50 shadow-sm rounded-3xl overflow-hidden group hover:border-primary/20 transition-all">
              <CardContent className="p-8 space-y-6">
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                         <User className="h-6 w-6" />
                      </div>
                      <div>
                         <h4 className="text-xl font-bold">{tech.name}</h4>
                         <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Technician</p>
                      </div>
                   </div>
                   <Badge variant="outline" className="rounded-full border-zinc-200 text-zinc-500 font-bold px-3">
                      {tech.jobs.length} Jobs Total
                   </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                      <p className="text-[10px] font-black uppercase text-emerald-600 mb-1">Total Earned</p>
                      <p className="text-xl font-black text-emerald-700">{formatCurrency(totalPaid)}</p>
                   </div>
                   <div className={cn(
                      "p-4 rounded-2xl border transition-colors",
                      unpaidAmount > 0 ? "bg-orange-50 border-orange-100" : "bg-zinc-50 border-zinc-100"
                   )}>
                      <p className={cn(
                        "text-[10px] font-black uppercase mb-1",
                        unpaidAmount > 0 ? "text-orange-600" : "text-zinc-500"
                      )}>Outstanding</p>
                      <p className={cn(
                        "text-xl font-black",
                        unpaidAmount > 0 ? "text-orange-700" : "text-zinc-600"
                      )}>{formatCurrency(unpaidAmount)}</p>
                   </div>
                </div>

                <div className="space-y-3">
                   <div className="flex items-center justify-between text-xs font-bold text-zinc-500 px-1">
                      <span>Status</span>
                      {unpaidAmount > 0 ? (
                        <span className="flex items-center gap-1.5 text-orange-600">
                           <Clock className="h-3.5 w-3.5" /> Pending Payout
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-emerald-600">
                           <CheckCircle2 className="h-3.5 w-3.5" /> All Paid
                        </span>
                      )}
                   </div>
                   
                   <Button 
                      className={cn(
                        "w-full h-12 rounded-xl font-black gap-2 transition-all shadow-lg",
                        unpaidAmount > 0 
                          ? "bg-zinc-900 text-white hover:bg-zinc-800 shadow-zinc-200" 
                          : "bg-white text-zinc-400 border border-zinc-100 cursor-not-allowed"
                      )}
                      disabled={unpaidAmount === 0 || isProcessing === tech.id}
                      onClick={() => handleMarkPaid(tech.id)}
                   >
                     {isProcessing === tech.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                     ) : (
                        <><TrendingUp className="h-4 w-4" /> Process {formatCurrency(unpaidAmount)} Payout</>
                     )}
                   </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}

        {data.length === 0 && (
          <div className="col-span-full py-20 text-center space-y-4 bg-muted/20 rounded-[3rem] border-2 border-dashed border-border/50">
             <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto" />
             <p className="text-zinc-500 font-medium">No technicians found to calculate commissions.</p>
          </div>
        )}
      </div>
    </div>
  )
}
