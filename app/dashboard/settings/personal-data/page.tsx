'use client'

import React, { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ChevronLeft, LogOut, Loader2, Camera } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useUser } from '@/lib/user-context'
import { toast } from 'sonner'
import { useTranslation } from '@/lib/i18n'

/**
 * Personal Data — own-profile editor.
 * Layout: constrained max-w-2xl card; on desktop labels sit in a 1/3 column,
 * inputs in a 2/3 column. On mobile labels stack above inputs. Buttons are
 * inline-auto-width (not full-bleed) to match the rest of the dashboard
 * design language.
 * i18n: every visible string runs through the inline L() helper so the page
 * follows the global DE/EN toggle.
 */
export default function PersonalDataPage() {
  const router = useRouter()
  const { profile, refreshUser } = useUser()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { locale } = useTranslation()
  const L = (de: string, en: string) => (locale === 'de' ? de : en)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    gender: '',
    bio: ''
  })

  useEffect(() => {
    async function loadData() {
      if (!profile) return
      try {
        const { data } = await supabase
          .from('profiles')
          .select('first_name, last_name, phone, gender, bio, email, avatar_url')
          .eq('id', profile.id)
          .single()

        if (data) {
          setFormData({
            first_name: data.first_name || '',
            last_name: data.last_name || '',
            email: data.email || profile.email || '',
            phone: data.phone || '',
            gender: data.gender || '',
            bio: data.bio || ''
          })
          setAvatarUrl(data.avatar_url || profile.avatar_url)
        }
      } catch (err) {
        console.error('Error loading profile:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [profile, supabase])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSave = async () => {
    if (!profile) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          ...formData,
          full_name: `${formData.first_name} ${formData.last_name}`.trim(),
        })
        .eq('id', profile.id)

      if (error) throw error

      toast.success(L('Profil aktualisiert', 'Profile updated'))
      await refreshUser()
    } catch (err: any) {
      toast.error(L('Profil konnte nicht aktualisiert werden: ', 'Failed to update profile: ') + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0]
      if (!file || !profile) return

      setUploadingAvatar(true)
      const fileExt = file.name.split('.').pop()
      const fileName = `${profile.id}-${Math.random()}.${fileExt}`
      const filePath = `public/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', profile.id)

      if (updateError) throw updateError

      setAvatarUrl(publicUrl)
      toast.success(L('Profilbild aktualisiert', 'Profile picture updated'))
      refreshUser()
    } catch (error: any) {
      toast.error(L('Fehler beim Hochladen: ', 'Error uploading image: ') + error.message)
    } finally {
      setUploadingAvatar(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  if (loading) {
    return (
      <div className="h-[60vh] w-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    )
  }

  // Reusable label/input row — labels narrow & right-aligned on desktop,
  // stacked above on mobile.
  const Field = ({
    label,
    children,
  }: {
    label: string
    children: React.ReactNode
  }) => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4 md:items-center border-b border-slate-100 py-4">
      <label className="text-sm font-semibold text-slate-700 md:col-span-1">{label}</label>
      <div className="md:col-span-2">{children}</div>
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto pb-12">
      {/* Header — back button + page title in brand blue */}
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center hover:bg-blue-100 transition-colors"
          aria-label={L('Zurück', 'Back')}
        >
          <ChevronLeft className="w-5 h-5 -ml-0.5" />
        </button>
        <h1 className="text-2xl md:text-3xl font-bold text-[#0064E0]">
          {L('Stammdaten', 'Personal Data')}
        </h1>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 md:p-10">
        {/* Avatar */}
        <div className="flex flex-col items-center justify-center mb-8">
          <div className="relative w-28 h-28 rounded-full overflow-hidden mb-3 border-[3px] border-white shadow-md ring-1 ring-slate-100 shrink-0">
            {avatarUrl ? (
              <Image src={avatarUrl} alt={L('Profilbild', 'Avatar')} width={112} height={112} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl font-black text-white bg-blue-500">
                {formData.first_name.charAt(0) || profile?.full_name?.charAt(0) || '?'}
              </div>
            )}
            {uploadingAvatar && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-white" />
              </div>
            )}
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingAvatar}
            className="inline-flex items-center gap-1.5 text-blue-600 font-semibold text-sm hover:text-blue-700 transition-colors disabled:opacity-50"
          >
            <Camera className="w-4 h-4" />
            {L('Profilbild ändern', 'Edit profile picture')}
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />
        </div>

        {/* Form fields — uniform input styling, label/input grid */}
        <div className="border-t border-slate-100">
          <Field label={L('Vorname', 'First name')}>
            <input
              type="text"
              name="first_name"
              value={formData.first_name}
              onChange={handleInputChange}
              className="w-full text-sm bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-700 font-medium placeholder:text-slate-300"
              placeholder={L('Vorname', 'First name')}
            />
          </Field>

          <Field label={L('Nachname', 'Last name')}>
            <input
              type="text"
              name="last_name"
              value={formData.last_name}
              onChange={handleInputChange}
              className="w-full text-sm bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-700 font-medium placeholder:text-slate-300"
              placeholder={L('Nachname', 'Last name')}
            />
          </Field>

          <Field label={L('E-Mail', 'Email')}>
            <input
              type="email"
              name="email"
              value={formData.email}
              disabled
              className="w-full text-sm bg-slate-100 px-3 py-2 rounded-lg border border-slate-200 outline-none text-slate-500 font-medium cursor-not-allowed"
              placeholder="email@example.com"
            />
          </Field>

          <Field label={L('Telefon', 'Phone')}>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              className="w-full text-sm bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-700 font-medium placeholder:text-slate-300"
              placeholder="0175..."
            />
          </Field>

          <Field label={L('Geschlecht', 'Gender')}>
            <select
              name="gender"
              value={formData.gender}
              onChange={handleInputChange}
              className="w-full text-sm bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-700 font-medium"
            >
              <option value="">{L('Bitte wählen', 'Please choose')}</option>
              <option value="male">{L('Männlich', 'Male')}</option>
              <option value="female">{L('Weiblich', 'Female')}</option>
              <option value="other">{L('Divers', 'Other')}</option>
            </select>
          </Field>

          <Field label={L('Über mich', 'Bio')}>
            <textarea
              name="bio"
              rows={3}
              value={formData.bio}
              onChange={handleInputChange}
              className="w-full text-sm bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-700 font-medium placeholder:text-slate-300 resize-none"
              placeholder={L('Kurze Beschreibung', 'Short description')}
            />
          </Field>
        </div>

        {/* Buttons — auto-width, side-by-side on desktop */}
        <div className="mt-8 flex flex-col sm:flex-row sm:justify-end gap-3">
          <form action="/auth/signout" method="post" className="sm:order-1">
            <button
              type="submit"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl border border-red-200 bg-white text-red-600 font-semibold text-sm hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-4 h-4" /> {L('Abmelden', 'Logout')}
            </button>
          </form>
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full sm:w-auto sm:order-2 inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {L('Speichert…', 'Saving…')}
              </>
            ) : (
              L('Profil speichern', 'Save profile')
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
