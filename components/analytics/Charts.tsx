'use client'

import {
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts'

export function LeadsOverTimeChart({ data }: { data: any[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="new_leads" name="New Leads" stroke="#2563EB" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="qualified" name="Qualified" stroke="#059669" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="completed" name="Completed" stroke="#94A3B8" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}

export function RevenueTrendChart({ data }: { data: any[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#93C5FD" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#93C5FD" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip 
          formatter={(value: number) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value)}
        />
        <Legend />
        <ReferenceLine x="Today" stroke="#94A3B8" strokeDasharray="3 3" />
        <Area type="monotone" dataKey="actual" name="Actual Revenue" stroke="#2563EB" fillOpacity={1} fill="url(#colorActual)" />
        <Area type="monotone" dataKey="forecast" name="Forecast" stroke="#93C5FD" strokeDasharray="5 5" fillOpacity={1} fill="url(#colorForecast)" />
      </AreaChart>
    </ResponsiveContainer>
  )
}

const COLORS = {
  website: '#2563EB',
  google_ads: '#7C3AED',
  meta_ads: '#0891B2',
  referral: '#059669',
  other: '#94A3B8'
}

export function LeadSourcesChart({ data }: { data: any[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={80}
          paddingAngle={5}
          dataKey="value"
          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
          labelLine={false}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[entry.name as keyof typeof COLORS] || COLORS.other} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  )
}

export function JobsByStatusChart({ data }: { data: any[] }) {
  const STATUS_COLORS = {
    pending: '#94A3B8',
    scheduled: '#2563EB',
    in_progress: '#EAB308',
    completed: '#059669',
    cancelled: '#DC2626'
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip />
        <Legend />
        <Bar dataKey="value" name="Jobs" radius={[4, 4, 0, 0]}>
          {data.map((entry, index) => (
             <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name as keyof typeof STATUS_COLORS] || '#000'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
