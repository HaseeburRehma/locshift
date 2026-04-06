'use client'

import React, { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ChevronLeft, LogOut, Loader2, ImagePlus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useUser } from '@/lib/user-context'
import { toast } from 'sonner'

export default function PersonalDataPage() {
  const router = useRouter()
  const { profile, refreshUser } = useUser()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

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
        const { data, error } = await supabase
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSave = async () => {
    if (!profile) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from('profiles')
        // Automatically rebuild full_name if first/last changes
        .update({
          ...formData,
          full_name: `${formData.first_name} ${formData.last_name}`.trim(),
        })
        .eq('id', profile.id)

      if (error) throw error
      
      toast.success('Profile updated successfully')
      await refreshUser()
    } catch (err: any) {
      toast.error('Failed to update profile: ' + err.message)
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
      const filePath = `public/${fileName}` // Must be unique across users or grouped by folder

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
      toast.success('Profile picture updated successfully')
      refreshUser()
    } catch (error: any) {
      toast.error('Error uploading image: ' + error.message)
    } finally {
      setUploadingAvatar(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  if (loading) {
    return <div className="h-screen w-full flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
  }

  return (
    <div className="bg-white min-h-screen pb-24 md:hidden flex flex-col relative -mx-4 -mt-8 px-4 py-6">
      
      {/* Header */}
      <div className="flex items-center justify-center relative mb-8">
        <button onClick={() => router.back()} className="absolute left-0 w-8 h-8 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
          <ChevronLeft className="w-5 h-5 -ml-0.5" />
        </button>
        <h1 className="text-sm font-bold text-slate-800">Personal Data</h1>
      </div>

      {/* Avatar Section */}
      <div className="flex flex-col items-center justify-center mb-8">
        <div className="relative w-24 h-24 rounded-full bg-amber-400 overflow-hidden mb-3 border-[3px] border-white shadow-sm shrink-0">
          {avatarUrl ? (
            <Image src={avatarUrl} alt="Avatar" width={96} height={96} className="w-full h-full object-cover" />
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
          className="text-blue-600 font-bold text-sm"
        >
          Edit profile picture
        </button>
        <input 
          type="file" 
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          className="hidden"
        />
      </div>

      {/* Form Fields container mimicking mobile list layout */}
      <div className="space-y-0.5 border-t border-slate-100 flex-1">
        
        <div className="flex items-center border-b border-slate-100 py-4">
          <label className="w-24 text-sm font-medium text-slate-800">First Name</label>
          <input 
            type="text" 
            name="first_name" 
            value={formData.first_name} 
            onChange={handleInputChange}
            className="flex-1 text-sm bg-transparent outline-none text-slate-500 font-medium placeholder:text-slate-300"
            placeholder="First Name"
          />
        </div>

        <div className="flex items-center border-b border-slate-100 py-4">
          <label className="w-24 text-sm font-medium text-slate-800">Last Name</label>
          <input 
            type="text" 
            name="last_name" 
            value={formData.last_name} 
            onChange={handleInputChange}
            className="flex-1 text-sm bg-transparent outline-none text-slate-500 font-medium placeholder:text-slate-300"
            placeholder="Last Name"
          />
        </div>

        <div className="flex items-center border-b border-slate-100 py-4">
          <label className="w-24 text-sm font-medium text-slate-800">E-mail</label>
          <input 
            type="email" 
            name="email" 
            value={formData.email}
            disabled
            className="flex-1 text-sm bg-transparent outline-none text-slate-400 font-medium"
            placeholder="email@example.com"
          />
        </div>

        <div className="flex items-center border-b border-slate-100 py-4">
          <label className="w-24 text-sm font-medium text-slate-800">Mobile</label>
          <input 
            type="tel" 
            name="phone" 
            value={formData.phone} 
            onChange={handleInputChange}
            className="flex-1 text-sm bg-transparent outline-none text-slate-500 font-medium placeholder:text-slate-300"
            placeholder="0175..."
          />
        </div>

        <div className="flex items-center border-b border-slate-100 py-4">
          <label className="w-24 text-sm font-medium text-slate-800">Gender</label>
          <input 
            type="text" 
            name="gender" 
            value={formData.gender} 
            onChange={handleInputChange}
            className="flex-1 text-sm bg-transparent outline-none text-slate-500 font-medium placeholder:text-slate-300"
            placeholder="Male / Female / Other"
          />
        </div>

        <div className="flex items-center border-b border-slate-100 py-4">
          <label className="w-24 text-sm font-medium text-slate-800">Bio</label>
          <input 
            type="text" 
            name="bio" 
            value={formData.bio} 
            onChange={handleInputChange}
            className="flex-1 text-sm bg-transparent outline-none text-slate-500 font-medium placeholder:text-slate-300"
            placeholder="Bio"
          />
        </div>

      </div>

      <div className="mt-8 flex flex-col gap-4">
         <button 
           onClick={handleSave} 
           disabled={saving}
           className="w-full bg-blue-600 text-white py-4 rounded-xl flex items-center justify-center font-bold text-lg active:scale-[0.98] transition-transform shadow-sm"
         >
           {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Profile'}
         </button>
         
         <form action="/auth/signout" method="post">
           <button type="submit" className="w-full bg-[#E71A1A] text-white py-4 rounded-xl flex items-center justify-center gap-2 font-bold text-lg active:scale-[0.98] transition-transform shadow-sm">
             <LogOut className="w-5 h-5" /> Logout
           </button>
         </form>
      </div>

    </div>
  )
}
