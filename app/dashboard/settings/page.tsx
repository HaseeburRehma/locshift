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
  Globe
} from 'lucide-react'
import Link from 'next/link'

export default async function SettingsHubPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const settingsCards = [
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
    <div className="space-y-8 pb-20">
      <div className="space-y-2">
        <h1 className="text-4xl font-black tracking-tight">Settings Hub</h1>
        <p className="text-muted-foreground font-medium">Fine-tune your FixDone Operations Center parameters.</p>
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
  )
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ')
}
