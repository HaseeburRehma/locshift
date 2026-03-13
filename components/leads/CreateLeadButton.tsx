'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { AlertCircle, Loader2, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { createLead } from '@/app/actions/leads'

// ─── Schema ───────────────────────────────────────────────────────────────────

const CreateLeadSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().min(6, 'Phone is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  street: z.string().optional(),
  house_no: z.string().optional(),
  city: z.string().optional(),
  postcode: z.string().optional(),
  description: z.string().min(20, 'Description must be at least 20 characters'),
  service_type: z.enum(['electrician', 'plumber', 'cleaner', 'other']),
  urgency: z.enum(['low', 'medium', 'high']),
  budget: z.string().optional(),
  estimated_value: z.string().optional(),
  source: z.enum(['website', 'google_ads', 'meta_ads', 'referral', 'phone', 'other']),
})

type CreateLeadValues = z.infer<typeof CreateLeadSchema>

// ─── Component ────────────────────────────────────────────────────────────────

export function CreateLeadButton() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreateLeadValues>({
    resolver: zodResolver(CreateLeadSchema),
    defaultValues: {
      urgency: 'medium',
      service_type: 'electrician',
      source: 'website',
    },
  })

  const onSubmit = (values: CreateLeadValues) => {
    setServerError(null)
    startTransition(async () => {
      const result = await createLead({
        ...values,
        email: values.email || undefined,
        job_type: undefined,
      })
      if (result.success) {
        toast.success('Lead created successfully!')
        reset()
        setOpen(false)
        router.refresh()
      } else {
        setServerError(result.error ?? 'Failed to create lead')
      }
    })
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-2">
        <Plus className="h-4 w-4" />
        New Lead
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Lead</DialogTitle>
            <DialogDescription>Add a new customer inquiry to the pipeline.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
            {/* Name + Phone */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="name">Name *</Label>
                <Input id="name" placeholder="Max Mustermann" {...register('name')} />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone *</Label>
                <Input id="phone" placeholder="+49 ..." {...register('phone')} />
                {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email (optional)</Label>
              <Input id="email" type="email" placeholder="max@example.de" {...register('email')} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>

            {/* Street + House No */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="street">Street</Label>
                <Input id="street" placeholder="Main St" {...register('street')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="house_no">House No</Label>
                <Input id="house_no" placeholder="123" {...register('house_no')} />
              </div>
            </div>

            {/* City + Postcode */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="city">City</Label>
                <Input id="city" placeholder="Berlin" {...register('city')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="postcode">Postcode</Label>
                <Input id="postcode" placeholder="10115" {...register('postcode')} />
              </div>
            </div>

            {/* Budget */}
            <div className="space-y-1.5">
              <Label htmlFor="budget">Budget (optional)</Label>
              <Input id="budget" placeholder="e.g. 500" {...register('budget')} />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                placeholder="Describe the customer's issue in detail..."
                className="resize-none h-24"
                {...register('description')}
              />
              {errors.description && (
                <p className="text-xs text-destructive">{errors.description.message}</p>
              )}
            </div>

            {/* Service type + Urgency */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Service Type *</Label>
                <Select
                  defaultValue="electrician"
                  onValueChange={(v) => setValue('service_type', v as CreateLeadValues['service_type'])}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['electrician', 'plumber', 'cleaner', 'other'].map((s) => (
                      <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Urgency *</Label>
                <Select
                  defaultValue="medium"
                  onValueChange={(v) => setValue('urgency', v as CreateLeadValues['urgency'])}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['low', 'medium', 'high'].map((u) => (
                      <SelectItem key={u} value={u} className="capitalize">{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Estimated value + Source */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="estimated_value">Est. Value (optional)</Label>
                <Input id="estimated_value" placeholder="€200–€400" {...register('estimated_value')} />
              </div>
              <div className="space-y-1.5">
                <Label>Source</Label>
                <Select
                  defaultValue="website"
                  onValueChange={(v) => setValue('source', v as CreateLeadValues['source'])}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['website', 'google_ads', 'meta_ads', 'referral', 'phone', 'other'].map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {serverError && (
              <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg border border-destructive/20">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{serverError}</span>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Creating...</>
              ) : (
                <><Plus className="h-4 w-4 mr-2" /> Create Lead</>
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
