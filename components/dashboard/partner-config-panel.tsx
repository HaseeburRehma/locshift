'use client'

import useSWR, { mutate } from 'swr'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Users, Store, Globe, Handshake, Mail, MapPin, Plus } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'
import { useTranslation } from '@/lib/i18n'

const fetcher = (url: string) => fetch(url).then(res => res.json())

export function PartnerConfigPanel() {
  const { locale } = useTranslation()

  // We reuse the /api/users endpoint for now but filter for partners
  // In a full implementation, you'd want a separate /api/partners endpoint
  const { data: users, error } = useSWR('/api/users', fetcher)

  if (error) return <div className="text-red-500 p-4">Failed to load partners: {error?.message}</div>
  if (!users) return <div className="flex justify-center p-8"><Spinner /></div>

  // Guard against API returning an error object instead of an array
  const usersList = Array.isArray(users) ? users : []
  const partners = usersList.filter((u: any) => u.role === 'partner_admin' || u.role === 'partner_agent')

  return (
    <Card className="shadow-sm border-slate-200 mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Handshake className="w-5 h-5 text-emerald-600" />
          {locale === 'en' ? 'Marketplace Partners' : 'Marktplatz-Partner'}
        </CardTitle>
        <CardDescription>
          {locale === 'en' ? 'Manage your B2B partners who buy or receive leads.' : 'Verwalten Sie Ihre B2B-Partner, die Leads kaufen oder erhalten.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {partners.length === 0 ? (
          <div className="py-8 text-center border-2 border-dashed rounded-lg bg-slate-50/50">
            <Store className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <h4 className="font-medium text-slate-700">No partners found</h4>
            <p className="text-sm text-slate-500">Assign the "partner_admin" role to a user to see them here.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {partners.map((partner: any) => (
              <div key={partner.id} className="border rounded-lg p-4 bg-slate-50 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-100 rounded-bl-full -z-0 opacity-50" />
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-bold text-slate-900">{partner.full_name || 'Partner Account'}</h4>
                      <Badge variant="outline" className={`mt-1 font-mono text-[10px] ${partner.role === 'partner_admin' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-teal-100 text-teal-800 border-teal-200'}`}>
                        {partner.role.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                      onClick={async () => {
                        if (confirm(locale === 'en' ? 'Delete this partner user?' : 'Partner-Benutzer löschen?')) {
                          const res = await fetch(`/api/users/${partner.id}`, { method: 'DELETE' })
                          if (res.ok) fetch('/api/users').then(r => r.json()).then(d => mutate('/api/users', d))
                          else alert('Delete failed')
                        }
                      }}
                    >
                      <Plus className="w-4 h-4 rotate-45" />
                    </Button>
                  </div>
                  <div className="space-y-2 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-slate-400" />
                      {partner.email}
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-slate-400" />
                      Global Access
                    </div>
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-slate-400" />
                      API Access: <Badge variant="secondary" className="px-1 text-[10px] bg-green-100 text-green-700">Active</Badge>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
