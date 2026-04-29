'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog'
import { 
  Zap, 
  Database, 
  Bot, 
  CreditCard, 
  Mail, 
  MessageSquare, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Eye, 
  EyeOff,
  ExternalLink,
  Lock
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useTranslation } from '@/lib/i18n'

interface Integration {
  id: string
  name: string
  provider: string
  category: string
  icon: any
  color: string
}

const INTEGRATIONS: Integration[] = [
  { id: 'supabase', name: 'Supabase', provider: 'Database', category: 'Infrastructure', icon: Database, color: 'text-emerald-500' },
  { id: 'anthropic', name: 'Anthropic', provider: 'Claude Sonnet 4.6', category: 'Artificial Intelligence', icon: Bot, color: 'text-orange-500' },
  { id: 'stripe', name: 'Stripe', provider: 'Payments', category: 'Finance', icon: CreditCard, color: 'text-indigo-600' },
  { id: 'sendgrid', name: 'SendGrid', provider: 'Email Service', category: 'Communication', icon: Mail, color: 'text-blue-500' },
  { id: 'twilio', name: 'Twilio', provider: 'WhatsApp / SMS', category: 'Communication', icon: MessageSquare, color: 'text-rose-500' },
]

export function IntegrationsList({ initialConfigs }: { initialConfigs: any[] }) {
  const [configs, setConfigs] = useState(initialConfigs)
  const [testingId, setTestingId] = useState<string | null>(null)
  const { locale } = useTranslation()
  const L = (de: string, en: string) => locale === 'de' ? de : en

  const isConnected = (id: string) => configs.some(c => c.provider === id && c.is_active)

  const handleTest = async (id: string) => {
    setTestingId(id)
    try {
      const res = await fetch('/api/settings/test-integration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: id })
      })
      const data = await res.json()
      if (data.success) {
        toast.success(`${id} ${L('Verbindung erfolgreich!', 'connection verified!')}`, {
          description: data.message
        })
      } else {
        toast.error(`${id} ${L('Verbindung fehlgeschlagen', 'connection failed')}`, {
          description: data.error
        })
      }
    } catch {
      toast.error(L('Testanfrage fehlgeschlagen', 'Test request failed'))
    } finally {
      setTestingId(null)
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {INTEGRATIONS.map((integ) => (
        <Card key={integ.id} className="border-border/50 shadow-sm rounded-3xl overflow-hidden hover:border-primary/20 transition-all group">
          <CardContent className="p-8">
            <div className="flex justify-between items-start mb-6">
              <div className={cn("p-4 rounded-2xl bg-zinc-50 group-hover:scale-110 transition-transform", integ.color)}>
                <integ.icon className="h-6 w-6" />
              </div>
              <Badge variant={isConnected(integ.id) ? "outline" : "secondary"} className={cn(
                "rounded-full px-3 py-1 font-black text-[10px] uppercase tracking-widest",
                isConnected(integ.id) ? "border-emerald-500 text-emerald-600 bg-emerald-50" : "bg-zinc-100 text-zinc-500"
              )}>
                {isConnected(integ.id) ? L('Verbunden', 'Connected') : L('Getrennt', 'Disconnected')}
              </Badge>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-bold">{integ.name}</h3>
                <p className="text-xs text-muted-foreground font-medium">{integ.provider} • {integ.category}</p>
              </div>

              <div className="flex gap-2 pt-2">
                <IntegrationSettingsDialog 
                  integration={integ} 
                  config={configs.find(c => c.provider === integ.id)}
                  onSave={(newConfig) => setConfigs(prev => {
                    const existing = prev.findIndex(c => c.provider === integ.id)
                    if (existing > -1) {
                      const updated = [...prev]
                      updated[existing] = newConfig
                      return updated
                    }
                    return [...prev, newConfig]
                  })}
                />
                <Button 
                   variant="ghost" 
                   size="sm" 
                   className="rounded-xl h-10 font-bold px-4 hover:bg-zinc-50 gap-2"
                   onClick={() => handleTest(integ.id)}
                   disabled={!isConnected(integ.id) || testingId === integ.id}
                >
                  {testingId === integ.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                  Test
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function IntegrationSettingsDialog({ integration, config, onSave }: { integration: Integration, config: any, onSave: (config: any) => void }) {
  const [open, setOpen] = useState(false)
  const [apiKey, setApiKey] = useState(config?.api_key || '')
  const [url, setUrl] = useState(config?.api_url || '')
  const [showKey, setShowKey] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const { locale } = useTranslation()
  const L = (de: string, en: string) => locale === 'de' ? de : en

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const res = await fetch('/api/settings/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: integration.id,
          api_key: apiKey,
          api_url: url,
          is_active: true
        })
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      onSave(data.config)
      toast.success(`${integration.name} ${L('Konfiguration gespeichert', 'configuration saved')}`)
      setOpen(false)
    } catch {
      toast.error(L('Konfiguration konnte nicht gespeichert werden', 'Failed to save configuration'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="rounded-xl h-10 font-bold px-4 gap-2 border-border/50">
          {L('Konfigurieren', 'Configure')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] rounded-[2rem]">
        <DialogHeader>
          <div className={cn("h-12 w-12 rounded-2xl bg-zinc-50 flex items-center justify-center mb-4", integration.color)}>
            <integration.icon className="h-6 w-6" />
          </div>
          <DialogTitle className="text-2xl font-black">{L('Konfigurieren', 'Configure')} {integration.name}</DialogTitle>
          <DialogDescription>{L('Geben Sie Ihre Zugangsdaten ein, um', 'Enter your credentials to connect')} {integration.name} {L('zu verbinden.', '.')}</DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-6 py-6 border-y border-border/50 my-6">
          {integration.id === 'supabase' && (
             <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Project URL</label>
                <Input 
                   value={url} 
                   onChange={(e) => setUrl(e.target.value)} 
                   placeholder="https://xxx.supabase.co" 
                   className="h-11 rounded-xl bg-zinc-50"
                />
             </div>
          )}
          
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">API Key / Secret</label>
            <div className="relative">
               <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
               <Input 
                  type={showKey ? "text" : "password"} 
                  value={apiKey} 
                  onChange={(e) => setApiKey(e.target.value)} 
                  placeholder="sk-..." 
                  className="pl-10 h-11 rounded-xl bg-zinc-50 pr-10 font-mono text-xs"
               />
               <button 
                  type="button" 
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-zinc-900 transition-colors"
                  onClick={() => setShowKey(!showKey)}
               >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
               </button>
            </div>
            <p className="text-[10px] text-muted-foreground px-1 flex items-center gap-1">
               <ExternalLink className="h-3 w-3" />
               Find in your {integration.name} dashboard
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" className="rounded-xl font-bold" onClick={() => setOpen(false)}>{L('Abbrechen', 'Cancel')}</Button>
          <Button
             className="rounded-xl font-black px-8 bg-zinc-900 text-white hover:bg-zinc-800"
             onClick={handleSave}
             disabled={isSaving || !apiKey}
          >
             {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : L('Verbindung speichern', 'Save Connection')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
