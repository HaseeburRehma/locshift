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
  LineChart,
  Line,
  AreaChart,
  Area
} from "recharts"
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from "date-fns"

interface TechnicianPerformanceProps {
  technicianId: string
  jobs: any[]
}

export function TechnicianPerformance({ technicianId, jobs }: TechnicianPerformanceProps) {
  // Process data for the last 6 months
  const last6Months = Array.from({ length: 6 }).map((_, i) => {
    const date = subMonths(new Date(), i)
    return {
      month: format(date, 'MMM'),
      fullName: format(date, 'MMMM yyyy'),
      start: startOfMonth(date),
      end: endOfMonth(date),
      jobs: 0,
      revenue: 0,
      rating: 0,
      ratingCount: 0
    }
  }).reverse()

  jobs.forEach(job => {
    const jobDate = new Date(job.scheduled_time)
    last6Months.forEach(m => {
      if (isWithinInterval(jobDate, { start: m.start, end: m.end })) {
        if (job.status === 'completed') {
          m.jobs++
          m.revenue += job.total_price || 0
          if (job.rating) {
            m.rating += job.rating.rating
            m.ratingCount++
          }
        }
      }
    })
  })

  const data = last6Months.map(m => ({
    name: m.month,
    Jobs: m.jobs,
    Revenue: m.revenue,
    Rating: m.ratingCount > 0 ? (m.rating / m.ratingCount).toFixed(1) : 0
  }))

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-border/50 shadow-sm overflow-hidden">
          <CardHeader className="bg-muted/30 pb-4 border-b">
            <CardTitle className="text-sm font-black uppercase tracking-widest text-zinc-500">Job Volume</CardTitle>
            <CardDescription className="text-xs">Completed jobs per month</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#64748B' }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#64748B' }}
                />
                <Tooltip 
                  cursor={{ fill: '#F1F5F9' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                />
                <Bar 
                  dataKey="Jobs" 
                  fill="#2563EB" 
                  radius={[4, 4, 0, 0]} 
                  barSize={32}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm overflow-hidden">
          <CardHeader className="bg-muted/30 pb-4 border-b">
            <CardTitle className="text-sm font-black uppercase tracking-widest text-zinc-500">Revenue Trend (€)</CardTitle>
            <CardDescription className="text-xs">Monthly earnings from completed jobs</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#64748B' }} 
                />
                <YAxis 
                   axisLine={false} 
                   tickLine={false} 
                   tick={{ fontSize: 10, fontWeight: 700, fill: '#64748B' }}
                />
                <Tooltip 
                   contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="Revenue" 
                  stroke="#10B981" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorRev)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
