'use client'

import React from 'react'
import { 
  Users, 
  Search, 
  ChevronRight, 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Clock,
  Filter
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { TimeAccount } from '@/lib/types'
import { cn } from '@/lib/utils'

interface PersonnelTimeAccountsProps {
  accounts: TimeAccount[]
  onSelectEmployee: (employeeId: string) => void
}

export function PersonnelTimeAccounts({ accounts, onSelectEmployee }: PersonnelTimeAccountsProps) {
  const [searchTerm, setSearchTerm] = React.useState('')

  const filteredAccounts = accounts.filter(acc => 
    acc.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalOrgBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0)

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      {/* Search & Active Personnel Monitoring */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
            <h1 className="text-4xl font-black tracking-tighter flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-xl">
                    <BarChart3 className="h-6 w-6" />
                </div>
                Personnel Accounts
            </h1>
            <p className="text-muted-foreground font-medium max-w-2xl">
                Global operational monitoring of time balances and workforce efficiency (Section 4.1 & 4.2).
            </p>
        </div>

        <div className="relative group max-w-md w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
            <Input 
                placeholder="Search employee accounts..." 
                className="pl-12 rounded-2xl border-slate-100 h-14 bg-white/50 backdrop-blur-sm focus:bg-white transition-all shadow-sm focus:shadow-xl focus:shadow-slate-100 font-bold"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
      </div>

      {/* Global Org Insight Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-8 rounded-[2.5rem] bg-slate-900 border-none text-white relative overflow-hidden group shadow-2xl">
              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:rotate-12 transition-transform duration-700">
                  <Clock className="w-32 h-32 text-blue-500" />
              </div>
              <div className="relative z-10 space-y-4">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400">ORGANIZATION BALANCE</h3>
                  <div className="flex items-end gap-2">
                     <span className={cn(
                        "text-5xl font-black tracking-tighter tabular-nums leading-none",
                        totalOrgBalance >= 0 ? "text-blue-400" : "text-red-400"
                     )}>
                        {totalOrgBalance >= 0 ? `+${totalOrgBalance.toFixed(1)}` : totalOrgBalance.toFixed(1)}
                     </span>
                     <span className="text-xl font-bold text-slate-400 pb-1">h</span>
                  </div>
                  <p className="text-xs font-bold text-slate-400 leading-relaxed">
                      Accumulated personnel time credits across the entire organizational unit.
                  </p>
              </div>
          </Card>

          <Card className="p-8 rounded-[2.5rem] bg-white border border-slate-100 shadow-sm flex flex-col justify-between group hover:border-blue-200 transition-all">
              <div className="space-y-4">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">TOTAL EMPLOYEES</h3>
                  <div className="text-5xl font-black tracking-tighter text-slate-900 leading-none">
                      {accounts.length}
                  </div>
              </div>
              <div className="pt-6 flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                      <Users className="h-4 w-4" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Operational Workforce</span>
              </div>
          </Card>

          <Card className="p-8 rounded-[2.5rem] bg-white border border-slate-100 shadow-sm flex flex-col justify-between group hover:border-emerald-200 transition-all">
              <div className="space-y-4">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">TIME ACCOUNT COMPLIANCE</h3>
                  <div className="text-5xl font-black tracking-tighter text-emerald-600 leading-none">
                      {accounts.filter(a => a.balance >= 0).length} <span className="text-xl text-slate-300">/ {accounts.length}</span>
                  </div>
              </div>
              <div className="pt-6 flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                      <TrendingUp className="h-4 w-4" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Meeting Target Hours</span>
              </div>
          </Card>
      </div>

      {/* Personnel List Container */}
      <div className="space-y-4">
          <div className="flex items-center justify-between px-6">
              <h2 className="text-[10px] font-black text-slate-400 flex items-center gap-3 uppercase tracking-[0.3em] leading-none">
                  <Filter className="h-3 w-3" /> Personnel Monitoring List
              </h2>
              <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest">
                  Live Operational Sync Active
              </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredAccounts.map((account) => (
                  <div 
                    key={account.employee_id}
                    onClick={() => onSelectEmployee(account.employee_id)}
                    className="group bg-white rounded-[2rem] border border-slate-100 p-6 flex items-center justify-between cursor-pointer hover:border-blue-200 hover:shadow-xl hover:shadow-slate-100 transition-all active:scale-[0.98]"
                  >
                      <div className="flex items-center gap-5">
                          <div className="h-14 w-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors border border-slate-100">
                              <Users className="h-7 w-7" />
                          </div>
                          <div className="space-y-1">
                              <h4 className="text-lg font-black text-slate-900 tracking-tight leading-none group-hover:text-blue-600 transition-colors">
                                  {account.full_name}
                              </h4>
                              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                  Target: {account.target_hours}h / month
                              </p>
                          </div>
                      </div>

                      <div className="flex items-center gap-6">
                          <div className="text-right space-y-1">
                              <div className={cn(
                                  "text-[13px] font-black tabular-nums tracking-widest px-4 py-1.5 rounded-full",
                                  account.balance >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                              )}>
                                  {account.balance >= 0 ? `+${account.balance.toFixed(1)}H` : `${account.balance.toFixed(1)}H`}
                              </div>
                              <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.2em] px-1">CURRENT BALANCE</p>
                          </div>
                          <ChevronRight className="h-5 w-5 text-slate-200 group-hover:text-blue-600 transition-colors" />
                      </div>
                  </div>
              ))}
          </div>
      </div>
    </div>
  )
}
