'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
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
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { 
  Loader2, 
  UserPlus, 
  Wrench, 
  Mail, 
  Phone, 
  MapPin, 
  Tag, 
  Plus, 
  X 
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const techSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().min(10).regex(/^(\+49|0)\d{9,12}$/, 'Must be a valid German phone number'),
  service_area: z.array(z.string()).min(1, 'At least one service area is required'),
  skills: z.array(z.string()).min(1, 'At least one skill is required'),
  is_available: z.boolean().default(true),
  is_active: z.boolean().default(true),
  createLogin: z.boolean().default(false)
})

type TechFormValues = z.infer<typeof techSchema>

const POPULAR_CITIES = ['Düsseldorf', 'Köln', 'Berlin', 'Hamburg', 'München']
const PRESET_SKILLS = ['Fuse Box', 'Wiring', 'Lighting', 'Outlets', 'Smart Home', 'EV Charging', 'Emergency', 'Rewiring']

export function NewTechnicianForm() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const form = useForm<TechFormValues>({
    resolver: zodResolver(techSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      service_area: [],
      skills: [],
      is_available: true,
      is_active: true,
      createLogin: false
    }
  })

  const serviceAreas = form.watch('service_area')
  const skills = form.watch('skills')

  const toggleTag = (field: 'service_area' | 'skills', value: string) => {
    const current = form.getValues(field)
    if (current.includes(value)) {
      form.setValue(field, current.filter(v => v !== value))
    } else {
      form.setValue(field, [...current, value])
    }
  }

  const handleCustomTag = (field: 'service_area' | 'skills', e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const val = e.currentTarget.value.trim()
      if (val && !form.getValues(field).includes(val)) {
        form.setValue(field, [...form.getValues(field), val])
        e.currentTarget.value = ''
      }
    }
  }

  const onSubmit = async (values: TechFormValues) => {
    startTransition(async () => {
      try {
        const res = await fetch('/api/technicians/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values)
        })

        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to create technician')

        toast.success('Technician created successfully!')
        router.push(`/dashboard/technicians/${data.technician.id}`)
        router.refresh()
      } catch (err: any) {
        toast.error(err.message)
      }
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* SECTION 1: Personal Info */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <span className="h-6 w-1 bg-primary rounded-full" />
              1. Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name*</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Hans Müller" className="pl-10 h-11" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email (optional)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="hans@fixdone.de" type="email" className="pl-10 h-11" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone*</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="+49 151 12345678" className="pl-10 h-11" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* SECTION 2: Work Profile */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <span className="h-6 w-1 bg-primary rounded-full" />
              2. Work Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="service_area"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Service Areas*</FormLabel>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {serviceAreas.map(city => (
                      <Badge key={city} variant="secondary" className="h-7 pl-3 pr-2 gap-1 rounded-full bg-primary/10 text-primary hover:bg-primary/20 border-primary/20">
                        {city}
                        <X className="h-3 w-3 cursor-pointer" onClick={() => toggleTag('service_area', city)} />
                      </Badge>
                    ))}
                  </div>
                  <FormControl>
                    <div className="relative group">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        placeholder="Type city and press Enter..." 
                        className="pl-10 h-11"
                        onKeyDown={(e) => handleCustomTag('service_area', e)}
                      />
                    </div>
                  </FormControl>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest self-center mr-1">Quick Add:</span>
                    {POPULAR_CITIES.map(city => (
                      <button
                        key={city}
                        type="button"
                        className={cn(
                          "text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all",
                          serviceAreas.includes(city) ? "bg-primary border-primary text-white" : "bg-white border-muted-foreground/20 text-muted-foreground hover:border-primary/40"
                        )}
                        onClick={() => toggleTag('service_area', city)}
                      >
                        {city}
                      </button>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="skills"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Skills & Expertise*</FormLabel>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {skills.map(skill => (
                      <Badge key={skill} variant="secondary" className="h-7 pl-3 pr-2 gap-1 rounded-full bg-zinc-800 text-white hover:bg-zinc-700 border-none">
                        {skill}
                        <X className="h-3 w-3 cursor-pointer" onClick={() => toggleTag('skills', skill)} />
                      </Badge>
                    ))}
                  </div>
                  <FormControl>
                    <div className="relative group">
                      <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        placeholder="Type skill and press Enter..." 
                        className="pl-10 h-11"
                        onKeyDown={(e) => handleCustomTag('skills', e)}
                      />
                    </div>
                  </FormControl>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest self-center mr-1">Suggested:</span>
                    {PRESET_SKILLS.map(skill => (
                      <button
                        key={skill}
                        type="button"
                        className={cn(
                          "text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all",
                          skills.includes(skill) ? "bg-zinc-800 border-zinc-900 text-white" : "bg-white border-muted-foreground/20 text-muted-foreground hover:border-zinc-400"
                        )}
                        onClick={() => toggleTag('skills', skill)}
                      >
                        {skill}
                      </button>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-8 py-4 border-y border-border/50">
              <FormField
                control={form.control}
                name="is_available"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between space-y-0 rounded-xl border p-4 bg-muted/20">
                    <div className="space-y-0.5">
                      <FormLabel className="font-bold">Immediate Availability</FormLabel>
                      <FormDescription className="text-[10px]">Technical ready for new jobs</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between space-y-0 rounded-xl border p-4 bg-muted/20">
                    <div className="space-y-0.5">
                      <FormLabel className="font-bold">Active Status</FormLabel>
                      <FormDescription className="text-[10px]">Show in technician lists</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* SECTION 3: Auth Account */}
        <Card className="border-border/50 shadow-sm bg-primary/5 border-primary/10">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <span className="h-6 w-1 bg-primary rounded-full" />
              3. Login Account
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="createLogin"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between space-y-0 p-4 rounded-xl bg-white border border-primary/10 shadow-sm">
                  <div className="space-y-1">
                    <FormLabel className="text-primary font-black uppercase text-xs tracking-wider">Create app login for this technician</FormLabel>
                    <FormDescription className="text-[10px] pr-8">
                      An invitation email will be sent to the address above. The technician can set their secure password via the link.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex items-center gap-4 pt-4">
          <Button 
             type="button" 
             variant="ghost" 
             className="h-12 flex-1 font-bold rounded-xl"
             onClick={() => router.back()}
             disabled={isPending}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            className="h-12 flex-[2] font-black text-lg bg-primary hover:bg-primary/90 text-white shadow-xl shadow-primary/20 rounded-xl"
            disabled={isPending}
          >
            {isPending ? (
              <><Loader2 className="h-5 w-5 animate-spin mr-2" /> Creating...</>
            ) : (
              <><Plus className="h-5 w-5 mr-2" /> Create Technician</>
            )}
          </Button>
        </div>
      </form>
    </Form>
  )
}
