'use client'

import React, { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'

interface UploadBottomSheetProps {
  isOpen: boolean
  onClose: () => void
  shiftId: string | null
}

export function UploadBottomSheet({ isOpen, onClose, shiftId }: UploadBottomSheetProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const supabase = createClient()

  if (!isOpen) return null

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !shiftId) return

    setUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${shiftId}-${Math.random()}.${fileExt}`
      const filePath = `${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('shift-attachments')
        .upload(filePath, file)

      if (uploadError) {
        throw uploadError
      }

      toast.success('Attachment uploaded successfully')
      onClose()
    } catch (error: any) {
      toast.error(error.message || 'Error uploading file')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/40 z-[60] transition-opacity" 
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-[70] bg-white rounded-t-3xl shadow-2xl transform transition-transform duration-300 animate-in slide-in-from-bottom-full pb-8 pt-4 px-6 max-w-md mx-auto">
        <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6" />
        
        <h3 className="text-[20px] font-bold text-gray-900 mb-6">
          Upload Attachments
        </h3>

        <input 
          type="file" 
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept="image/*,.pdf,.doc,.docx"
        />

        <div className="space-y-3">
          <button 
            onClick={handleUploadClick}
            disabled={uploading}
            className="w-full flex items-center justify-center gap-2 bg-[#0064E0] text-white py-4 rounded-xl font-semibold text-[15px] hover:bg-[#0050B3] transition-colors disabled:opacity-50"
          >
            <Plus className="w-5 h-5" />
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
          
          <button 
            onClick={onClose}
            disabled={uploading}
            className="w-full py-4 text-gray-700 bg-white border-2 border-gray-200 rounded-xl font-semibold text-[15px] hover:bg-gray-50 hover:border-gray-300 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </>
  )
}
