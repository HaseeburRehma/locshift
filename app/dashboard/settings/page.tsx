import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { 
  Building2, 
  Settings2, 
  Bell, 
  CreditCard, 
  ChevronRight,
  ShieldCheck,
  Zap,
  Globe,
  User,
  Map,
  Clock,
  GraduationCap,
  MessageSquare,
  Lock,
  Info,
  Sun,
  LogOut
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { NotificationToggle } from '@/components/settings/NotificationToggle'
import { cn } from '@/lib/utils'

export default async function SettingsHubPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email, avatar_url')
    .eq('id', user.id)
    .single()

  const settingsCards = [
    {
      title: 'Konto & Personal',
      description: 'Persönliches Profil, Qualifikationen und Stammdaten verwalten.',
      href: '/dashboard/settings/personal-data',
      icon: User,
      color: 'bg-indigo-600',
      status: 'Persönlich'
    },
    {
      title: 'Globale Einstellungen',
      description: 'Systemweite Arbeitszeitmodelle konfigurieren und verwalten.',
      href: '/dashboard/settings/global',
      icon: Settings2,
      color: 'bg-slate-900',
      status: 'Kern'
    },
    {
      title: 'Betriebsstellen',
      description: 'Start- und Zielorte (Depots, Bahnhöfe, Werkstätten) verwalten.',
      href: '/dashboard/settings/betriebsstellen',
      icon: Building2,
      color: 'bg-cyan-600',
      status: 'Phase 3'
    },
    {
      title: 'Unternehmensprofil',
      description: 'Firmendaten, Branding und Kontaktinformationen verwalten.',
      href: '/dashboard/settings/company',
      icon: Building2,
      color: 'bg-blue-500',
      status: 'Konfiguriert'
    },
    {
      title: 'Integrationen',
      description: 'Anbindung an Supabase, Anthropic Claude, Stripe u. a.',
      href: '/dashboard/settings/integrations',
      icon: Zap,
      color: 'bg-amber-500',
      status: '5 aktiv'
    },
    {
      title: 'Benachrichtigungen',
      description: 'E-Mail-, WhatsApp- und In-App-Benachrichtigungen steuern.',
      href: '/dashboard/settings/notifications',
      icon: Bell,
      color: 'bg-indigo-500',
      status: 'Aktiv'
    },
    {
      title: 'Abrechnung & Tarife',
      description: 'Abo-Guthaben und Nutzungsstatistiken einsehen.',
      href: '/dashboard/settings/billing',
      icon: CreditCard,
      color: 'bg-emerald-500',
      status: 'Premium'
    },
    {
      title: 'Sicherheit',
      description: 'Rollenbasierte Zugriffskontrolle und Systemberechtigungen.',
      href: '/dashboard/settings/security',
      icon: ShieldCheck,
      color: 'bg-red-500',
      status: 'Sicher'
    },
    {
      title: 'Lokalisierung',
      description: 'Sprachen, Zeitzone und Währung konfigurieren.',
      href: '/dashboard/settings/company#localization',
      icon: Globe,
      color: 'bg-cyan-500',
      status: 'DE/EN'
    }
  ]

  return (
    <div className="relative">
      {/* ----------------- DESKTOP VIEW ----------------- */}
      <div className="hidden md:block space-y-8 pb-24">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-[#0064E0]">Einstellungen</h1>
          <p className="text-slate-500 font-medium">Feinjustieren Sie Ihre LokShift-Einsatzzentrale.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {settingsCards.map((card) => {
            const Icon = card.icon
            return (
              <Link key={card.title} href={card.href}>
                <div className="group h-full bg-white rounded-[2.5rem] border border-slate-100 p-8 hover:border-blue-200 hover:shadow-2xl hover:shadow-blue-500/5 transition-all relative overflow-hidden">
                  <div className={cn("absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 rounded-full opacity-[0.03] group-hover:scale-150 transition-transform duration-700", card.color)} />
                  
                  <div className="flex flex-col h-full gap-6">
                    <div className="flex items-center justify-between">
                      <div className={cn("h-14 w-14 rounded-2xl flex items-center justify-center text-white shadow-lg", card.color)}>
                        <Icon className="h-7 w-7" />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 px-3 py-1 rounded-full">
                        {card.status}
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      <h3 className="text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{card.title}</h3>
                      <p className="text-sm text-slate-500 font-medium leading-relaxed">
                        {card.description}
                      </p>
                    </div>

                    <div className="mt-auto pt-6 flex items-center text-blue-600 text-[10px] font-black uppercase tracking-widest gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-[-10px] group-hover:translate-x-0">
                      Konfigurieren <ChevronRight className="h-3 w-3 stroke-[3]" />
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* ----------------- MOBILE VIEW ----------------- */}
      <div className="block md:hidden bg-[#FAFBFF] -mx-4 -mt-8 px-4 py-8 space-y-8">
        
        {/* Profile Header */}
        <div className="flex flex-col items-center justify-center mt-4">
          <div className="w-24 h-24 rounded-full bg-slate-100 overflow-hidden mb-4 border-4 border-white shadow-xl shadow-slate-200/50 shrink-0">
            {profile?.avatar_url ? (
              <Image src={profile.avatar_url} alt="Profile" width={96} height={96} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl font-black text-blue-600 bg-blue-50">
                {profile?.full_name?.charAt(0) || user.email?.charAt(0)}
              </div>
            )}
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">{profile?.full_name || 'User'}</h2>
          <p className="text-sm font-medium text-slate-400">{profile?.email || user.email}</p>
        </div>

        {/* Persönliche Daten */}
        <div className="space-y-3">
          <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 px-2 opacity-60">Persönliche Daten</h3>
          <div className="bg-white rounded-3xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-slate-100">
            <MobileLinkItem icon={User} label="Stammdaten" href="/dashboard/settings/personal-data" />
            <MobileLinkItem icon={Map} label="Abwesenheiten" href="/dashboard/settings/absences" />
            <MobileLinkItem icon={Clock} label="Arbeitszeiten" href="/dashboard/settings/working-hours" />
            <MobileLinkItem icon={GraduationCap} label="Qualifikationen" href="/dashboard/settings/qualifications" borderBottom={false} />
          </div>
        </div>

        {/* Einstellungen */}
        <div className="space-y-3">
          <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 px-2 opacity-60">Einstellungen</h3>
          <div className="bg-white rounded-3xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-slate-100">
            <MobileActionItem icon={Bell} label="Benachrichtigungen">
              <NotificationToggle initialEnabled={true} userId={user.id} />
            </MobileActionItem>
            <MobileActionItem icon={Globe} label="Sprache wählen">
              <div className="flex items-center gap-1 text-blue-600 font-bold text-xs uppercase tracking-tighter bg-blue-50/50 px-2.5 py-1 rounded-lg">
                 Deutsch <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/></svg>
              </div>
            </MobileActionItem>
            <MobileLinkItem icon={Clock} label="Auto-Erfassung" href="/dashboard/settings" />
            <MobileLinkItem icon={Lock} label="Passwort ändern" href="/dashboard/settings" borderBottom={false} />
          </div>
        </div>

        {/* Informationen */}
        <div className="space-y-3">
          <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 px-2 opacity-60">Informationen</h3>
          <div className="bg-white rounded-3xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-slate-100">
            <MobileLinkItem icon={MessageSquare} label="Feedback & Hilfe" href="/dashboard/settings" />
            <MobileLinkItem icon={Lock} label="Datenschutz" href="/dashboard/settings" />
            <MobileLinkItem icon={Info} label="Impressum" href="/dashboard/settings" borderBottom={false} />
          </div>
        </div>

        {/* Darstellung */}
        <div className="space-y-3">
          <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 px-2 opacity-60">Darstellung</h3>
          <div className="bg-white rounded-3xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-slate-100">
            <MobileActionItem icon={Sun} label="Design" borderBottom={false}>
              <div className="flex items-center gap-1 text-slate-400 font-bold text-xs uppercase tracking-tighter bg-slate-50 px-2.5 py-1 rounded-lg">
                 System <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/></svg>
              </div>
            </MobileActionItem>
          </div>
        </div>

        {/* Abmelden */}
        <form action="/auth/signout" method="post" className="pt-4 pb-8">
           <button type="submit" className="w-full bg-[#FAFBFF] text-red-500 border border-red-100 py-4 rounded-2xl flex items-center justify-center gap-2 font-black text-sm uppercase tracking-widest active:scale-[0.98] transition-all shadow-sm">
             <LogOut className="w-4 h-4 stroke-[3]" /> Abmelden
           </button>
        </form>

      </div>
    </div>
  )
}

function MobileLinkItem({ icon: Icon, label, href, borderBottom = true }: { icon: any, label: string, href: string, borderBottom?: boolean }) {
  return (
    <Link href={href} className={cn("flex items-center justify-between p-4 active:bg-slate-50 transition-colors", borderBottom && "border-b border-slate-50")}>
      <div className="flex items-center gap-4 text-blue-600">
        <Icon className="w-5 h-5" />
        <span className="text-[15px] font-medium text-slate-800">{label}</span>
      </div>
      <ChevronRight className="w-5 h-5 text-blue-600" />
    </Link>
  )
}

function MobileActionItem({ icon: Icon, label, children, borderBottom = true }: { icon: any, label: string, children: React.ReactNode, borderBottom?: boolean }) {
  return (
    <div className={cn("flex items-center justify-between p-4", borderBottom && "border-b border-slate-50")}>
      <div className="flex items-center gap-4 text-blue-600">
        <Icon className="w-5 h-5" />
        <span className="text-[15px] font-medium text-slate-800">{label}</span>
      </div>
      {children}
    </div>
  )
}
