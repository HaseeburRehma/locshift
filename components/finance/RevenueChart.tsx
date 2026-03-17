'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts"
import { format, subDays, startOfDay, endOfDay, isWithinInterval } from "date-fns"

interface RevenueChartProps {
  jobs: any[]
}

export function RevenueChart({ jobs }: RevenueChartProps) {
  // Process data for the last 14 days
  const last14Days = Array.from({ length: 14 }).map((_, i) => {
    const date = subDays(new Date(), i)
    return {
      day: format(date, 'MMM dd'),
      start: startOfDay(date),
      end: endOfDay(date),
      revenue: 0,
    }
  }).reverse()

  jobs.forEach(job => {
    const jobDate = new Date(job.created_at)
    last14Days.forEach(d => {
      if (isWithinInterval(jobDate, { start: d.start, end: d.end })) {
        d.revenue += job.total_price || 0
      }
    })
  })

  const data = last14Days.map(d => ({
    name: d.day,
    Revenue: d.revenue
  }))

  return (
    <Card className="border-border/50 shadow-sm rounded-[2.5rem] overflow-hidden bg-white">
      <CardHeader className="p-8 pb-4">
        <div className="flex items-center justify-between">
           <div className="space-y-1">
              <CardTitle className="text-2xl font-black tracking-tight">Revenue Stream</CardTitle>
              <CardDescription className="text-sm">Daily earnings from completed jobs across the last 14 days.</CardDescription>
           </div>
           <div className="flex gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest border border-emerald-100">
                 <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                 Live Data
              </div>
           </div>
        </div>
      </CardHeader>
      <CardContent className="p-8 pt-6 h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.15}/>
                <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fontWeight: 700, fill: '#94A3B8' }}
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fontWeight: 700, fill: '#94A3B8' }}
              tickFormatter={(val) => `${val}€`}
            />
            <Tooltip 
              cursor={{ stroke: '#10B981', strokeWidth: 2, strokeDasharray: '4 4' }}
              contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', padding: '12px 16px' }}
              labelStyle={{ fontWeight: 900, fontSize: '12px', marginBottom: '4px', textTransform: 'uppercase', color: '#64748B' }}
            />
            <Area 
              type="monotone" 
              dataKey="Revenue" 
              stroke="#10B981" 
              strokeWidth={4}
              fillOpacity={1} 
              fill="url(#colorRevenue)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
