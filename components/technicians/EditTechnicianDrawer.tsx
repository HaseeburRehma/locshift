'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet"
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { 
  Settings2, 
  Save, 
  Trash2, 
  AlertCircle, 
  Loader2, 
  X, 
  Plus, 
  MapPin, 
  Tag 
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

const techSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().min(10),
  service_area: z.array(z.string()).min(1),
  skills: z.array(z.string()).min(1),
  is_available: z.boolean(),
  is_active: z.boolean()
})

type TechFormValues = z.infer<typeof techSchema>

export function EditTechnicianDrawer({ technician }: { technician: any }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const form = useForm<TechFormValues>({
    resolver: zodResolver(techSchema),
    defaultValues: {
      name: technician.name,
      email: technician.email || '',
      phone: technician.phone,
      service_area: technician.service_area || [],
      skills: technician.skills || [],
      is_available: technician.is_available,
      is_active: technician.is_active
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
    setIsUpdating(true)
    try {
      const res = await fetch(`/api/technicians/${technician.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values)
      })

      if (!res.ok) throw new Error('Failed to update')
      
      toast.success('Technician updated')
      setOpen(false)
      router.refresh()
    } catch (err) {
      toast.error('Update failed')
    } finally {
      setIsUpdating(false)
    }
  }

  const onDelete = async () => {
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/technicians/${technician.id}`, {
        method: 'DELETE'
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to delete')

      toast.success('Technician removed')
      router.push('/dashboard/technicians')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="h-12 px-6 rounded-2xl border-border/50 font-black text-[10px] uppercase tracking-widest gap-2 bg-white hover:bg-zinc-50 shadow-sm transition-all hover:scale-105 active:scale-95">
          <Settings2 className="h-4 w-4" />
          Edit Profile
        </Button>
      </SheetTrigger>
      <SheetContent className="sm:max-w-md overflow-y-auto w-full">
        <SheetHeader className="pb-6 border-b">
          <SheetTitle className="text-2xl font-black tracking-tight">Edit Technician</SheetTitle>
          <SheetDescription>Update profile details or deactivate the account.</SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-6 pb-20">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input {...field} className="h-11 rounded-xl" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input {...field} className="h-11 rounded-xl" />
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
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input {...field} className="h-11 rounded-xl" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="service_area"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Service Areas</FormLabel>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {serviceAreas.map(city => (
                      <Badge key={city} variant="secondary" className="h-7 pl-3 pr-2 gap-1 rounded-full bg-primary/10 text-primary border-primary/20">
                        {city}
                        <X className="h-3 w-3 cursor-pointer" onClick={() => toggleTag('service_area', city)} />
                      </Badge>
                    ))}
                  </div>
                  <FormControl>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        placeholder="Add city..." 
                        className="pl-10 h-11 rounded-xl"
                        onKeyDown={(e) => handleCustomTag('service_area', e)}
                      />
                    </div>
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="skills"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Skills</FormLabel>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {skills.map(skill => (
                      <Badge key={skill} variant="secondary" className="h-7 pl-3 pr-2 gap-1 rounded-full bg-zinc-800 text-white border-none">
                        {skill}
                        <X className="h-3 w-3 cursor-pointer" onClick={() => toggleTag('skills', skill)} />
                      </Badge>
                    ))}
                  </div>
                  <FormControl>
                    <div className="relative">
                      <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        placeholder="Add skill..." 
                        className="pl-10 h-11 rounded-xl"
                        onKeyDown={(e) => handleCustomTag('skills', e)}
                      />
                    </div>
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="space-y-4 p-4 bg-muted/30 rounded-2xl border border-border/50">
               <FormField
                control={form.control}
                name="is_available"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between space-y-0">
                    <FormLabel className="text-sm font-bold">Is Available?</FormLabel>
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
                  <FormItem className="flex items-center justify-between space-y-0">
                    <FormLabel className="text-sm font-bold">Account Active</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex flex-col gap-3 pt-6">
              <Button type="submit" className="w-full h-12 font-black text-lg gap-2 rounded-xl bg-primary text-white shadow-lg shadow-primary/20" disabled={isUpdating}>
                {isUpdating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                Save Changes
              </Button>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="ghost" className="w-full h-12 font-bold text-destructive hover:bg-destructive/5 hover:text-destructive gap-2 rounded-xl">
                    <Trash2 className="h-4 w-4" />
                    Archive Technician
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="rounded-3xl border-border/50">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-xl font-bold flex items-center gap-2">
                       <AlertCircle className="h-5 w-5 text-destructive" />
                       Confirm Deactivation
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This will mark the technician as inactive. They will no longer appear in new job assignments. Existing data will be preserved.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-xl font-bold">Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                       className="rounded-xl font-black bg-destructive hover:bg-destructive/90 text-white"
                       onClick={onDelete}
                       disabled={isDeleting}
                    >
                      {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Deactivate Now"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}
