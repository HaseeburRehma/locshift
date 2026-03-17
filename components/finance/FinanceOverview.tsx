'use client'

import { Card, CardContent } from '@/components/ui/card'
import {
   TrendingUp,
   TrendingDown,
   DollarSign,
   Wallet,
   ArrowUpRight,
   Calendar,
   Layers,
   Star
} from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { RevenueChart } from './RevenueChart'
import { Button } from '../ui/button'

interface FinanceOverviewProps {
   creditBalance: number
   jobs: any[]
}

export function FinanceOverview({ creditBalance, jobs }: FinanceOverviewProps) {
   const totalRevenue = jobs.reduce((acc, job) => acc + (job.total_price || 0), 0)
   const lastMonthJobs = jobs.filter(j => new Date(j.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
   const lastMonthRevenue = lastMonthJobs.reduce((acc, j) => acc + (j.total_price || 0), 0)

   const stats = [
      {
         label: 'System Credits',
         value: formatCurrency(creditBalance),
         sub: 'Available for AI tasks',
         icon: Wallet,
         color: 'bg-blue-50 text-blue-600',
         trend: '+12%',
         trendType: 'up'
      },
      {
         label: 'Total Revenue',
         value: formatCurrency(totalRevenue),
         sub: 'From completed jobs',
         icon: TrendingUp,
         color: 'bg-emerald-50 text-emerald-600',
         trend: '+24%',
         trendType: 'up'
      },
      {
         label: 'Month Revenue',
         value: formatCurrency(lastMonthRevenue),
         sub: 'Past 30 days',
         icon: Calendar,
         color: 'bg-purple-50 text-purple-600',
         trend: '-2%',
         trendType: 'down'
      },
      {
         label: 'Avg. Ticket',
         value: formatCurrency(totalRevenue / (jobs.length || 1)),
         sub: 'Per completed job',
         icon: Star,
         color: 'bg-amber-50 text-amber-600',
         trend: '+5%',
         trendType: 'up'
      },
   ]

   return (
      <div className="space-y-8">
         {/* KPI Grid */}
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, i) => (
               <Card key={i} className="border-border/50 shadow-sm hover:border-primary/20 transition-all rounded-[2rem] overflow-hidden group">
                  <CardContent className="p-8">
                     <div className="flex justify-between items-start mb-6">
                        <div className={cn("p-4 rounded-2xl transition-transform group-hover:scale-110", stat.color)}>
                           <stat.icon className="h-6 w-6" />
                        </div>
                        <div className={cn(
                           "flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full",
                           stat.trendType === 'up' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                        )}>
                           {stat.trendType === 'up' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                           {stat.trend}
                        </div>
                     </div>
                     <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">{stat.label}</p>
                     <h3 className="text-3xl font-black text-zinc-900 tracking-tighter mb-1">{stat.value}</h3>
                     <p className="text-[10px] text-zinc-400 font-medium">{stat.sub}</p>
                  </CardContent>
               </Card>
            ))}
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Chart Section */}
            <div className="lg:col-span-2">
               <RevenueChart jobs={jobs} />
            </div>

            {/* Sidebar Actions */}
            <div className="space-y-6">
               <Card className="rounded-[2.5rem] bg-zinc-900 text-white border-0 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-bl-[2.5rem]" />
                  <CardContent className="p-8 space-y-6">
                     <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Fast Action</p>
                        <h4 className="text-xl font-bold">Manage Commissions</h4>
                     </div>
                     <p className="text-sm text-zinc-400 font-medium leading-relaxed">View and payout commissions for partners and technicians for the current period.</p>
                     <Button className="w-full h-12 rounded-xl bg-white text-zinc-900 font-bold hover:bg-zinc-100 gap-2">
                        <Layers className="h-4 w-4" /> Go to Commissions
                     </Button>
                  </CardContent>
               </Card>

               <Card className="rounded-[2.5rem] border-border/50 shadow-sm overflow-hidden">
                  <CardContent className="p-8 space-y-6">
                     <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                           <ArrowUpRight className="h-6 w-6" />
                        </div>
                        <div>
                           <h4 className="font-bold">Next Payout</h4>
                           <p className="text-xs text-muted-foreground">Est. 1,450.00€ on Friday</p>
                        </div>
                     </div>
                     <Button variant="outline" className="w-full h-12 rounded-xl border-border/50 font-bold">
                        View Schedule
                     </Button>
                  </CardContent>
               </Card>
            </div>
         </div>
      </div>
   )
}
