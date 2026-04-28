'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/user-context'
import { useTranslation } from '@/lib/i18n'
import { toast } from 'sonner'
import {
  ChevronLeft,
  Building2,
  Mail,
  Phone,
  Globe,
  MapPin,
  Loader2,
  Save,
  Camera,
  Receipt,
} from 'lucide-react'

/**
 * Unternehmensprofil — admin-only view to edit org-level company metadata
 * (name, legal_name, contact, address, tax id, currency/timezone, logo).
 * Persists to public.organizations (extended in 20260428100000_settings_module).
 */
export default function CompanyProfilePage() {
  const router = useRouter()
  const supabase = createClient()
  const { profile, isAdmin, isLoading } = useUser()
  const { locale } = useTranslation()
  const L = (de: string, en: string) => (locale === 'de' ? de : en)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)

  const [form, setForm] = useState({
    name: '',
    legal_name: '',
    email: '',
    phone: '',
    website: '',
    address: '',
    tax_id: '',
    currency: 'EUR',
    timezone: 'Europe/Berlin',
    logo_url: '' as string | null,
  })

  // Admin-only — Settings module is admin scope
  useEffect(() => {
    if (!isLoading && !isAdmin) router.replace('/dashboard')
  }, [isLoading, isAdmin, router])

  useEffect(() => {
    if (!profile?.organization_id) return
    ;(async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('name, legal_name, email, phone, website, address, tax_id, currency, timezone, logo_url')
        .eq('id', profile.organization_id)
        .single()

      if (!error && data) {
        setForm({
          name: data.name || '',
          legal_name: data.legal_name || '',
          email: data.email || '',
          phone: data.phone || '',
          website: data.website || '',
          address: data.address || '',
          tax_id: data.tax_id || '',
          currency: data.currency || 'EUR',
          timezone: data.timezone || 'Europe/Berlin',
          logo_url: data.logo_url || null,
        })
      }
      setLoading(false)
    })()
  }, [profile?.organization_id, supabase])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const handleSave = async () => {
    if (!profile?.organization_id) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from('organizations')
        .update({
          name: form.name,
          legal_name: form.legal_name || null,
          email: form.email || null,
          phone: form.phone || null,
          website: form.website || null,
          address: form.address || null,
          tax_id: form.tax_id || null,
          currency: form.currency,
          timezone: form.timezone,
        })
        .eq('id', profile.organization_id)
      if (error) throw error
      toast.success(L('Unternehmensprofil gespeichert', 'Company profile saved'))
    } catch (err: any) {
      toast.error(err.message || L('Speichern fehlgeschlagen', 'Save failed'))
    } finally {
      setSaving(false)
    }
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !profile?.organization_id) return
    setUploadingLogo(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `${profile.organization_id}/logo-${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true })
      if (upErr) throw upErr

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)

      const { error: updErr } = await supabase
        .from('organizations')
        .update({ logo_url: publicUrl })
        .eq('id', profile.organization_id)
      if (updErr) throw updErr

      setForm(prev => ({ ...prev, logo_url: publicUrl }))
      toast.success(L('Logo aktualisiert', 'Logo updated'))
    } catch (err: any) {
      toast.error(err.message || L('Upload fehlgeschlagen', 'Upload failed'))
    } finally {
      setUploadingLogo(false)
    }
  }

  if (isLoading || loading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <Loader2 className="w-7 h-7 animate-spin text-blue-500" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto pb-12">
      <Link
        href="/dashboard/settings"
        className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 transition-colors mb-4"
      >
        <ChevronLeft className="w-3 h-3" /> {L('Einstellungen', 'Settings')}
      </Link>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-[#0064E0] leading-tight">
              {L('Unternehmensprofil', 'Company Profile')}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {L('Firmendaten, Branding und Kontaktinformationen.', 'Company data, branding and contact information.')}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main column — form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 md:p-8">
            <h2 className="text-base font-bold text-slate-900 mb-5">
              {L('Allgemeine Informationen', 'General information')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Field label={L('Markenname', 'Brand name') + ' *'}>
                <Input name="name" value={form.name} onChange={handleChange} placeholder="LokShift" />
              </Field>
              <Field label={L('Rechtlicher Name', 'Legal entity name')}>
                <Input name="legal_name" value={form.legal_name} onChange={handleChange} placeholder="LokShift GmbH" />
              </Field>
              <Field label={L('Geschäfts-E-Mail', 'Business email') + ' *'}>
                <InputWithIcon icon={Mail} type="email" name="email" value={form.email} onChange={handleChange} placeholder="kontakt@firma.de" />
              </Field>
              <Field label={L('Telefon', 'Phone')}>
                <InputWithIcon icon={Phone} name="phone" value={form.phone} onChange={handleChange} placeholder="+49 …" />
              </Field>
              <Field label={L('Website', 'Website')} className="md:col-span-2">
                <InputWithIcon icon={Globe} name="website" value={form.website} onChange={handleChange} placeholder="https://…" />
              </Field>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 md:p-8">
            <h2 className="text-base font-bold text-slate-900 mb-5">
              {L('Adresse & Steuern', 'Address & taxation')}
            </h2>
            <div className="space-y-5">
              <Field label={L('Geschäftsadresse', 'Office address') + ' *'}>
                <InputWithIcon icon={MapPin} name="address" value={form.address} onChange={handleChange}
                  placeholder={L('Straße, PLZ Stadt', 'Street, ZIP City')} />
              </Field>
              <Field label={L('USt-IdNr. / Steuer-ID', 'VAT / Tax ID')}>
                <InputWithIcon icon={Receipt} name="tax_id" value={form.tax_id} onChange={handleChange} placeholder="DE123456789" />
              </Field>
            </div>
          </div>
        </div>

        {/* Side column — logo + locale */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 md:p-8 text-center">
            <div className="mx-auto h-28 w-28 rounded-3xl bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden relative">
              {form.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.logo_url} alt="logo" className="w-full h-full object-cover" />
              ) : (
                <Building2 className="w-10 h-10 text-slate-300" />
              )}
              {uploadingLogo && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 animate-spin text-white" />
                </div>
              )}
            </div>
            <p className="text-sm font-bold mt-4">{L('Firmenlogo', 'Company logo')}</p>
            <p className="text-xs text-slate-500 mt-1">PNG / JPG · max. 2 MB</p>
            <label className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors">
              <Camera className="w-4 h-4" />
              {L('Logo ändern', 'Change logo')}
              <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} disabled={uploadingLogo} />
            </label>
          </div>

          <div id="localization" className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 md:p-8">
            <h2 className="text-base font-bold text-slate-900 mb-5">{L('Lokalisierung', 'Localization')}</h2>
            <div className="space-y-4">
              <Field label={L('Währung', 'Currency')}>
                <select
                  name="currency"
                  value={form.currency}
                  onChange={handleChange}
                  className="w-full text-sm bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="EUR">EUR · €</option>
                  <option value="CHF">CHF · Fr.</option>
                  <option value="USD">USD · $</option>
                  <option value="GBP">GBP · £</option>
                </select>
              </Field>
              <Field label={L('Zeitzone', 'Timezone')}>
                <select
                  name="timezone"
                  value={form.timezone}
                  onChange={handleChange}
                  className="w-full text-sm bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="Europe/Berlin">Europe/Berlin</option>
                  <option value="Europe/Vienna">Europe/Vienna</option>
                  <option value="Europe/Zurich">Europe/Zurich</option>
                  <option value="Europe/London">Europe/London</option>
                  <option value="UTC">UTC</option>
                </select>
              </Field>
              <Link
                href="/dashboard/settings/localization"
                className="block text-center text-sm font-semibold text-blue-600 hover:text-blue-700 mt-2"
              >
                {L('Erweiterte Lokalisierung →', 'Advanced localization →')}
              </Link>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-200 transition-all disabled:opacity-60"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {L('Änderungen speichern', 'Save changes')}
          </button>
        </div>
      </div>
    </div>
  )
}

// --- small helpers (kept local; this page is self-contained) ---
function Field({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">{label}</label>
      {children}
    </div>
  )
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full text-sm bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-slate-700 font-medium placeholder:text-slate-300"
    />
  )
}

function InputWithIcon({ icon: Icon, ...props }: { icon: any } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative">
      <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
      <input
        {...props}
        className="w-full text-sm bg-slate-50 pl-10 pr-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-slate-700 font-medium placeholder:text-slate-300"
      />
    </div>
  )
}
