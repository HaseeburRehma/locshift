import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CreditCard, ChevronRight, Activity, Receipt, Package } from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'

export default async function BillingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: settings } = await supabase
    .from('company_settings')
    .select('credits_balance, stripe_customer_link')
    .single()

  const usage = 65 // Mock usage percentage
  const transactions = [
    { id: '1', date: '2024-03-01', type: 'Credit Top-up', amount: 50.00, status: 'Completed' },
    { id: '2', date: '2024-02-15', type: 'Monthly Plan', amount: 99.00, status: 'Completed' },
    { id: '3', date: '2024-02-01', type: 'Credit Top-up', amount: 25.00, status: 'Completed' },
  ]

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/dashboard" className="hover:text-primary transition-colors">Dashboard</Link>
        <ChevronRight className="h-4 w-4" />
        <Link href="/dashboard/settings" className="hover:text-primary transition-colors">Settings</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium">Billing & Usage</span>
      </nav>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-border/50">
        <div className="space-y-2">
          <h1 className="text-4xl font-black tracking-tight flex items-center gap-3">
             <div className="h-10 w-10 flex items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                <CreditCard className="h-6 w-6" />
             </div>
             Billing & Balance
          </h1>
          <p className="text-muted-foreground font-medium">Manage your subscription, credits, and transaction history.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
           {/* Plan Overview */}
           <Card className="border-border/50 shadow-sm rounded-[2.5rem] overflow-hidden">
              <CardHeader className="p-8">
                 <div className="flex justify-between items-start">
                    <div className="space-y-1">
                       <CardTitle className="text-2xl font-black">FixDone Premium</CardTitle>
                       <CardDescription className="font-medium text-muted-foreground">Pro plan for growing service teams.</CardDescription>
                    </div>
                    <span className="bg-emerald-100 text-emerald-600 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest">Active</span>
                 </div>
              </CardHeader>
              <CardContent className="p-8 pt-0 space-y-8">
                 <div className="grid grid-cols-2 gap-8 py-8 border-y border-zinc-100">
                    <div className="space-y-1">
                       <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Renewal Date</p>
                       <p className="text-xl font-black">April 12, 2024</p>
                    </div>
                    <div className="space-y-1">
                       <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Monthly Fee</p>
                       <p className="text-xl font-black">{formatCurrency(99.00)}</p>
                    </div>
                 </div>
                 
                 <div className="space-y-4">
                    <div className="flex justify-between items-center text-sm font-bold">
                       <span>Monthly AI Token Usage</span>
                       <span>{usage}%</span>
                    </div>
                    <Progress value={usage} className="h-2 bg-zinc-100" />
                    <p className="text-xs text-muted-foreground font-medium">You have used {usage * 100} / 10,000 AI tokens this month.</p>
                 </div>

                 <div className="pt-4 flex gap-3">
                    <Button className="rounded-xl font-bold px-6 shadow-lg shadow-zinc-100">Upgrade Plan</Button>
                    <Button variant="ghost" className="rounded-xl font-bold">Manage Subscription</Button>
                 </div>
              </CardContent>
           </Card>

           {/* Transaction History */}
           <Card className="border-border/50 shadow-sm rounded-[2.5rem] overflow-hidden">
              <CardHeader className="p-8">
                 <CardTitle className="text-xl font-bold flex items-center gap-2">
                    <Receipt className="h-5 w-5 text-muted-foreground" />
                    Transaction History
                 </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                 <div className="overflow-x-auto">
                    <table className="w-full text-left">
                       <thead className="bg-[#fafafa] border-y border-zinc-100">
                          <tr>
                             <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Date</th>
                             <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Service</th>
                             <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Amount</th>
                             <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">Status</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-zinc-100">
                          {transactions.map((tx) => (
                             <tr key={tx.id} className="hover:bg-zinc-50/50 transition-colors">
                                <td className="px-8 py-6 text-sm font-medium">{tx.date}</td>
                                <td className="px-8 py-6 text-sm font-bold">{tx.type}</td>
                                <td className="px-8 py-6 text-sm font-black">{formatCurrency(tx.amount)}</td>
                                <td className="px-8 py-6 text-right">
                                   <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">{tx.status}</span>
                                </td>
                             </tr>
                          ))}
                       </tbody>
                    </table>
                 </div>
              </CardContent>
           </Card>
        </div>

        <div className="space-y-8">
           <Card className="border-zinc-900 bg-zinc-900 text-white rounded-[2.5rem] overflow-hidden shadow-2xl">
              <CardHeader className="p-8">
                 <CardTitle className="text-lg font-bold flex items-center gap-2 opacity-80">
                    <Activity className="h-5 w-5" />
                    Credit Balance
                 </CardTitle>
              </CardHeader>
              <CardContent className="p-8 pt-0 space-y-6">
                 <div>
                    <span className="text-5xl font-black">{formatCurrency(settings?.credits_balance || 0)}</span>
                    <p className="text-xs font-bold text-zinc-400 mt-2 uppercase tracking-widest">Available for AI Automations</p>
                 </div>
                 <Button className="w-full h-14 rounded-2xl bg-white text-zinc-900 hover:bg-zinc-100 font-black text-lg gap-2" asChild>
                    <Link href="/dashboard/finance/add-credits">
                       <Plus className="h-5 w-5" /> Add Credits
                    </Link>
                 </Button>
              </CardContent>
           </Card>

           <Card className="border-border/50 rounded-[2.5rem] bg-indigo-50/30 overflow-hidden">
              <CardContent className="p-8 space-y-4">
                 <div className="h-12 w-12 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600">
                    <Package className="h-6 w-6" />
                 </div>
                 <h4 className="text-lg font-black text-indigo-900">Auto-Recharge</h4>
                 <p className="text-sm font-medium text-indigo-700/80 leading-relaxed">Automatically top up your balance when it falls below {formatCurrency(10.00)}.</p>
                 <Button variant="outline" className="w-full h-12 rounded-xl border-indigo-200 bg-white hover:bg-indigo-50 text-indigo-600 font-bold transition-all">
                    Enable Auto-Topup
                 </Button>
              </CardContent>
           </Card>
        </div>
      </div>
    </div>
  )
}
