'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage,
  FormDescription
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { 
  Calendar as CalendarIcon, 
  Check, 
  ChevronsUpDown, 
  User, 
  Wrench, 
  Clock, 
  AlertTriangle,
  Plus,
  Trash2,
  CalendarDays,
  Sparkles,
  ExternalLink
} from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { cn, formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

const jobSchema = z.object({
  lead_id: z.string().uuid('Please select a lead'),
  technician_id: z.string().uuid('Please select a technician'),
  scheduled_date: z.date({ required_error: "Date is required" }),
  scheduled_time: z.string().min(5, 'Time is required'),
  estimated_duration: z.string().min(1, 'Duration is required'),
  notes: z.string().optional(),
  checklist: z.array(z.object({ text: z.string() })).max(10),
  add_to_calendar: z.boolean().default(true)
})

type JobFormValues = z.infer<typeof jobSchema>

interface NewJobFormProps {
  initialLeadId?: string
  initialTechnicianId?: string
}

const TIME_SLOTS = [
  '07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00'
]

const DURATIONS = [
  { label: '30 min', value: '30' },
  { label: '1h', value: '60' },
  { label: '1.5h', value: '90' },
  { label: '2h', value: '120' },
  { label: '3h', value: '180' },
  { label: '4h', value: '240' },
  { label: 'Full day', value: '480' },
]

export function NewJobForm({ initialLeadId, initialTechnicianId }: NewJobFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const [isPending, startTransition] = useTransition()
  
  const [leads, setLeads] = useState<any[]>([])
  const [technicians, setTechnicians] = useState<any[]>([])
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [leadSearchOpen, setLeadSearchOpen] = useState(false)

  const form = useForm<JobFormValues>({
    resolver: zodResolver(jobSchema),
    defaultValues: {
      lead_id: initialLeadId || '',
      technician_id: initialTechnicianId || '',
      scheduled_time: '09:00',
      estimated_duration: '60',
      checklist: [],
      add_to_calendar: true
    }
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "checklist"
  })

  const selectedLeadId = form.watch('lead_id')
  const selectedTechId = form.watch('technician_id')
  const selectedLead = leads.find(l => l.id === selectedLeadId)
  const selectedTech = technicians.find(t => t.id === selectedTechId)

  useEffect(() => {
    async function fetchData() {
      setIsLoadingData(true)
      const [leadsRes, techsRes] = await Promise.all([
        supabase.from('leads').select('*').not('status', 'in', '("completed","lost")').order('created_at', { ascending: false }),
        supabase.from('technicians').select('*, profiles(id, full_name, role)').eq('is_active', true)
      ])
      
      if (leadsRes.data) setLeads(leadsRes.data)
      if (techsRes.data) setTechnicians(techsRes.data)
      setIsLoadingData(false)
    }
    fetchData()
  }, [])

  // AI Recommendation Logic
  const aiRecommendedTechId = selectedLead?.ai_matched_technician_id
  const aiRecommendedTech = technicians.find(t => t.id === aiRecommendedTechId)

  const handleUseAiRecommendation = () => {
    if (aiRecommendedTechId) {
      form.setValue('technician_id', aiRecommendedTechId)
      toast.success(`Selected AI recommended technician: ${aiRecommendedTech?.name}`)
    }
  }

  const onSubmit = async (values: JobFormValues) => {
    startTransition(async () => {
      try {
        const res = await fetch('/api/jobs/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lead_id: values.lead_id,
            technician_id: values.technician_id,
            scheduled_date: formatDate(values.scheduled_date, 'yyyy-MM-dd'),
            scheduled_time: values.scheduled_time,
            estimated_duration: parseInt(values.estimated_duration, 10),
            notes: values.notes,
            checklist: values.checklist.map(i => i.text)
          })
        })

        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to create job')

        toast.success('Job scheduled successfully!')
        router.push(`/dashboard/jobs/${data.job.id}`)
        router.refresh()
      } catch (err: any) {
        toast.error(err.message)
      }
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 pb-10">
        
        {/* SECTION 1: LINK TO LEAD */}
        <Card className="border-border/50 shadow-sm overflow-hidden">
          <CardHeader className="bg-muted/30 pb-4 border-b">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <span className="h-6 w-1 bg-primary rounded-full" />
              1. Customer & Lead
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <FormField
              control={form.control}
              name="lead_id"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Select Lead*</FormLabel>
                  <Popover open={leadSearchOpen} onOpenChange={setLeadSearchOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={leadSearchOpen}
                          className={cn(
                            "w-full justify-between h-12 rounded-xl text-left bg-white",
                            !field.value && "text-muted-foreground"
                          )}
                          disabled={!!initialLeadId}
                        >
                          {field.value
                            ? leads.find((l) => l.id === field.value)?.name
                            : "Search by customer name or phone..."}
                          {!!initialLeadId ? <Clock className="ml-2 h-4 w-4 shrink-0 opacity-50" /> : <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Type name or phone..." />
                        <CommandList>
                          <CommandEmpty>No leads found.</CommandEmpty>
                          <CommandGroup>
                            {leads.map((lead) => (
                              <CommandItem
                                key={lead.id}
                                value={`${lead.name} ${lead.phone}`}
                                onSelect={() => {
                                  form.setValue("lead_id", lead.id)
                                  setLeadSearchOpen(false)
                                }}
                                className="flex flex-col items-start py-3 px-4 border-b last:border-0"
                              >
                                <div className="flex items-center justify-between w-full mb-1">
                                  <span className="font-bold">{lead.name}</span>
                                  <span className={cn(
                                    "text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest",
                                    lead.urgency === 'urgent' ? 'bg-red-100 text-red-700' :
                                    lead.urgency === 'high' ? 'bg-orange-100 text-orange-700' :
                                    lead.urgency === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-emerald-100 text-emerald-700'
                                  )}>
                                    {lead.urgency}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <span>{lead.city}</span>
                                  <span>•</span>
                                  <span>{lead.job_type}</span>
                                </div>
                                <Check
                                  className={cn(
                                    "absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4",
                                    field.value === lead.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedLead && (
              <div className="p-5 bg-primary/5 rounded-2xl border border-primary/10 relative group animate-in slide-in-from-top-2">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="font-black text-primary text-xl tracking-tight">{selectedLead.name}</h4>
                    <p className="text-sm text-muted-foreground font-medium">{selectedLead.phone} • {selectedLead.city}</p>
                  </div>
                  <Button variant="ghost" size="sm" asChild className="h-8 rounded-full bg-white shadow-sm border border-primary/10 hover:bg-primary/5">
                    <a href={`/dashboard/leads/${selectedLead.id}`} target="_blank" className="text-xs font-bold uppercase tracking-widest flex items-center gap-1.5">
                      View Lead <ExternalLink className="h-3 w-3" />
                    </a>
                  </Button>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 uppercase tracking-[0.15em]">
                      {selectedLead.service_type}
                    </span>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 border border-zinc-200 uppercase tracking-[0.15em]">
                      {selectedLead.job_type}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-600 leading-relaxed font-medium line-clamp-2 italic">
                    "{selectedLead.description}"
                  </p>
                  {selectedLead.ai_score && (
                    <div className="mt-4 flex items-center gap-2 p-2 bg-emerald-50 rounded-lg border border-emerald-100 w-fit">
                      <Sparkles className="h-3 w-3 text-emerald-600" />
                      <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest">AI Score: {selectedLead.ai_score}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* SECTION 2: ASSIGN TECHNICIAN */}
        <Card className="border-border/50 shadow-sm overflow-hidden">
          <CardHeader className="bg-muted/30 pb-4 border-b text-foreground">
             <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <span className="h-6 w-1 bg-primary rounded-full" />
              2. Assign Technician
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            {aiRecommendedTech && (
              <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-emerald-50 border border-emerald-100 rounded-2xl gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-200">
                    <Sparkles className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-emerald-800 uppercase tracking-widest">AI Recommendation</p>
                    <p className="text-sm font-bold text-emerald-600">{aiRecommendedTech.name} (Recommended based on skills & location)</p>
                  </div>
                </div>
                <Button 
                   type="button"
                   size="sm"
                   className="h-9 px-6 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-200"
                   onClick={handleUseAiRecommendation}
                   disabled={selectedTechId === aiRecommendedTechId}
                >
                  {selectedTechId === aiRecommendedTechId ? "Matching" : "Use AI Choice"}
                </Button>
              </div>
            )}

            <FormField
              control={form.control}
              name="technician_id"
              render={({ field }) => (
                <FormItem className="space-y-4">
                  <FormLabel className="text-foreground">Technician Availability</FormLabel>
                  <FormControl>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {technicians.map((tech) => {
                        const isOutsideArea = selectedLead && !tech.service_area?.includes(selectedLead.city)
                        const isSelected = field.value === tech.id
                        
                        return (
                          <div
                            key={tech.id}
                            className={cn(
                              "relative flex flex-col p-4 rounded-2xl border-2 transition-all cursor-pointer group",
                              isSelected ? "border-primary bg-primary/5 ring-4 ring-primary/5" : "border-border/50 bg-white hover:border-primary/40 hover:bg-zinc-50/50"
                            )}
                            onClick={() => form.setValue("technician_id", tech.id)}
                          >
                            <div className="flex items-center gap-3 mb-3">
                              <div className={cn(
                                "h-10 w-10 rounded-xl flex items-center justify-center text-sm font-black transition-colors",
                                isSelected ? "bg-primary text-white" : "bg-zinc-100 text-zinc-600 group-hover:bg-primary/10 group-hover:text-primary"
                              )}>
                                {tech.name.split(' ').map((n: string) => n[0]).join('')}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h5 className="font-bold text-sm truncate">{tech.name}</h5>
                                <div className="flex items-center gap-1.5">
                                  <span className={cn(
                                    "w-1.5 h-1.5 rounded-full",
                                    tech.is_available ? "bg-emerald-500 animate-pulse" : "bg-zinc-300"
                                  )} />
                                  <span className="text-[9px] text-muted-foreground font-black uppercase tracking-widest">
                                    {tech.is_available ? "Available" : "Busy"}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-1 mb-3">
                              {tech.skills?.slice(0, 3).map((skill: string) => (
                                <span key={skill} className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-500 font-bold border border-zinc-200">
                                  {skill}
                                </span>
                              ))}
                              {tech.skills?.length > 3 && (
                                <span className="text-[9px] px-1.5 py-0.5 text-zinc-400 font-bold">
                                  +{tech.skills.length - 3} more
                                </span>
                              )}
                            </div>

                            {isOutsideArea && selectedLead && (
                              <div className="flex items-center gap-1.5 text-[9px] font-black text-orange-600 bg-orange-50 px-2 py-1 rounded-lg border border-orange-100">
                                <AlertTriangle className="h-3 w-3" />
                                OUTSIDE AREA
                              </div>
                            )}

                            {isSelected && (
                              <div className="absolute top-2 right-2 h-5 w-5 bg-primary rounded-full flex items-center justify-center">
                                <Check className="h-3 w-3 text-white" />
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* SECTION 3: SCHEDULE & DURATION */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
           <Card className="border-border/50 shadow-sm overflow-hidden h-full">
            <CardHeader className="bg-muted/30 pb-4 border-b">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <span className="h-6 w-1 bg-primary rounded-full" />
                3. Date & Time
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="flex flex-col md:flex-row gap-8">
                <FormField
                  control={form.control}
                  name="scheduled_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Scheduled Date*</FormLabel>
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date < new Date(new Date().setHours(0,0,0,0)) || date.getDay() === 0}
                        className="rounded-xl border border-border/50 p-3 bg-white shadow-sm"
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex-1 space-y-4">
                   <FormField
                    control={form.control}
                    name="scheduled_time"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center justify-between">
                          Start Time*
                          <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/5 px-2 py-1 rounded-full border border-primary/20">
                            CET / Berlin
                          </span>
                        </FormLabel>
                        <FormControl>
                          <div className="grid grid-cols-4 gap-2 max-h-[280px] overflow-y-auto p-1 pr-2 scrollbar-thin scrollbar-thumb-zinc-200">
                            {TIME_SLOTS.map(time => (
                              <button
                                key={time}
                                type="button"
                                className={cn(
                                  "h-10 rounded-lg text-xs font-bold border-2 transition-all p-1",
                                  field.value === time 
                                    ? "bg-primary text-white border-primary shadow-lg shadow-primary/20 scale-105" 
                                    : "bg-white border-border/50 hover:bg-zinc-50 hover:border-primary/40"
                                )}
                                onClick={() => field.onChange(time)}
                              >
                                {time}
                              </button>
                            ))}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="estimated_duration"
                    render={({ field }) => (
                      <FormItem className="pt-2">
                        <FormLabel>Est. Duration*</FormLabel>
                        <FormControl>
                          <div className="flex flex-wrap gap-2">
                            {DURATIONS.map(d => (
                              <button
                                key={d.value}
                                type="button"
                                className={cn(
                                  "px-3 py-2 rounded-lg text-xs font-black border-2 transition-all",
                                  field.value === d.value 
                                    ? "bg-zinc-800 text-white border-zinc-900" 
                                    : "bg-white border-border/50 hover:bg-muted"
                                )}
                                onClick={() => field.onChange(d.value)}
                              >
                                {d.label}
                              </button>
                            ))}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm overflow-hidden h-full">
            <CardHeader className="bg-muted/30 pb-4 border-b">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <span className="h-6 w-1 bg-primary rounded-full" />
                4. Job Notes & Tasks
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Technician Instructions</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Provide details for the technician..." 
                        className="min-h-[120px] resize-none rounded-xl"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <FormLabel className="flex items-center gap-2">
                    Job Checklist
                  </FormLabel>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 rounded-full text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/5"
                    onClick={() => append({ text: '' })}
                    disabled={fields.length >= 10}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add Item
                  </Button>
                </div>

                <div className="space-y-2">
                  {fields.map((field, index) => (
                    <div key={field.id} className="flex gap-2 animate-in fade-in slide-in-from-right-2 duration-200">
                      <div className="flex-1">
                        <Input
                          placeholder={`Checklist item ${index + 1}...`}
                          {...form.register(`checklist.${index}.text` as const)}
                          className="h-10 rounded-xl"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 text-muted-foreground hover:text-red-600 hover:bg-red-50"
                        onClick={() => remove(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {fields.length === 0 && (
                    <div className="text-center py-6 border-2 border-dashed border-muted rounded-2xl">
                      <p className="text-xs text-muted-foreground font-medium">No checklist items added.</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* BOTTOM ACTIONS BAR */}
        <div className="flex items-center justify-between mt-8 p-6 bg-white border border-border/50 rounded-2xl shadow-xl shadow-zinc-100">
          <Button 
            type="button" 
            variant="ghost" 
            className="gap-2 font-bold px-8 rounded-xl"
            onClick={() => router.back()}
            disabled={isPending}
          >
            Cancel
          </Button>

          <Button 
            type="submit" 
            className="gap-2 font-black h-12 px-12 rounded-xl bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20"
            disabled={isPending || isLoadingData}
          >
            {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <CalendarDays className="h-5 w-5" />}
            Schedule Job
          </Button>
        </div>
      </form>
    </Form>
  )
}
