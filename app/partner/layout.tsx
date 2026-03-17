import { ReactNode } from "react"
import { LayoutDashboard, ShoppingCart, Briefcase, CreditCard, Settings, UserPlus, LogOut } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export default function PartnerLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#FDFCFD]">
      {/* Partner Sidebar */}
      <aside className="w-64 border-r border-purple-100 bg-white flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-purple-50">
          <span className="text-xl font-black text-purple-600 tracking-tight">Partner Portal</span>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          <NavItem href="/partner/dashboard" icon={LayoutDashboard} label="Übersicht" />
          <NavItem href="/partner/leads" icon={ShoppingCart} label="Marktplatz" />
          <NavItem href="/partner/my-leads" icon={UserPlus} label="Meine Leads" />
          <NavItem href="/partner/jobs" icon={Briefcase} label="Aufträge" />
          <NavItem href="/partner/billing" icon={CreditCard} label="Abrechnung" />
          <NavItem href="/partner/settings" icon={Settings} label="Einstellungen" />
        </nav>

        <div className="p-4 border-t border-purple-50">
          <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/5">
            <LogOut className="h-4 w-4 mr-2" />
            Abmelden
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="h-16 border-b border-purple-50 bg-white px-8 flex items-center justify-between">
          <div className="text-sm font-medium text-muted-foreground">Willkommen zurück</div>
          <div className="flex items-center gap-4">
            <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-xs">
              PA
            </div>
          </div>
        </div>
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  )
}

function NavItem({ href, icon: Icon, label }: { href: string, icon: any, label: string }) {
  // Simple active state check would go here
  const isActive = false 
  
  return (
    <Link href={href}>
      <Button
        variant="ghost"
        className={cn(
          "w-full justify-start gap-3 h-11 transition-colors",
          isActive ? "bg-purple-50 text-purple-700 font-semibold" : "text-muted-foreground hover:text-purple-600 hover:bg-purple-50/50"
        )}
      >
        <Icon className={cn("h-5 w-5", isActive ? "text-purple-600" : "text-muted-foreground")} />
        {label}
      </Button>
    </Link>
  )
}
