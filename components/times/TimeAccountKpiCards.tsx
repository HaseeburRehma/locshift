import React from 'react'

interface TimeAccountKpiCardsProps {
  balance: number
  overtimePaid?: number
}

export function TimeAccountKpiCards({ balance, overtimePaid = 0 }: TimeAccountKpiCardsProps) {
  const balanceFormatted = (balance >= 0 ? '+' : '') + balance.toFixed(1)

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-6">
      {/* Hours Balance Card */}
      <div className="bg-[#0064E0] rounded-[2.5rem] p-8 text-white shadow-2xl shadow-blue-500/20 relative overflow-hidden group">
        <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
        <div className="relative z-10 space-y-2">
          <h4 className="text-5xl font-black tracking-tighter tabular-nums">
            {balanceFormatted}
          </h4>
          <p className="text-[10px] font-black uppercase tracking-widest text-white/70">
            Hours Balance
          </p>
        </div>
      </div>

      {/* Overtime Paid Card */}
      <div className="bg-[#16A34A] rounded-[2.5rem] p-8 text-white shadow-2xl shadow-green-500/20 relative overflow-hidden group">
        <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
        <div className="relative z-10 space-y-2">
          <h4 className="text-5xl font-black tracking-tighter tabular-nums">
            {overtimePaid.toFixed(1)}
          </h4>
          <p className="text-[10px] font-black uppercase tracking-widest text-white/70">
            Overtime Paid
          </p>
        </div>
      </div>
    </div>
  )
}
