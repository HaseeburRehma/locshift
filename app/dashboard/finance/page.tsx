import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { withTimeout } from '@/lib/supabase/with-timeout'
import { FinanceKPICard } from '@/components/finance/FinanceKPICard'
import { RevenueStreamChart } from '@/components/finance/RevenueStreamChart'
import { PartnerCreditsTable } from '@/components/finance/PartnerCreditsTable'
import { CommissionsTable } from '@/components/finance/CommissionsTable'
import { RecentTransactionsList } from '@/components/finance/RecentTransactionsList'
import {
  BarChart3,
  Download,
  Plus,
  Wallet,
  TrendingUp,
  Calendar,
  Star,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatEUR(amount: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
  }).format(amount)
}

function parseEstimatedValue(val: string | null | undefined): number {
  if (!val) return 0
  const clean = val.replace(/[€\s]/g, '')
  // "200-500" → midpoint 350
  const rangeMatch = clean.match(/^(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)$/)
  if (rangeMatch) {
    return (parseFloat(rangeMatch[1]) + parseFloat(rangeMatch[2])) / 2
  }
  // "500+" → 600
  const plusMatch = clean.match(/^(\d+(?:\.\d+)?)\+$/)
  if (plusMatch) return parseFloat(plusMatch[1]) * 1.2
  // "500" → 500
  const singleMatch = clean.match(/^(\d+(?:\.\d+)?)$/)
  if (singleMatch) return parseFloat(singleMatch[1])
  return 0
}

function buildDailyRevenue(jobs: any[]) {
  const now = new Date()
  const days: { date: string; revenue: number; jobs: number }[] = []

  for (let i = 13; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const label = d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' })
    const dayStr = d.toISOString().slice(0, 10)

    const dayJobs = jobs.filter(
      (j) => j.updated_at && j.updated_at.slice(0, 10) === dayStr
    )
    const revenue = dayJobs.reduce((sum, job) => {
      const lead = Array.isArray(job.leads) ? job.leads[0] : job.leads
      return sum + parseEstimatedValue(lead?.estimated_value)
    }, 0)

    days.push({ date: label, revenue: Math.round(revenue), jobs: dayJobs.length })
  }
  return days
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function FinancePage() {
  const supabase = await createClient()
  const { data: { user } } = await withTimeout(
    supabase.auth.getUser(),
    5000,
    { data: { user: null }, error: null } as any
  )
  if (!user) redirect('/auth/login')

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const fourteenDaysAgo = new Date(now)
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)
  const thirtyDaysAgo = new Date(now)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const startOfMonthISO = startOfMonth.toISOString()
  const fourteenDaysAgoISO = fourteenDaysAgo.toISOString()
  const thirtyDaysAgoISO = thirtyDaysAgo.toISOString()

  const fallbackList = { data: [] as any[], error: null }

  const [
    settingsResult,
    completedJobsResult,
    monthJobsResult,
    partnerCreditsResult,
    partnerLeadsResult,
    recentTransactionsResult,
    dailyRevenueResult,
  ] = await Promise.allSettled([
    withTimeout(
      supabase.from('company_settings').select('credits_balance').single() as any,
      8000,
      { data: null, error: null } as any
    ),
    withTimeout(
      supabase
        .from('jobs')
        .select('id, updated_at, leads(estimated_value)')
        .eq('status', 'completed') as any,
      8000,
      fallbackList
    ),
    withTimeout(
      supabase
        .from('jobs')
        .select('id, updated_at, leads(estimated_value)')
        .eq('status', 'completed')
        .gte('updated_at', thirtyDaysAgoISO) as any,
      8000,
      fallbackList
    ),
    withTimeout(
      supabase
        .from('partner_credits')
        .select(
          'partner_id, amount, transaction_type, created_at, partners(company_name)'
        )
        .order('created_at', { ascending: false })
        .limit(50) as any,
      8000,
      fallbackList
    ),
    withTimeout(
      supabase
        .from('partner_leads')
        .select(
          'commission_amount, commission_paid, status, partners(company_name), leads(name)'
        )
        .eq('status', 'converted') as any,
      8000,
      fallbackList
    ),
    withTimeout(
      supabase
        .from('partner_credits')
        .select(
          'id, amount, transaction_type, description, created_at, partners(company_name)'
        )
        .order('created_at', { ascending: false })
        .limit(10) as any,
      8000,
      fallbackList
    ),
    withTimeout(
      supabase
        .from('jobs')
        .select('updated_at, leads(estimated_value)')
        .eq('status', 'completed')
        .gte('updated_at', fourteenDaysAgoISO) as any,
      8000,
      fallbackList
    ),
  ])

  // ── Safe extraction ──────────────────────────────────────────────────────────
  const systemCredits =
    settingsResult.status === 'fulfilled'
      ? (settingsResult.value.data?.credits_balance ?? 0)
      : 0
  const completedJobs =
    completedJobsResult.status === 'fulfilled'
      ? (completedJobsResult.value.data ?? [])
      : []
  const monthJobs =
    monthJobsResult.status === 'fulfilled'
      ? (monthJobsResult.value.data ?? [])
      : []
  const partnerCredits =
    partnerCreditsResult.status === 'fulfilled'
      ? (partnerCreditsResult.value.data ?? [])
      : []
  const partnerLeads =
    partnerLeadsResult.status === 'fulfilled'
      ? (partnerLeadsResult.value.data ?? [])
      : []
  const recentTransactions =
    recentTransactionsResult.status === 'fulfilled'
      ? (recentTransactionsResult.value.data ?? [])
      : []
  const dailyJobs =
    dailyRevenueResult.status === 'fulfilled'
      ? (dailyRevenueResult.value.data ?? [])
      : []

  // ── Revenue calculation ──────────────────────────────────────────────────────
  const totalRevenue = completedJobs.reduce((sum: number, job: any) => {
    const lead = Array.isArray(job.leads) ? job.leads[0] : job.leads
    return sum + parseEstimatedValue(lead?.estimated_value)
  }, 0)

  const monthRevenue = monthJobs.reduce((sum: number, job: any) => {
    const lead = Array.isArray(job.leads) ? job.leads[0] : job.leads
    return sum + parseEstimatedValue(lead?.estimated_value)
  }, 0)

  const avgTicket = completedJobs.length > 0 ? totalRevenue / completedJobs.length : 0

  // ── Partner balances ─────────────────────────────────────────────────────────
  const partnerBalanceMap: Record<
    string,
    { name: string; balance: number; lastTopUp: string | null; activeLeads: number }
  > = {}
  for (const credit of partnerCredits) {
    const pid = credit.partner_id
    if (!partnerBalanceMap[pid]) {
      const partner = Array.isArray(credit.partners)
        ? credit.partners[0]
        : credit.partners
      partnerBalanceMap[pid] = {
        name: partner?.company_name ?? 'Unknown',
        balance: 0,
        lastTopUp: null,
        activeLeads: 0,
      }
    }
    partnerBalanceMap[pid].balance += credit.amount
    if (credit.transaction_type === 'top_up' && !partnerBalanceMap[pid].lastTopUp) {
      partnerBalanceMap[pid].lastTopUp = credit.created_at
    }
  }
  const partnersWithBalance = Object.entries(partnerBalanceMap).map(([id, data]) => ({
    id,
    ...data,
    commissionsOwed: partnerLeads
      .filter((pl: any) => {
        const p = Array.isArray(pl.partners) ? pl.partners[0] : pl.partners
        return p?.company_name === data.name && !pl.commission_paid
      })
      .reduce((s: number, pl: any) => s + (pl.commission_amount ?? 0), 0),
  }))

  // ── Commissions ──────────────────────────────────────────────────────────────
  const commissions = partnerLeads.map((pl: any, i: number) => {
    const partner = Array.isArray(pl.partners) ? pl.partners[0] : pl.partners
    const lead = Array.isArray(pl.leads) ? pl.leads[0] : pl.leads
    return {
      id: i.toString(),
      partnerName: partner?.company_name ?? 'Unknown',
      customerName: lead?.name ?? 'Unknown',
      amount: pl.commission_amount ?? 0,
      status: pl.status,
      paid: pl.commission_paid ?? false,
      date: pl.created_at ?? '',
    }
  })

  const totalCommissionsOwed = commissions
    .filter((c: any) => !c.paid)
    .reduce((s: number, c: any) => s + c.amount, 0)
  const totalCommissionsPaid = commissions
    .filter((c: any) => c.paid)
    .reduce((s: number, c: any) => s + c.amount, 0)

  // ── Chart data ───────────────────────────────────────────────────────────────
  const chartData = buildDailyRevenue(dailyJobs)

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-border/50">
        <div className="space-y-2">
          <h1 className="text-4xl font-black tracking-tight flex items-center gap-3">
            <div className="h-10 w-10 flex items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
              <BarChart3 className="h-6 w-6" />
            </div>
            Financial Hub
          </h1>
          <p className="text-muted-foreground font-medium">
            Monitor revenue, manage credits, and track partner commissions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" className="rounded-xl font-bold gap-2" asChild>
            <Link href="/dashboard/finance/invoices">
              <Download className="h-4 w-4" /> Invoices
            </Link>
          </Button>
          <Button
            className="rounded-xl font-black bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-lg"
            asChild
          >
            <Link href="/dashboard/finance/add-credits">
              <Plus className="h-4 w-4" /> Add Credits
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <FinanceKPICard
          label="System Credits"
          value={formatEUR(systemCredits)}
          change="+12%"
          positive={true}
          icon={<Wallet className="w-5 h-5" />}
          sub="Available for AI tasks"
          color="blue"
        />
        <FinanceKPICard
          label="Total Revenue"
          value={formatEUR(totalRevenue)}
          change="+24%"
          positive={true}
          icon={<TrendingUp className="w-5 h-5" />}
          sub="From completed jobs"
          color="emerald"
        />
        <FinanceKPICard
          label="Month Revenue"
          value={formatEUR(monthRevenue)}
          change="-2%"
          positive={false}
          icon={<Calendar className="w-5 h-5" />}
          sub="Past 30 days"
          color="violet"
        />
        <FinanceKPICard
          label="Avg. Ticket"
          value={formatEUR(avgTicket)}
          change="+5%"
          positive={true}
          icon={<Star className="w-5 h-5" />}
          sub="Per completed job"
          color="amber"
        />
      </div>

      {/* Chart + Sidebar */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <RevenueStreamChart data={chartData} />
        </div>

        <div className="space-y-4">
          {/* Commissions Summary */}
          <div className="bg-zinc-900 text-white rounded-2xl p-6 space-y-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-white/5 rounded-bl-2xl" />
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-1">
                Commissions
              </p>
              <h4 className="text-xl font-bold">Partner Commissions</h4>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/10 rounded-xl p-3">
                <p className="text-xs text-zinc-400 mb-1">Owed</p>
                <p className="text-lg font-bold text-red-400">
                  {formatEUR(totalCommissionsOwed)}
                </p>
              </div>
              <div className="bg-white/10 rounded-xl p-3">
                <p className="text-xs text-zinc-400 mb-1">Paid</p>
                <p className="text-lg font-bold text-emerald-400">
                  {formatEUR(totalCommissionsPaid)}
                </p>
              </div>
            </div>
            <Link href="/dashboard/finance/commissions">
              <Button
                variant="outline"
                className="w-full border-white/20 text-white bg-white/5 hover:bg-white/10 hover:text-white"
              >
                View All Commissions
              </Button>
            </Link>
          </div>

          {/* Next Payout */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
              Next Payout
            </p>
            <p className="text-2xl font-black text-zinc-900 dark:text-white">
              {formatEUR(1450)}
            </p>
            <p className="text-sm text-muted-foreground mt-1">Estimated · this Friday</p>
            <Button variant="outline" className="w-full mt-4 rounded-xl font-bold">
              View Schedule
            </Button>
          </div>
        </div>
      </div>

      {/* Partner Credits Table */}
      {partnersWithBalance.length > 0 && (
        <PartnerCreditsTable partners={partnersWithBalance} />
      )}

      {/* Bottom row: transactions + commissions */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-1">
          <RecentTransactionsList transactions={recentTransactions} />
        </div>
        <div className="xl:col-span-2">
          <CommissionsTable commissions={commissions} />
        </div>
      </div>
    </div>
  )
}
