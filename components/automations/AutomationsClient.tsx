'use client'

import { useState } from 'react'
import { AutomationRuleRow, AutomationLogRow } from '@/lib/types/database.types'
import { formatDistanceToNow } from 'date-fns'
import { Bot, Zap, Plus, RefreshCw, Layers, Bell, Server, Timer } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { RuleBuilder } from './RuleBuilder'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { useTranslation } from '@/lib/i18n'

interface AutomationsClientProps {
  initialRules: AutomationRuleRow[]
  initialLogs: AutomationLogRow[]
  firedTodayCount: number
}

export function AutomationsClient({ initialRules, initialLogs, firedTodayCount }: AutomationsClientProps) {
  const router = useRouter()
  const { locale } = useTranslation()
  const L = (de: string, en: string) => locale === 'de' ? de : en
  const [builderOpen, setBuilderOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<AutomationRuleRow | null>(null)
  const [seeding, setSeeding] = useState(false)

  const activeRules = initialRules.filter(r => r.is_active)
  const lastFiredAt = initialRules.reduce((latest, r) => {
    if (!r.last_executed_at) return latest
    const d = new Date(r.last_executed_at)
    return d > latest ? d : latest
  }, new Date(0))

  const handleToggleActive = async (id: string, currentVal: boolean) => {
    try {
      const res = await fetch('/api/automations/rules', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_active: !currentVal })
      })
      if (res.ok) {
        router.refresh()
      } else {
        toast.error(L('Regelstatus konnte nicht aktualisiert werden', 'Failed to update rule status'))
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm(L('Diese Regel wirklich löschen?', 'Are you sure you want to delete this rule?'))) return
    try {
      const res = await fetch('/api/automations/rules', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      })
      if (res.ok) {
        toast.success(L('Regel gelöscht', 'Rule deleted'))
        router.refresh()
      } else {
        toast.error(L('Regel konnte nicht gelöscht werden', 'Failed to delete rule'))
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleSeed = async () => {
    setSeeding(true)
    try {
      const res = await fetch('/api/automations/seed', { method: 'POST' })
      if (res.ok) {
        toast.success(L('Standardregeln erfolgreich eingerichtet', 'Default rules seeded successfully'))
        router.refresh()
      } else {
        toast.error(L('Einrichten fehlgeschlagen. Berechtigungen prüfen.', 'Failed to seed rules. Check permissions.'))
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSeeding(false)
    }
  }

  const getTriggerColor = (evt: string) => {
    if (evt.includes('lead_created')) return 'bg-blue-100 text-blue-700 hover:bg-blue-100'
    if (evt.includes('job_completed')) return 'bg-green-100 text-green-700 hover:bg-green-100'
    if (evt.includes('score_above') || evt.includes('urgency')) return 'bg-purple-100 text-purple-700 hover:bg-purple-100'
    if (evt.includes('response_after')) return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100'
    return 'bg-slate-100 text-slate-700 hover:bg-slate-100'
  }

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'create_notification': return <Bell className="w-3 h-3 text-slate-500" />
      case 'notify_admin': return <Bell className="w-3 h-3 text-purple-500" />
      case 'assign_technician': return <Zap className="w-3 h-3 text-orange-500" />
      case 'change_lead_status': return <RefreshCw className="w-3 h-3 text-slate-500" />
      default: return <Server className="w-3 h-3 text-slate-500" />
    }
  }

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">{L('Automatisierungen', 'Automations')}</h1>
          <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100 rounded-full px-3 py-1">
            {activeRules.length} {L('Regeln aktiv', 'rules active')}
          </Badge>
        </div>
        <div className="flex gap-2">
          {initialRules.length === 0 && (
            <Button variant="outline" onClick={handleSeed} disabled={seeding}>
              {seeding ? L('Wird eingerichtet...', 'Seeding...') : L('Standardregeln einrichten', 'Seed Default Rules')}
            </Button>
          )}
          <Button onClick={() => { setEditingRule(null); setBuilderOpen(true) }}>
            <Plus className="w-4 h-4 mr-2" /> {L('Neue Regel', 'New Rule')}
          </Button>
        </div>
      </div>

      {/* Agents Status Card */}
      <Card className={`border-none ${activeRules.length > 0 ? 'bg-green-50/50' : 'bg-slate-50'}`}>
        <CardContent className="p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className={`p-4 rounded-full ${activeRules.length > 0 ? 'bg-green-100 text-green-600' : 'bg-slate-200 text-slate-400'}`}>
              <Bot className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                🤖 AI Agents 
                {activeRules.length > 0 && (
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                  </span>
                )}
              </h2>
              <p className="text-sm text-slate-500">
                {activeRules.length} {L('aktiv. Heute', 'active. Fired')} {firedTodayCount} {L('mal ausgeführt.', 'times today.')}
              </p>
            </div>
          </div>
          <div className="w-full sm:w-auto">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{L('Top-Aktive Modelle', 'Top Active Models')}</h4>
            <div className="space-y-1">
              {activeRules.slice(0, 3).map(r => (
                <div key={r.id} className="text-sm flex items-center gap-2 text-slate-700">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  {r.name}
                </div>
              ))}
              {activeRules.length === 0 && <div className="text-sm text-slate-400 italic">{L('Keine aktiven Modelle gefunden', 'No active models found')}</div>}
            </div>
            {lastFiredAt.getFullYear() > 1970 && (
              <div className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                <Timer className="w-3 h-3" /> {L('Letzte Ausführung:', 'Last execution:')} {formatDistanceToNow(lastFiredAt, { addSuffix: true })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Rules Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {initialRules.map(rule => (
          <Card key={rule.id} className="flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="space-y-1">
                <CardTitle className="text-lg">{rule.name}</CardTitle>
                <CardDescription>{rule.description || L('Keine Beschreibung vorhanden', 'No description provided')}</CardDescription>
              </div>
              <Switch checked={rule.is_active} onCheckedChange={() => handleToggleActive(rule.id, rule.is_active)} />
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-between pt-4">
              <div className="space-y-4">
                <div>
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{L('Auslöser', 'Trigger')}</div>
                  <Badge variant="secondary" className={getTriggerColor(rule.trigger_event)}>
                    {rule.trigger_event.replace(/_/g, ' ')}
                  </Badge>
                  {Object.keys(rule.trigger_conditions || {}).length > 0 && (
                    <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                      <Layers className="w-3 h-3" /> {L('Mit Bedingungen', 'With conditions')}
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{L('Aktionen', 'Actions')}</div>
                  <div className="flex flex-wrap gap-2">
                    {rule.actions?.map((act, i) => (
                      <Badge key={i} variant="outline" className="flex items-center gap-1.5 text-slate-600 border-slate-200">
                        {getActionIcon(act.type)}
                        {act.type.replace(/_/g, ' ')}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="mt-6 pt-4 border-t flex items-center justify-between text-sm text-slate-500">
                <div className="flex items-center justify-center gap-3">
                  <span>{rule.execution_count}× {L('ausgeführt', 'fired')}</span>
                </div>
                <div className="flex gap-2 text-slate-400">
                  <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => { setEditingRule(rule); setBuilderOpen(true) }}>{L('Bearbeiten', 'Edit')}</Button>
                  <Button variant="ghost" size="sm" className="h-8 px-2 hover:text-red-600" onClick={() => handleDelete(rule.id)}>{L('Löschen', 'Delete')}</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {initialRules.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-400 border-2 border-dashed rounded-xl">
            <Zap className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <h3 className="text-lg font-medium text-slate-900">{L('Keine Automatisierungsregeln', 'No automation rules')}</h3>
            <p className="mt-1">{L('Standardregeln einrichten oder eine neue Regel erstellen.', 'Seed default rules or create a new one to get started.')}</p>
          </div>
        )}
      </div>

      {/* Execution Log */}
      <h3 className="text-xl font-bold tracking-tight text-slate-900 mt-12 mb-4">{L('Letzte Automatisierungsaktivität', 'Recent Automation Activity')}</h3>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{L('Zeit', 'Time')}</TableHead>
              <TableHead>{L('Regel', 'Rule')}</TableHead>
              <TableHead>{L('Auslöser', 'Trigger')}</TableHead>
              <TableHead>{L('Status', 'Status')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialLogs.map(log => (
              <TableRow key={log.id}>
                <TableCell className="text-slate-500 whitespace-nowrap">
                  {formatDistanceToNow(new Date(log.executed_at), { addSuffix: true })}
                </TableCell>
                <TableCell className="font-medium">{log.rule_name}</TableCell>
                <TableCell>
                  <div className="text-xs max-w-xs truncate text-slate-500">
                    {log.trigger_event} → {log.trigger_entity_type} {log.trigger_entity_id.split('-')[0]}
                  </div>
                </TableCell>
                <TableCell>
                  {log.status === 'success' && <Badge variant="secondary" className="bg-green-100 text-green-700">{L('Erfolgreich', 'Success')}</Badge>}
                  {log.status === 'partial' && <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">{L('Teilweise', 'Partial')}</Badge>}
                  {log.status === 'failed' && <Badge variant="secondary" className="bg-red-100 text-red-700">{L('Fehlgeschlagen', 'Failed')}</Badge>}
                </TableCell>
              </TableRow>
            ))}
            {initialLogs.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-slate-500">
                  {L('Keine Automatisierungsaktivität in letzter Zeit', 'No automation activity recorded recently')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <RuleBuilder open={builderOpen} onClose={() => setBuilderOpen(false)} initialRule={editingRule || undefined} />
    </div>
  )
}
