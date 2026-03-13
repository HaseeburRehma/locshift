'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
    Zap,
    ArrowRight,
    Bot,
    Search,
    Mail,
    CheckCircle2,
    Settings2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'

export function AutomationsPanel() {
    const { locale } = useTranslation()

    const steps = [
        {
            id: 'capture',
            title: locale === 'en' ? 'Lead Capture' : 'Lead Erfassung',
            description: locale === 'en' ? 'Automatic data extraction from website forms and GMB.' : 'Automatische Extraktion von Daten aus Website-Formularen und GMB.',
            icon: Search,
            status: 'active',
            agents: ['LeadParser-v2']
        },
        {
            id: 'qualify',
            title: locale === 'en' ? 'AI Qualification' : 'KI-Qualifizierung',
            description: locale === 'en' ? 'Assignment of urgency and estimation of order value via LLM.' : 'Zuweisung von Dringlichkeit und Schätzung des Auftragswerts per LLM.',
            icon: Bot,
            status: 'active',
            agents: ['QualificationBot']
        },
        {
            id: 'match',
            title: locale === 'en' ? 'Matchmaking' : 'Matchmaking',
            description: locale === 'en' ? 'Search for the best-suited technician based on skill/location.' : 'Suche nach dem am besten geeigneten Techniker basierend auf Skill/Ort.',
            icon: Zap,
            status: 'active',
            agents: ['MatchMaker-AI']
        },
        {
            id: 'message',
            title: locale === 'en' ? 'Customer Communication' : 'Kundenkommunikation',
            description: locale === 'en' ? 'Automatic sending of confirmations and appointment reminders.' : 'Automatischer Versand von Bestätigungen und Terminerinnerungen.',
            icon: Mail,
            status: 'active',
            agents: ['CommAgent']
        }
    ]

    return (
        <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                    <CardTitle className="flex items-center gap-2 text-xl">
                        <Zap className="h-6 w-6 text-primary" />
                        {locale === 'en' ? 'Automation Workflow' : 'Automations-Workflow'}
                    </CardTitle>
                    <CardDescription>
                        {locale === 'en' ? 'Active AI agents and processing stages' : 'Aktive KI-Agenten und Verarbeitungsstufen'}
                    </CardDescription>
                </div>
                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 flex items-center gap-1">
                    <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                    {locale === 'en' ? 'System Live' : 'System Live'}
                </Badge>
            </CardHeader>
            <CardContent>
                <div className="space-y-8 relative before:absolute before:inset-0 before:left-[27px] before:top-4 before:bottom-4 before:w-0.5 before:bg-gradient-to-b before:from-primary/50 before:via-primary/20 before:to-transparent">
                    {steps.map((step, index) => {
                        const Icon = step.icon
                        return (
                            <div key={step.id} className="relative pl-14 group">
                                <div className={cn(
                                    "absolute left-0 top-0 flex h-14 w-14 items-center justify-center rounded-2xl border-2 transition-all duration-300 group-hover:scale-110",
                                    step.status === 'active'
                                        ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20"
                                        : "bg-muted text-muted-foreground border-border"
                                )}>
                                    <Icon className="h-6 w-6" />
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-bold text-lg leading-none">{step.title}</h4>
                                        {index < steps.length - 1 && (
                                            <ArrowRight className="h-4 w-4 text-muted-foreground hidden group-hover:block transition-all" />
                                        )}
                                    </div>
                                    <p className="text-sm text-muted-foreground leading-relaxed max-w-md">
                                        {step.description}
                                    </p>
                                    <div className="flex gap-2 pt-1">
                                        {step.agents.map(agent => (
                                            <Badge key={agent} variant="secondary" className="text-[10px] font-mono py-0 px-2 bg-secondary/50">
                                                {agent}
                                            </Badge>
                                        ))}
                                        <span className="flex items-center gap-1 text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded-full font-medium">
                                            <CheckCircle2 className="h-3 w-3" />
                                            {locale === 'en' ? 'Running' : 'Läuft'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>

                <div className="mt-12 p-6 rounded-2xl border bg-accent/5 border-primary/10 flex items-center justify-between">
                    <div className="space-y-1">
                        <h5 className="font-semibold text-sm">
                            {locale === 'en' ? 'Automation Status' : 'Automatisierungs-Status'}
                        </h5>
                        <p className="text-xs text-muted-foreground">
                            {locale === 'en'
                                ? 'AI agents processed 12 leads today.'
                                : 'KI-Agenten haben heute 12 Leads bearbeitet.'}
                        </p>
                    </div>
                    <Button variant="outline" size="sm" className="gap-2 bg-background">
                        <Settings2 className="h-4 w-4" />
                        {locale === 'en' ? 'Configure' : 'Konfigurieren'}
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}
