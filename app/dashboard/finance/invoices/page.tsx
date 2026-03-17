import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Receipt, Search, Download, ChevronRight, Filter } from 'lucide-react'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'

export default async function InvoicesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Mock invoices data
  const invoices = [
    { id: 'INV-001', date: '2024-03-01', amount: 50.00, status: 'Paid', method: 'Stripe' },
    { id: 'INV-002', date: '2024-02-15', amount: 99.00, status: 'Paid', method: 'Stripe' },
    { id: 'INV-003', date: '2024-02-01', amount: 25.00, status: 'Paid', method: 'Stripe' },
    { id: 'INV-004', date: '2024-01-15', amount: 150.00, status: 'Paid', method: 'Bank Transfer' },
  ]

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/dashboard" className="hover:text-primary transition-colors">Dashboard</Link>
        <ChevronRight className="h-4 w-4" />
        <Link href="/dashboard/finance" className="hover:text-primary transition-colors">Finance</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium">Invoices</span>
      </nav>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-border/50">
        <div className="space-y-2">
          <h1 className="text-4xl font-black tracking-tight flex items-center gap-3">
             <div className="h-10 w-10 flex items-center justify-center rounded-2xl bg-zinc-100 text-zinc-600">
                <Receipt className="h-6 w-6" />
             </div>
             Invoices
          </h1>
          <p className="text-muted-foreground font-medium">Access and download your historical billing documents.</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
         <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-11 h-12 rounded-xl border-border/50 bg-white" placeholder="Search by invoice number..." />
         </div>
         <Button variant="outline" className="h-12 rounded-xl font-bold gap-2 px-6">
            <Filter className="h-4 w-4" /> Date Range
         </Button>
      </div>

      <div className="bg-white rounded-[2rem] border border-border/50 shadow-sm overflow-hidden">
         <div className="overflow-x-auto">
            <table className="w-full text-left">
               <thead className="bg-[#fafafa] border-b border-zinc-100">
                  <tr>
                     <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Invoice ID</th>
                     <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Date</th>
                     <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Amount</th>
                     <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status</th>
                     <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">Action</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-zinc-100">
                  {invoices.map((inv) => (
                     <tr key={inv.id} className="hover:bg-zinc-50/50 transition-colors">
                        <td className="px-8 py-6 text-sm font-bold">{inv.id}</td>
                        <td className="px-8 py-6 text-sm font-medium text-muted-foreground">{inv.date}</td>
                        <td className="px-8 py-6 text-sm font-black">{formatCurrency(inv.amount)}</td>
                        <td className="px-8 py-6">
                           <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">{inv.status}</span>
                        </td>
                        <td className="px-8 py-6 text-right">
                           <Button variant="ghost" size="icon" className="h-10 w-10 text-primary hover:bg-primary/5 rounded-xl">
                              <Download className="h-5 w-5" />
                           </Button>
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>
    </div>
  )
}
