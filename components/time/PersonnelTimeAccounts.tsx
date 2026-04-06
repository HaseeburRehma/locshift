'use client'

import React from 'react'
import {
  Users,
  Search,
  ChevronRight,
  BarChart3,
  TrendingUp,
  Clock,
  Filter,
  Wifi
} from 'lucide-react'
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
  const compliantCount = accounts.filter(a => a.balance >= 0).length

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-24 md:pb-10">

      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-5">
        <div className="space-y-1.5">
          <h1 className="text-[28px] md:text-4xl font-black tracking-tighter flex items-center gap-3 text-slate-900">
            <div className="h-11 w-11 rounded-[18px] bg-slate-900 text-white flex items-center justify-center shadow-xl shrink-0">
              <BarChart3 className="h-5 w-5" />
            </div>
            Personnel Accounts
          </h1>
          <p className="text-[13px] text-slate-400 font-medium max-w-md leading-relaxed pl-[56px] md:pl-0">
            Global operational monitoring of time balances and workforce efficiency.
          </p>
        </div>

        {/* Search */}
        <div className="relative group w-full md:max-w-sm shrink-0">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
          <Input
            placeholder="Search employee accounts..."
            className="pl-11 rounded-2xl border border-slate-200 h-12 bg-white focus:bg-white transition-all shadow-sm focus:shadow-md focus:border-blue-300 text-sm font-medium text-slate-700 placeholder:text-slate-400"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* ── Stats Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Organization Balance — dark hero card */}
        <div className="relative overflow-hidden rounded-[24px] bg-slate-900 p-6 shadow-2xl shadow-slate-900/20">
          {/* Ghost clock icon */}
          <div className="absolute right-5 top-1/2 -translate-y-1/2 opacity-10 pointer-events-none text-blue-400">
            <Clock className="w-24 h-24" />
          </div>
          <div className="relative z-10 space-y-3">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400">
              ORGANIZATION BALANCE
            </p>
            <div className="flex items-end gap-1.5 leading-none">
              <span className={cn(
                "text-4xl font-black tracking-tighter tabular-nums",
                totalOrgBalance >= 0 ? "text-blue-400" : "text-red-400"
              )}>
                {totalOrgBalance >= 0 ? `+${totalOrgBalance.toFixed(1)}` : totalOrgBalance.toFixed(1)}
              </span>
              <span className="text-lg font-bold text-slate-500 pb-0.5">h</span>
            </div>
            <p className="text-[11px] font-medium text-slate-400 leading-relaxed max-w-[200px]">
              Accumulated personnel time credits across the entire organizational unit.
            </p>
          </div>
        </div>

        {/* Total Employees */}
        <div className="rounded-[24px] bg-white border border-slate-100 shadow-sm p-5 flex flex-col justify-between hover:border-blue-200 hover:shadow-md transition-all">
          <div className="space-y-2">
            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">
              TOTAL EMPLOYEES
            </p>
            <div className="text-3xl font-black tracking-tighter text-slate-900 leading-none">
              {accounts.length}
            </div>
          </div>
          <div className="pt-3 flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg bg-blue-50 flex items-center justify-center">
              <Users className="h-3 w-3 text-blue-600" />
            </div>
            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">
              Operational Workforce
            </span>
          </div>
        </div>

        {/* Compliance */}
        <div className="rounded-[24px] bg-white border border-slate-100 shadow-sm p-5 flex flex-col justify-between hover:border-emerald-200 hover:shadow-md transition-all">
          <div className="space-y-2">
            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">
              TIME ACCOUNT COMPLIANCE
            </p>
            <div className="flex items-end gap-1 leading-none">
              <span className="text-3xl font-black tracking-tighter text-emerald-600">
                {compliantCount}
              </span>
              <span className="text-lg font-black text-slate-300 pb-0.5">/{accounts.length}</span>
            </div>
          </div>
          <div className="pt-3 flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg bg-emerald-50 flex items-center justify-center">
              <TrendingUp className="h-3 w-3 text-emerald-600" />
            </div>
            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">
              Meeting Target Hours
            </span>
          </div>
        </div>
      </div>

      {/* ── Personnel List ── */}
      <div className="space-y-3">
        {/* List header */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
            <Filter className="h-3 w-3" />
            Personnel Monitoring List
          </div>
          <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-slate-300">
            <Wifi className="h-3 w-3 text-emerald-400" />
            Live Operational Sync Active
          </div>
        </div>

        {/* Employee rows */}
        <div className="space-y-2.5">
          {filteredAccounts.length === 0 && (
            <div className="text-center py-16 text-slate-400 text-sm font-medium">
              No employees found
            </div>
          )}
          {filteredAccounts.map((account) => (
            <div
              key={account.employee_id}
              onClick={() => onSelectEmployee(account.employee_id)}
              className="group bg-white rounded-[20px] border border-slate-100 px-5 py-4 flex items-center justify-between cursor-pointer hover:border-blue-200 hover:shadow-lg hover:shadow-slate-100/80 transition-all active:scale-[0.985]"
            >
              {/* Left: avatar + info */}
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-[16px] bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 group-hover:border-blue-100 transition-colors shrink-0">
                  <Users className="h-6 w-6" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-[15px] font-black text-slate-900 tracking-tight leading-none group-hover:text-blue-700 transition-colors">
                    {account.full_name}
                  </h4>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Target: {account.target_hours}h / month
                  </p>
                </div>
              </div>

              {/* Right: balance badge + arrow */}
              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right space-y-0.5">
                  <div className={cn(
                    "text-[13px] font-black tabular-nums tracking-wide px-3.5 py-1.5 rounded-xl",
                    account.balance >= 0
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-red-50 text-red-500"
                  )}>
                    {account.balance >= 0
                      ? `+${account.balance.toFixed(1)}H`
                      : `${account.balance.toFixed(1)}H`}
                  </div>
                  <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.15em] text-right pr-1">
                    CURRENT BALANCE
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
