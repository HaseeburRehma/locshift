'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import dynamic from 'next/dynamic'
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { 
  Loader2, 
  MapPin, 
  Sparkles, 
  Save, 
  X, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// Dynamically import MapSelector
const MapSelector = dynamic(() => import('@/components/landing/MapSelector'), { 
  ssr: false,
  loading: () => <div className="h-[300px] w-full bg-muted animate-pulse rounded-2xl flex items-center justify-center text-muted-foreground">Loading Map...</div>
})

const leadSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  phone: z.string().min(10).regex(/^(\+49|0)\d{9,12}$/, 'Must be a valid German phone number'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  street: z.string().optional(),
  house_number: z.string().optional(),
  postcode: z.string().regex(/^\d{5}$/, '5-digit postcode').optional(),
  city: z.string().min(2, 'City is required'),
  service_type: z.enum(['electrician', 'plumber', 'hvac', 'general']),
  job_type: z.string().min(2, 'Job type is required'),
  description: z.string().min(20, 'Min 20 characters').max(1000, 'Max 1000 characters'),
  urgency: z.enum(['urgent', 'high', 'medium', 'low']),
  estimated_value: z.string().optional(),
  source: z.string().min(1, 'Source is required'),
  priority: z.string().optional(),
  notes: z.string().optional()
})

type LeadFormValues = z.infer<typeof leadSchema>

const JOB_TYPES: Record<string, string[]> = {
  electrician: [
    'Fuse Box Repair', 'Outlet Installation', 'Smart Home',
    'Emergency Repair', 'Rewiring', 'EV Charging',
    'Lighting', 'General', 'Other'
  ],
  plumber: ['Leak Repair', 'Pipe Installation', 'Bathroom Renovation', 'General'],
  hvac: ['AC Repair', 'Heating Maintenance', 'Ventilation', 'General'],
  general: ['Handyman', 'Painting', 'Assembly', 'Other']
}

export function NewLeadForm() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showMap, setShowMap] = useState(false)
  const [mapCenter, setMapCenter] = useState<[number, number]>([51.1657, 10.4515])

  const form = useForm<LeadFormValues>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      service_type: 'electrician',
      job_type: 'General',
      urgency: 'medium',
      source: 'Website',
      city: '',
      description: '',
      full_name: '',
      phone: ''
    }
  })

  const serviceType = form.watch('service_type')
  const description = form.watch('description') || ''

  const handleLocationSelect = async (lat: number, lng: number) => {
    setMapCenter([lat, lng])
    toast.info('Fetching address info...')
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`)
      const data = await res.json()
      if (data.address) {
        form.setValue('street', data.address.road || data.address.pedestrian || '')
        form.setValue('house_number', data.address.house_number || '')
        form.setValue('postcode', data.address.postcode || '')
        form.setValue('city', data.address.city || data.address.town || data.address.village || '')
        toast.success('Address imported!')
      }
    } catch (err) {
      toast.error('Failed to fetch address')
    }
  }

  const onSubmit = async (values: LeadFormValues, qualifyImmediately: boolean) => {
    startTransition(async () => {
      try {
        const res = await fetch('/api/leads/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...values, qualifyImmediately })
        })

        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to create lead')

        toast.success(qualifyImmediately ? 'Lead created and qualified!' : 'Lead saved as draft')
        router.push(`/dashboard/leads/${data.lead.id}`)
        router.refresh()
      } catch (err: any) {
        toast.error(err.message)
      }
    })
  }

  return (
    <Form {...form}>
      <form className="space-y-8 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* LEFT COLUMN: Customer Information */}
          <div className="space-y-6">
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <span className="w-1 h-6 bg-primary rounded-full" />
                  Customer Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="full_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name*</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone*</FormLabel>
                        <FormControl>
                          <Input placeholder="+49 XXX XXXXXXX" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email (optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="john@example.com" type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Address Section */}
                <div className="p-4 bg-muted/40 rounded-xl border border-border/50 space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Address Information</Label>
                    <Button 
                      type="button" 
                      variant={showMap ? "default" : "outline"}
                      size="sm"
                      className="h-8 rounded-full text-xs font-bold"
                      onClick={() => setShowMap(!showMap)}
                    >
                      <MapPin className="h-3 w-3 mr-1" />
                      {showMap ? "Close Map" : "Use Map"}
                    </Button>
                  </div>

                  {showMap && (
                    <div className="animate-in slide-in-from-top-2 duration-300">
                      <MapSelector onLocationSelect={handleLocationSelect} initialPos={mapCenter} />
                      <p className="text-[10px] text-muted-foreground mt-2 text-center font-medium italic">
                        Click on the map to automatically fill the address fields.
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-4 gap-4">
                    <div className="col-span-3">
                      <FormField
                        control={form.control}
                        name="street"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Street</FormLabel>
                            <FormControl>
                              <Input placeholder="Main St" {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="col-span-1">
                      <FormField
                        control={form.control}
                        name="house_number"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">No.</FormLabel>
                            <FormControl>
                              <Input placeholder="12" {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="postcode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Postcode</FormLabel>
                          <FormControl>
                            <Input placeholder="10115" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">City*</FormLabel>
                          <FormControl>
                            <Input placeholder="Berlin" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <span className="w-1 h-6 bg-primary rounded-full" />
                  Internal Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea 
                          placeholder="Admin/Manager notes (internal only)..." 
                          className="min-h-[120px] resize-none"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </div>

          {/* RIGHT COLUMN: Job Details */}
          <div className="space-y-6">
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <span className="w-1 h-6 bg-primary rounded-full" />
                  Job Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="service_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Service Type*</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select service" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="electrician">Electrician</SelectItem>
                            <SelectItem value="plumber">Plumber</SelectItem>
                            <SelectItem value="hvac">HVAC</SelectItem>
                            <SelectItem value="general">General</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="job_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Job Type*</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {JOB_TYPES[serviceType].map(type => (
                              <SelectItem key={type} value={type}>{type}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel>Description*</FormLabel>
                        <span className={cn(
                          "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                          description.length < 20 ? "text-destructive border-destructive/20 bg-destructive/5" : "text-emerald-600 border-emerald-200 bg-emerald-50"
                        )}>
                          {description.length} / 1000
                        </span>
                      </div>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe the problem in detail..." 
                          className="min-h-[150px] resize-none"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="urgency"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Urgency*</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="grid grid-cols-2 md:grid-cols-4 gap-3"
                        >
                          {[
                            { value: 'urgent', label: 'Urgent', icon: '🔴', color: 'border-red-500 bg-red-50 text-red-700' },
                            { value: 'high', label: 'High', icon: '🟠', color: 'border-orange-500 bg-orange-50 text-orange-700' },
                            { value: 'medium', label: 'Medium', icon: '🟡', color: 'border-yellow-500 bg-yellow-50 text-yellow-700' },
                            { value: 'low', label: 'Low', icon: '🟢', color: 'border-emerald-500 bg-emerald-50 text-emerald-700' },
                          ].map((option) => (
                            <FormItem key={option.value}>
                              <FormControl className="sr-only">
                                <RadioGroupItem value={option.value} />
                              </FormControl>
                              <FormLabel className={cn(
                                "flex flex-col items-center justify-center p-3 rounded-xl border-2 cursor-pointer transition-all hover:scale-105 active:scale-95",
                                field.value === option.value ? option.color : "border-muted bg-white hover:bg-muted/30"
                              )}>
                                <span className="text-xl mb-1">{option.icon}</span>
                                <span className="text-[10px] font-black uppercase tracking-widest">{option.label}</span>
                              </FormLabel>
                            </FormItem>
                          ))}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="estimated_value"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Est. Value</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select range" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="under_200">Under €200</SelectItem>
                            <SelectItem value="200-500">€200-500</SelectItem>
                            <SelectItem value="500-1000">€500-1000</SelectItem>
                            <SelectItem value="1000-2500">€1000-2500</SelectItem>
                            <SelectItem value="above_2500">€2500+</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="source"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Source*</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Source" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Website">Website</SelectItem>
                            <SelectItem value="Google Ads">Google Ads</SelectItem>
                            <SelectItem value="Meta Ads">Meta Ads</SelectItem>
                            <SelectItem value="Referral">Referral</SelectItem>
                            <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                            <SelectItem value="Phone Call">Phone Call</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priority</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Priority" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="normal">Normal</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="dispatch">Dispatch Technician</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* STICKY BOTTOM ACTIONS BAR */}
        <div className="fixed bottom-0 left-0 right-0 lg:left-64 bg-white/80 backdrop-blur-md border-t border-border z-30 p-4 transition-all">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <Button 
              type="button" 
              variant="ghost" 
              className="gap-2 font-bold"
              onClick={() => router.back()}
              disabled={isPending}
            >
              <X className="h-4 w-4" />
              Cancel
            </Button>

            <div className="flex items-center gap-3">
              <Button 
                type="button" 
                variant="outline" 
                className="gap-2 font-bold bg-white"
                onClick={() => onSubmit(form.getValues(), false)}
                disabled={isPending}
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save as Draft
              </Button>
              <Button 
                type="button" 
                className="gap-2 font-black bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200"
                onClick={() => form.handleSubmit(v => onSubmit(v, true))()}
                disabled={isPending}
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Save & Qualify with AI
              </Button>
            </div>
          </div>
        </div>
      </form>
    </Form>
  )
}
