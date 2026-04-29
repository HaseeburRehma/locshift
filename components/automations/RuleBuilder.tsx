'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  UserPlus, CheckCircle, TrendingUp, AlertTriangle, Clock,
  ShoppingCart, Zap, Plus, Trash2, Check, ArrowLeft, ArrowRight,
} from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from '@/lib/i18n'
import type { AutomationRuleRow, TriggerEvent, ActionType } from '@/lib/types/database.types'

// ─── Config ──────────────────────────────────────────────────────────────────

const TRIGGER_CARDS = [
  { event: 'lead_created',           title: 'New Lead Created',     desc: 'Fires when any new lead enters the system',          icon: UserPlus,      color: 'blue'   },
  { event: 'job_completed',          title: 'Job Completed',        desc: 'Fires when a technician marks a job done',           icon: CheckCircle,   color: 'green'  },
  { event: 'lead_score_above',       title: 'High Score Lead',      desc: 'AI score exceeds your threshold',                    icon: TrendingUp,    color: 'violet' },
  { event: 'lead_urgency_is',        title: 'Urgent Lead',          desc: "Lead is marked as urgent or high priority",          icon: AlertTriangle, color: 'red'    },
  { event: 'no_response_after',      title: 'No Response',          desc: "Customer hasn't been contacted in X hours",          icon: Clock,         color: 'amber'  },
  { event: 'partner_purchased_lead', title: 'Partner Purchased',    desc: 'A partner bought a lead from marketplace',           icon: ShoppingCart,  color: 'purple' },
]

const ACTION_TYPES: { value: ActionType; label: string; icon: string }[] = [
  { value: 'send_whatsapp',       label: 'Send WhatsApp',      icon: '💬' },
  { value: 'send_email',          label: 'Send Email',         icon: '📧' },
  { value: 'assign_technician',   label: 'Auto-assign Tech',   icon: '🔧' },
  { value: 'change_lead_status',  label: 'Change Lead Status', icon: '🔄' },
  { value: 'notify_admin',        label: 'Alert Admin',        icon: '⚠️' },
  { value: 'create_notification', label: 'Push Notification',  icon: '🔔' },
]

const CONDITION_FIELDS = [
  { value: 'urgency',                  label: 'Urgency' },
  { value: 'score_threshold',          label: 'Score Threshold' },
  { value: 'status',                   label: 'Status' },
  { value: 'service_type',             label: 'Service Type' },
  { value: 'hours_without_response',   label: 'Hours Without Response' },
]

const LEAD_STATUSES = ['new', 'qualified', 'matched', 'scheduled', 'completed', 'lost', 'cancelled']

function cardBorderClass(color: string, selected: boolean) {
  const active: Record<string, string> = {
    blue: 'border-blue-500 bg-blue-50 dark:bg-blue-500/10',
    green: 'border-green-500 bg-green-50 dark:bg-green-500/10',
    violet: 'border-violet-500 bg-violet-50 dark:bg-violet-500/10',
    red: 'border-red-500 bg-red-50 dark:bg-red-500/10',
    amber: 'border-amber-500 bg-amber-50 dark:bg-amber-500/10',
    purple: 'border-purple-500 bg-purple-50 dark:bg-purple-500/10',
  }
  const idle = 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
  return selected ? (active[color] ?? 'border-violet-500 bg-violet-50') : idle
}

function iconBgClass(color: string) {
  const m: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-600', green: 'bg-green-100 text-green-600',
    violet: 'bg-violet-100 text-violet-600', red: 'bg-red-100 text-red-600',
    amber: 'bg-amber-100 text-amber-600', purple: 'bg-purple-100 text-purple-600',
  }
  return m[color] ?? 'bg-gray-100 text-gray-600'
}

// ─── Step Indicator ──────────────────────────────────────────────────────────

function StepIndicator({ step }: { step: number }) {
  const LABELS = ['Trigger', 'Conditions', 'Actions', 'Save']
  return (
    <div className="flex items-center gap-1 mb-6">
      {[1, 2, 3, 4].map((s) => (
        <div key={s} className="flex items-center gap-1">
          <div
            className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all',
              step === s
                ? 'bg-violet-600 text-white ring-4 ring-violet-100'
                : step > s
                  ? 'bg-emerald-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-muted-foreground'
            )}
          >
            {step > s ? <Check className="w-4 h-4" /> : s}
          </div>
          {s < 4 && (
            <div
              className={cn(
                'h-0.5 flex-1 w-6 transition-all',
                step > s ? 'bg-emerald-500' : 'bg-gray-200 dark:bg-gray-700'
              )}
            />
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Action config fields ─────────────────────────────────────────────────────

function ActionConfigFields({
  action, index, onChange,
}: {
  action: any; index: number; onChange: (updates: any) => void
}) {
  const { locale } = useTranslation()
  const L = (de: string, en: string) => locale === 'de' ? de : en
  switch (action.type as ActionType) {
    case 'send_whatsapp':
      return (
        <div className="space-y-2 mt-2">
          <div>
            <Label className="text-xs">Send To</Label>
            <Select value={action.to ?? 'customer'} onValueChange={(v) => onChange({ to: v })}>
              <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="customer">Customer</SelectItem>
                <SelectItem value="technician">Technician</SelectItem>
                <SelectItem value="admin">Verwalter</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Message</Label>
            <Textarea
              placeholder={L('Ihre Nachricht...', 'Your message...')}
              value={action.message ?? ''}
              onChange={(e) => onChange({ message: e.target.value })}
              className="text-xs min-h-[60px] mt-1"
            />
          </div>
        </div>
      )
    case 'send_email':
      return (
        <div className="space-y-2 mt-2">
          <div>
            <Label className="text-xs">Send To</Label>
            <Select value={action.to ?? 'customer'} onValueChange={(v) => onChange({ to: v })}>
              <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="customer">Customer</SelectItem>
                <SelectItem value="admin">Verwalter</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Template</Label>
            <Select value={action.template ?? ''} onValueChange={(v) => onChange({ template: v })}>
              <SelectTrigger className="h-8 text-xs mt-1"><SelectValue placeholder={L('Vorlage auswählen', 'Select template')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="review_request">Review Request</SelectItem>
                <SelectItem value="job_confirmation">Job Confirmation</SelectItem>
                <SelectItem value="follow_up">Follow-up</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )
    case 'change_lead_status':
      return (
        <div className="mt-2">
          <Label className="text-xs">New Status</Label>
          <Select value={action.status ?? ''} onValueChange={(v) => onChange({ status: v })}>
            <SelectTrigger className="h-8 text-xs mt-1"><SelectValue placeholder={L('Status auswählen', 'Select status')} /></SelectTrigger>
            <SelectContent>
              {LEAD_STATUSES.map((s) => (
                <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )
    case 'notify_admin':
      return (
        <div className="mt-2">
          <Label className="text-xs">Message</Label>
          <Textarea
            placeholder={L('Hinweistext...', 'Alert message...')}
            value={action.message ?? ''}
            onChange={(e) => onChange({ message: e.target.value })}
            className="text-xs min-h-[60px] mt-1"
          />
        </div>
      )
    case 'assign_technician':
      return (
        <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-500/10 rounded-lg text-xs text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-500/20">
          🔧 AI will automatically select the <strong>best-matched technician</strong> based on location, skills, and availability.
        </div>
      )
    case 'create_notification':
      return (
        <div className="space-y-2 mt-2">
          <div>
            <Label className="text-xs">Title</Label>
            <Input
              placeholder={L('Benachrichtigungstitel...', 'Notification title...')}
              value={action.title ?? ''}
              onChange={(e) => onChange({ title: e.target.value })}
              className="h-8 text-xs mt-1"
            />
          </div>
          <div>
            <Label className="text-xs">Body</Label>
            <Textarea
              placeholder={L('Benachrichtigungstext...', 'Notification body...')}
              value={action.body ?? ''}
              onChange={(e) => onChange({ body: e.target.value })}
              className="text-xs min-h-[60px] mt-1"
            />
          </div>
        </div>
      )
    default:
      return null
  }
}

// ─── Main RuleBuilder ─────────────────────────────────────────────────────────

interface RuleBuilderProps {
  open: boolean
  onClose: () => void
  initialRule?: AutomationRuleRow
}

export function RuleBuilder({ open, onClose, initialRule }: RuleBuilderProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const { locale } = useTranslation()
  const L = (de: string, en: string) => locale === 'de' ? de : en

  // Wizard state
  const [step, setStep] = useState(1)
  const [trigger, setTrigger] = useState<TriggerEvent>(
    initialRule?.trigger_event ?? 'lead_created'
  )
  const [conditions, setConditions] = useState<Array<{ field: string; value: string }>>(
    Object.entries(initialRule?.trigger_conditions ?? {}).map(([field, value]) => ({
      field,
      value: String(value),
    }))
  )
  const [skipConditions, setSkipConditions] = useState(
    !initialRule || Object.keys(initialRule.trigger_conditions ?? {}).length === 0
  )
  const [actions, setActions] = useState<any[]>(initialRule?.actions ?? [])
  const [name, setName] = useState(initialRule?.name ?? '')
  const [description, setDescription] = useState(initialRule?.description ?? '')
  const [isActive, setIsActive] = useState(initialRule?.is_active ?? true)

  const addCondition = () => setConditions([...conditions, { field: 'urgency', value: '' }])
  const removeCondition = (i: number) => setConditions(conditions.filter((_, j) => j !== i))
  const updateCondition = (i: number, patch: Partial<{ field: string; value: string }>) => {
    setConditions(conditions.map((c, j) => (j === i ? { ...c, ...patch } : c)))
  }

  const addAction = (type: ActionType) => setActions([...actions, { type }])
  const removeAction = (i: number) => setActions(actions.filter((_, j) => j !== i))
  const updateAction = (i: number, updates: any) =>
    setActions(actions.map((a, j) => (j === i ? { ...a, ...updates } : a)))

  const handleClose = () => {
    setStep(1)
    onClose()
  }

  const handleSave = () => {
    if (!name.trim()) { toast.error(L('Regelname ist erforderlich', 'Rule name is required')); return }
    if (actions.length === 0) { toast.error(L('Mindestens eine Aktion hinzufügen', 'Add at least one action')); return }

    const builtConditions = skipConditions
      ? {}
      : Object.fromEntries(conditions.map((c) => [c.field, c.value]))

    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      trigger_event: trigger,
      trigger_conditions: builtConditions,
      actions,
      is_active: isActive,
    }

    startTransition(async () => {
      try {
        const method = initialRule ? 'PATCH' : 'POST'
        const body = initialRule ? { id: initialRule.id, ...payload } : payload

        const res = await fetch('/api/automations/rules', {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err?.error ?? 'Failed to save rule')
        }
        toast.success(initialRule ? L('Automatisierung aktualisiert!', 'Automation updated!') : L('Automatisierung erstellt!', 'Automation created!'))
        handleClose()
        router.refresh()
      } catch (err: any) {
        toast.error(err?.message ?? L('Regel konnte nicht gespeichert werden', 'Failed to save rule'))
      }
    })
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && handleClose()}>
      <SheetContent className="sm:max-w-xl flex flex-col p-0 border-none shadow-2xl overflow-hidden">
        {/* Header */}
        <SheetHeader className="p-6 bg-slate-900 text-white flex-shrink-0">
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-violet-500 p-1.5 rounded-lg">
              <Zap className="w-4 h-4 text-white fill-white" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-violet-400">
              Automation Engine
            </span>
          </div>
          <SheetTitle className="text-white text-xl">
            {initialRule ? 'Edit Automation' : 'New Automation'}
          </SheetTitle>
        </SheetHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <StepIndicator step={step} />

          {/* Step 1 — Trigger */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h3 className="font-bold text-base mb-1">Choose a Trigger</h3>
                <p className="text-sm text-muted-foreground">
                  When should this automation fire?
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {TRIGGER_CARDS.map((card) => {
                  const Icon = card.icon
                  const isSelected = trigger === card.event
                  return (
                    <button
                      key={card.event}
                      onClick={() => setTrigger(card.event as TriggerEvent)}
                      className={cn(
                        'flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all',
                        cardBorderClass(card.color, isSelected)
                      )}
                    >
                      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', iconBgClass(card.color))}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold leading-tight">{card.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{card.desc}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Step 2 — Conditions */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="font-bold text-base mb-1">Add Conditions</h3>
                <p className="text-sm text-muted-foreground">
                  Optionally filter when this trigger fires.
                </p>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <Switch checked={skipConditions} onCheckedChange={setSkipConditions} />
                <span className="text-sm">Run on every trigger — skip conditions</span>
              </label>

              {!skipConditions && (
                <div className="space-y-3">
                  {conditions.map((cond, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Select value={cond.field} onValueChange={(v) => updateCondition(i, { field: v })}>
                        <SelectTrigger className="h-9 text-sm w-48 flex-shrink-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CONDITION_FIELDS.map((f) => (
                            <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className="text-muted-foreground text-sm">is</span>
                      <Input
                        className="h-9 text-sm flex-1"
                        placeholder="value..."
                        value={cond.value}
                        onChange={(e) => updateCondition(i, { value: e.target.value })}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeCondition(i)}
                        className="h-9 w-9 p-0 text-muted-foreground hover:text-red-500 flex-shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addCondition}
                    className="gap-2 border-dashed w-full"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Condition
                  </Button>

                  {conditions.length > 0 && (
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">Preview: </span>
                      When {conditions.map((c) => `${c.field.replace(/_/g, ' ')} is "${c.value}"`).join(' AND ')}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 3 — Actions */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h3 className="font-bold text-base mb-1">Define Actions</h3>
                <p className="text-sm text-muted-foreground">
                  What should happen when this rule fires?
                </p>
              </div>

              {actions.map((action, i) => {
                const at = ACTION_TYPES.find((a) => a.value === action.type)
                return (
                  <div key={i} className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 space-y-1 relative group">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAction(i)}
                      className="absolute top-2 right-2 h-7 w-7 p-0 text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-base">{at?.icon}</span>
                      <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{at?.label}</span>
                    </div>
                    <ActionConfigFields action={action} index={i} onChange={(u) => updateAction(i, u)} />
                  </div>
                )
              })}

              <div className="grid grid-cols-2 gap-2">
                {ACTION_TYPES.map((at) => (
                  <Button
                    key={at.value}
                    variant="outline"
                    size="sm"
                    onClick={() => addAction(at.value)}
                    className="h-9 text-xs gap-1.5 border-dashed justify-start"
                  >
                    <span>{at.icon}</span>
                    <Plus className="w-3 h-3" />
                    {at.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Step 4 — Name & Save */}
          {step === 4 && (
            <div className="space-y-4">
              <div>
                <h3 className="font-bold text-base mb-1">Name Your Automation</h3>
                <p className="text-sm text-muted-foreground">Give it a clear, descriptive name.</p>
              </div>

              <div>
                <Label>Rule Name <span className="text-red-500">*</span></Label>
                <Input
                  className="mt-1.5"
                  placeholder="e.g., Auto-assign urgent leads"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div>
                <Label>Description <span className="text-muted-foreground text-xs font-normal">(optional)</span></Label>
                <Textarea
                  className="mt-1.5 min-h-[80px]"
                  placeholder="What does this automation do?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <div>
                  <p className="text-sm font-semibold">Activate immediately</p>
                  <p className="text-xs text-muted-foreground">Rule will start firing right away</p>
                </div>
                <Switch checked={isActive} onCheckedChange={setIsActive} />
              </div>

              {/* Summary */}
              <div className="p-4 bg-violet-50 dark:bg-violet-500/10 rounded-xl border border-violet-100 dark:border-violet-500/20 text-xs space-y-1">
                <p className="font-semibold text-violet-800 dark:text-violet-300 mb-2">Summary</p>
                <p>
                  <span className="text-muted-foreground">Trigger: </span>
                  <span className="font-medium capitalize">{trigger.replace(/_/g, ' ')}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">Conditions: </span>
                  <span className="font-medium">
                    {skipConditions || conditions.length === 0
                      ? 'All (no filter)'
                      : conditions.map((c) => `${c.field} = ${c.value}`).join(', ')}
                  </span>
                </p>
                <p>
                  <span className="text-muted-foreground">Actions: </span>
                  <span className="font-medium">{actions.length === 0 ? 'None' : actions.map((a) => a.type.replace(/_/g, ' ')).join(', ')}</span>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer navigation */}
        <div className="p-6 border-t bg-gray-50 dark:bg-gray-900/50 flex-shrink-0 flex items-center justify-between gap-3">
          <Button
            variant="outline"
            onClick={() => (step === 1 ? handleClose() : setStep(step - 1))}
            className="gap-2"
          >
            {step === 1 ? 'Cancel' : <><ArrowLeft className="w-4 h-4" /> Back</>}
          </Button>

          {step < 4 ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={step === 3 && actions.length === 0}
              className="bg-violet-600 hover:bg-violet-700 gap-2"
            >
              Next <ArrowRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSave}
              disabled={isPending || !name.trim() || actions.length === 0}
              className="bg-emerald-600 hover:bg-emerald-700 gap-2"
            >
              {isPending ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Saving...
                </span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  {initialRule ? 'Update Automation' : 'Create Automation'}
                </>
              )}
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
