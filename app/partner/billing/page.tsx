import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CreditCard, History, Plus, Wallet, ArrowUpRight, ArrowDownLeft } from "lucide-react"
import { cn } from "@/lib/utils"

export default function PartnerBillingPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-purple-950">Abrechnung</h1>
        <p className="text-muted-foreground">Verwalten Sie Ihr Guthaben und Ihre Rechnungen</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="md:col-span-1 bg-purple-600 text-white border-none shadow-xl shadow-purple-500/20 rounded-3xl overflow-hidden relative">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Wallet className="h-32 w-32" />
          </div>
          <CardHeader>
            <CardTitle className="text-purple-100/80 text-sm font-bold uppercase tracking-wider">Aktuelles Guthaben</CardTitle>
          </CardHeader>
          <CardContent className="pb-8">
            <div className="text-5xl font-black italic">€ 450,00</div>
            <Button className="mt-8 w-full bg-white text-purple-700 hover:bg-purple-50 font-bold h-12 rounded-2xl" size="lg">
              <Plus className="h-5 w-5 mr-1" />
              Guthaben aufladen
            </Button>
          </CardContent>
        </Card>

        <div className="md:col-span-2 space-y-6">
          <Card className="rounded-3xl border-purple-50">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Statistik</CardTitle>
                <CardDescription>Ausgaben der letzten 30 Tage</CardDescription>
              </div>
              <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 font-bold border-none">€ 1.250,40 gesamt</Badge>
            </CardHeader>
            <CardContent className="h-32 flex items-end gap-2 pb-2">
              {[40, 70, 45, 90, 65, 30, 85].map((h, i) => (
                <div key={i} className="flex-1 bg-purple-100 rounded-t-lg hover:bg-purple-300 transition-colors" style={{ height: `${h}%` }} />
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="border-purple-50 rounded-3xl shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-purple-600" />
            <CardTitle>Transaktionshistorie</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-2xl hover:bg-purple-50/50 transition-colors border border-transparent hover:border-purple-100">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "h-10 w-10 rounded-xl flex items-center justify-center",
                    i % 2 === 0 ? "bg-green-100 text-green-600" : "bg-purple-100 text-purple-600"
                  )}>
                    {i % 2 === 0 ? <ArrowDownLeft className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />}
                  </div>
                  <div>
                    <p className="font-bold text-purple-950">{i % 2 === 0 ? 'Guthaben-Aufladung' : 'Lead-Kauf: Sanierung Berlin'}</p>
                    <p className="text-xs text-muted-foreground font-medium">12.03.2026, 14:30 Uhr</p>
                  </div>
                </div>
                <div className={cn("font-black text-lg", i % 2 === 0 ? "text-green-600" : "text-purple-950")}>
                  {i % 2 === 0 ? '+ € 200,00' : '- € 45,00'}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
