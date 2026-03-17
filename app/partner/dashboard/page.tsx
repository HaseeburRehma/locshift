"use client"

import { useTranslation } from '@/lib/i18n'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ShoppingCart, UserCheck, BarChart3, Wallet, Clock, ArrowUpRight } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

const fetcher = (url: string) => fetch(url).then(res => res.json())

export default function PartnerDashboardPage() {
  const { t, locale } = useTranslation()
  const supabase = createClient()
  const [profile, setProfile] = useState<any>(null)

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        setProfile(data)
      }
    }
    loadProfile()
  }, [])

  // In a real app, these would be API routes
  const availableLeadsCount = 12 // Placeholder
  const activeLeadsCount = 4 // Placeholder

  if (!profile && !profile?.partner_id) {
    return <div className="p-8 text-center text-muted-foreground">Lade Partner-Profil...</div>
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold">{t('portal.partner.title')}</h1>
        <p className="text-muted-foreground">{t('portal.partner.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title={t('portal.partner.stats.available')} value={availableLeadsCount} icon={ShoppingCart} color="text-purple-600" bg="bg-purple-50" />
        <StatCard title={t('portal.partner.stats.active')} value={activeLeadsCount} icon={UserCheck} color="text-blue-600" bg="bg-blue-50" />
        <StatCard title={t('portal.partner.stats.conversion')} value="12%" icon={BarChart3} color="text-green-600" bg="bg-green-50" />
        <StatCard title={t('portal.partner.stats.balance')} value="€ 450,00" icon={Wallet} color="text-orange-600" bg="bg-orange-50" />
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 rounded-3xl border-purple-100/50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-xl font-bold">{t('portal.partner.recent')}</CardTitle>
            <Button variant="ghost" size="sm" asChild className="text-purple-600 hover:text-purple-700 hover:bg-purple-50 font-bold">
              <Link href="/partner/my-leads">{t('portal.partner.all_leads')}</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {[1, 2, 3].map((_, i) => (
                <div key={i} className="flex items-center justify-between p-5 rounded-2xl border border-dashed hover:border-purple-200 hover:bg-purple-50/10 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-purple-200">
                      L{i}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">
                        {locale === 'en' ? 'New Lead: Renovation Berlin' : 'Neuer Lead: Sanierung Berlin'}
                      </p>
                      <p className="text-xs text-muted-foreground font-medium italic">
                        {locale === 'en' ? 'Purchased 2 hours ago' : 'Gekauft vor 2 Stunden'}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-purple-100 text-purple-700 hover:bg-purple-100 border-none px-4 py-1 text-[10px] font-black uppercase">
                    {locale === 'en' ? 'In Progress' : 'In Bearbeitung'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-purple-100/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl font-bold">
              {locale === 'en' ? 'Top Areas' : 'Top Gebiete'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <AreaRow name="Berlin-Mitte" count={12} />
            <AreaRow name="Charlottenburg" count={8} />
            <AreaRow name="Prenzlauer Berg" count={5} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function StatCard({ title, value, icon: Icon, color, bg }: any) {
  return (
    <Card className="rounded-3xl border-none shadow-none bg-white border border-purple-50/50 hover:border-purple-200 transition-all group">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <div className={cn("p-3 rounded-2xl shadow-sm transition-transform group-hover:scale-110", bg)}>
            <Icon className={cn("h-6 w-6", color)} />
          </div>
          <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
        </div>
        <div>
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{title}</h3>
          <p className="text-3xl font-black mt-1 text-slate-900">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function AreaRow({ name, count }: { name: string, count: number }) {
  return (
    <div className="flex items-center justify-between p-4 rounded-xl hover:bg-purple-50/50 transition-colors group cursor-default">
      <span className="text-sm font-bold text-slate-700 group-hover:text-purple-900">{name}</span>
      <Badge variant="outline" className="font-black border-purple-200 text-purple-700 bg-white group-hover:bg-purple-600 group-hover:text-white group-hover:border-purple-600 transition-all">
        {count}
      </Badge>
    </div>
  )
}
