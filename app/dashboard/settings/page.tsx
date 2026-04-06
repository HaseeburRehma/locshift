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
      title: 'Global Settings',
      description: 'Configure and manage system-wide working time models.',
      href: '/dashboard/settings/global',
      icon: Settings2,
      color: 'bg-slate-900',
      status: 'Core'
    },
    {
      title: 'Company Profile',
      description: 'Manage your business details, branding, and contact info.',
      href: '/dashboard/settings/company',
      icon: Building2,
      color: 'bg-blue-500',
      status: 'Configured'
    },
    {
      title: 'Integrations',
      description: 'Connect with Supabase, OpenAI, Stripe, and more.',
      href: '/dashboard/settings/integrations',
      icon: Zap,
      color: 'bg-amber-500',
      status: '6 Active'
    },
    {
      title: 'Notifications',
      description: 'Control alerts for email, WhatsApp, and in-app triggers.',
      href: '/dashboard/settings/notifications',
      icon: Bell,
      color: 'bg-indigo-500',
      status: 'Active'
    },
    {
      title: 'Billing & Plans',
      description: 'View your subscription balance and usage stats.',
      href: '/dashboard/settings/billing',
      icon: CreditCard,
      color: 'bg-emerald-500',
      status: 'Premium'
    },
    {
      title: 'Security',
      description: 'Role-based access control and system permissions.',
      href: '/dashboard/settings/security',
      icon: ShieldCheck,
      color: 'bg-red-500',
      status: 'Secure'
    },
    {
      title: 'Localization',
      description: 'Configure languages, timezone, and currency.',
      href: '/dashboard/settings/company#localization',
      icon: Globe,
      color: 'bg-cyan-500',
      status: 'DE/EN'
    }
  ]

  return (
    <div className="pb-24">
      {/* ----------------- DESKTOP VIEW ----------------- */}
      <div className="hidden md:block space-y-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-black tracking-tight">Settings Hub</h1>
          <p className="text-muted-foreground font-medium">Fine-tune your LokShift Operations Center parameters.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {settingsCards.map((card) => {
            const Icon = card.icon
            return (
              <Link key={card.title} href={card.href}>
                <div className="group bg-white rounded-[2rem] border border-border/50 p-8 hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5 transition-all relative overflow-hidden h-full">
                  <div className={cn("absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 rounded-full opacity-[0.03] group-hover:scale-150 transition-transform duration-700", card.color)} />
                  
                  <div className="flex flex-col h-full gap-6">
                    <div className="flex items-center justify-between">
                      <div className={cn("h-14 w-14 rounded-2xl flex items-center justify-center text-white shadow-lg", card.color)}>
                        <Icon className="h-7 w-7" />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
                        {card.status}
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      <h3 className="text-xl font-bold group-hover:text-primary transition-colors">{card.title}</h3>
                      <p className="text-sm text-muted-foreground font-medium leading-relaxed">
                        {card.description}
                      </p>
                    </div>

                    <div className="mt-auto pt-6 flex items-center text-primary text-xs font-black uppercase tracking-widest gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-[-10px] group-hover:translate-x-0">
                      Configure <ChevronRight className="h-3 w-3" />
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* ----------------- MOBILE VIEW ----------------- */}
      <div className="block md:hidden bg-[#FAFBFF] min-h-screen -mx-4 -mt-8 px-4 py-8 space-y-8">
        
        {/* Profile Header */}
        <div className="flex flex-col items-center justify-center mt-4">
          <div className="w-24 h-24 rounded-full bg-amber-400 overflow-hidden mb-4 border-4 border-white shadow-sm shrink-0">
            {profile?.avatar_url ? (
              <Image src={profile.avatar_url} alt="Profile" width={96} height={96} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl font-black text-white bg-blue-500">
                {profile?.full_name?.charAt(0) || user.email?.charAt(0)}
              </div>
            )}
          </div>
          <h2 className="text-xl font-bold text-slate-900">{profile?.full_name || 'User'}</h2>
          <p className="text-sm font-medium text-slate-400">{profile?.email || user.email}</p>
        </div>

        {/* Personal Details */}
        <div className="space-y-2">
          <h3 className="text-[13px] font-bold text-slate-500 px-2">Personal Details</h3>
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100">
            <MobileLinkItem icon={User} label="Personal Data" href="/dashboard/settings/personal-data" />
            <MobileLinkItem icon={Map} label="Absences" href="/dashboard/settings" />
            <MobileLinkItem icon={Clock} label="Working Hours" href="/dashboard/settings" />
            <MobileLinkItem icon={GraduationCap} label="Qualifications" href="/dashboard/settings" borderBottom={false} />
          </div>
        </div>

        {/* Settings */}
        <div className="space-y-2">
          <h3 className="text-[13px] font-bold text-slate-500 px-2">Settings</h3>
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100">
            <MobileActionItem icon={Bell} label="Notifications">
              <div className="w-11 h-6 bg-slate-200 rounded-full flex items-center p-1 cursor-pointer">
                 <div className="bg-white w-4 h-4 rounded-full shadow-sm"></div>
              </div>
            </MobileActionItem>
            <MobileActionItem icon={Globe} label="Select Language">
              <div className="flex items-center gap-1 text-blue-600 font-medium text-sm">
                 German <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/></svg>
              </div>
            </MobileActionItem>
            <MobileLinkItem icon={Clock} label="Auto - Tracking" href="/dashboard/settings" />
            <MobileLinkItem icon={Lock} label="Change Password" href="/dashboard/settings" borderBottom={false} />
          </div>
        </div>

        {/* Information */}
        <div className="space-y-2">
          <h3 className="text-[13px] font-bold text-slate-500 px-2">Information</h3>
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100">
            <MobileLinkItem icon={MessageSquare} label="Feedback & Help" href="/dashboard/settings" />
            <MobileLinkItem icon={Lock} label="Data Protection" href="/dashboard/settings" />
            <MobileLinkItem icon={Info} label="Imprint" href="/dashboard/settings" borderBottom={false} />
          </div>
        </div>

        {/* Appearance */}
        <div className="space-y-2">
          <h3 className="text-[13px] font-bold text-slate-500 px-2">Appearance</h3>
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100">
            <MobileActionItem icon={Sun} label="Theme" borderBottom={false}>
              <div className="flex items-center gap-1 text-blue-600 font-medium text-sm">
                 System <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/></svg>
              </div>
            </MobileActionItem>
          </div>
        </div>

        {/* Logout */}
        <form action="/auth/signout" method="post" className="pt-4 pb-12">
           <button type="submit" className="w-full bg-[#E71A1A] text-white py-4 rounded-xl flex items-center justify-center gap-2 font-bold text-lg active:scale-[0.98] transition-transform shadow-sm">
             <LogOut className="w-5 h-5" /> Logout
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

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ')
}
