'use client'

import { useState } from 'react'
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
import { 
  Building2, 
  Mail, 
  Phone, 
  Globe, 
  MapPin, 
  Save, 
  Loader2, 
  Camera,
  Euro,
  Scale
} from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from '@/lib/i18n'

const companySchema = z.object({
  name: z.string().min(2).max(100),
  legal_name: z.string().min(2).max(100).optional().or(z.literal('')),
  email: z.string().email(),
  phone: z.string().min(10),
  website: z.string().url().optional().or(z.literal('')),
  address: z.string().min(5),
  tax_id: z.string().optional().or(z.literal('')),
  currency: z.string().default('EUR'),
  timezone: z.string().default('Europe/Berlin')
})

type CompanyFormValues = z.infer<typeof companySchema>

export function CompanySettingsForm({ initialData }: { initialData: any }) {
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)
  const { locale } = useTranslation()
  const L = (de: string, en: string) => locale === 'de' ? de : en

  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: initialData.name || '',
      legal_name: initialData.legal_name || '',
      email: initialData.email || '',
      phone: initialData.phone || '',
      website: initialData.website || '',
      address: initialData.address || '',
      tax_id: initialData.tax_id || '',
      currency: initialData.currency || 'EUR',
      timezone: initialData.timezone || 'Europe/Berlin'
    }
  })

  const onSubmit = async (values: CompanyFormValues) => {
    setIsPending(true)
    try {
      const res = await fetch('/api/settings/company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values)
      })

      if (!res.ok) throw new Error('Failed to update settings')

      toast.success(L('Unternehmenseinstellungen gespeichert', 'Company settings updated successfully'))
      router.refresh()
    } catch (err) {
      toast.error(L('Speichern fehlgeschlagen', 'Failed to update'))
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <Card className="border-border/50 shadow-sm rounded-3xl overflow-hidden">
              <CardHeader className="bg-muted/30 border-b pb-4">
                <CardTitle className="text-lg font-bold">{L('Allgemeine Informationen', 'General Information')}</CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{L('Markenname*', 'Brand Name*')}</FormLabel>
                        <FormControl>
                          <Input placeholder="LokShift" className="h-11 rounded-xl" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="legal_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{L('Rechtlicher Name', 'Legal Entity Name')}</FormLabel>
                        <FormControl>
                          <Input placeholder="LokShift GmbH" className="h-11 rounded-xl" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{L('Geschäfts-E-Mail*', 'Business Email*')}</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="contact@fixdone.de" type="email" className="pl-10 h-11 rounded-xl" {...field} />
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
                        <FormLabel>{L('Support-Telefon*', 'Support Phone*')}</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="+49 151 12345678" className="pl-10 h-11 rounded-xl" {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Website</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input placeholder="https://fixdone.de" className="pl-10 h-11 rounded-xl" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card className="border-border/50 shadow-sm rounded-3xl overflow-hidden">
               <CardHeader className="bg-muted/30 border-b pb-4">
                <CardTitle className="text-lg font-bold">{L('Adresse & Steuer', 'Address & Taxation')}</CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                 <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{L('Büroadresse*', 'Office Address*')}</FormLabel>
                      <FormControl>
                         <div className="relative">
                            <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Berliner Str. 123, 10115 Berlin" className="pl-10 h-11 rounded-xl" {...field} />
                         </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="tax_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>VAT / Tax ID</FormLabel>
                      <FormControl>
                         <div className="relative">
                            <Scale className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="DE123456789" className="pl-10 h-11 rounded-xl" {...field} />
                         </div>
                      </FormControl>
                      <FormDescription>Required for generated customer invoices.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-8">
            <Card className="border-border/50 shadow-sm rounded-3xl overflow-hidden">
               <CardContent className="p-8 text-center space-y-6">
                  <div className="mx-auto h-24 w-24 rounded-3xl bg-zinc-100 flex items-center justify-center relative group cursor-pointer border-2 border-dashed border-zinc-200 hover:border-primary/50 transition-colors">
                     <Building2 className="h-10 w-10 text-zinc-400 group-hover:text-primary" />
                     <div className="absolute inset-0 bg-black/40 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Camera className="text-white h-6 w-6" />
                     </div>
                  </div>
                  <div className="space-y-1">
                     <h4 className="font-bold">Company Logo</h4>
                     <p className="text-xs text-muted-foreground">PNG, JPG up to 2MB. Square recommended.</p>
                  </div>
                  <Button variant="outline" size="sm" className="rounded-full font-bold">Change Logo</Button>
               </CardContent>
            </Card>

            <Card className="border-border/50 shadow-sm rounded-3xl overflow-hidden">
               <CardHeader className="bg-muted/30 border-b pb-4">
                <CardTitle className="text-sm font-black uppercase tracking-widest">Localization</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                 <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold">Currency</FormLabel>
                      <FormControl>
                        <div className="relative">
                           <Euro className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                           <Input className="pl-10 h-10 rounded-xl bg-zinc-50" readOnly {...field} />
                        </div>
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="timezone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold">Timezone</FormLabel>
                      <FormControl>
                        <div className="relative">
                           <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                           <Input className="pl-10 h-10 rounded-xl bg-zinc-50" readOnly {...field} />
                        </div>
                      </FormControl>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Button 
               type="submit" 
               className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black text-lg shadow-xl shadow-primary/20 gap-2"
               disabled={isPending}
            >
              {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
              Save All Changes
            </Button>
          </div>
        </div>
      </form>
    </Form>
  )
}
