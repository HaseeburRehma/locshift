'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Mail, Phone, ChevronRight, CheckCircle2, ChevronLeft } from 'lucide-react'
import OtpInput from './OtpInput'
import PasswordInput from './PasswordInput'
import { useTranslation } from '@/lib/i18n'

export default function ForgotPasswordFlow() {
  const { t } = useTranslation()
  const [step, setStep] = useState(1) // 1: Verify Identity, 2: OTP, 3: New Password, 4: Success
  const [method, setMethod] = useState<'email' | 'phone' | null>(null)
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const handleSelectMethod = (m: 'email' | 'phone') => {
    setMethod(m)
    setStep(2)
    handleSendResetEmail()
  }

  const handleSendResetEmail = async () => {
    if (!email) {
      toast.info('Please enter your email first.')
      setStep(1)
      return
    }
    
    setLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/forgot-password`,
      })
      if (error) throw error
      toast.success('Verification code sent!')
    } catch (err: any) {
      toast.error(err.message || 'Error sending reset email')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (otp.length < 6) return
    
    setLoading(true)
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'recovery'
      })
      if (error) throw error
      
      setStep(3)
      toast.success('OTP verified!')
    } catch (err: any) {
      toast.error(err.message || 'Invalid code')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdatePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error('Passwords must match')
      return
    }
    
    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      setStep(4)
      toast.success('Password updated successfully!')
    } catch (err: any) {
      toast.error(err.message || 'Error updating password')
    } finally {
      setLoading(false)
    }
  }

  return ( step !== 4 ? (
    <div className="w-full max-w-md mx-auto flex flex-col min-h-[90vh] bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-2 pt-4 pb-6">
        <button 
          onClick={() => step > 1 ? setStep(step - 1) : window.history.back()}
          className="p-2 text-[#0064E0] hover:bg-blue-50 rounded-full transition-colors flex items-center justify-center"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <button 
          onClick={() => window.location.href = '/'}
          className="text-[#0064E0] text-[15px] font-medium px-4 py-2 hover:bg-blue-50 rounded-full transition-colors"
        >
          Cancel
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center px-6">
        <div className="mb-10 relative w-40 h-10 mt-4">
          <Image src="/logo-3.png" alt="LokShift" fill className="object-contain" priority />
        </div>

      {step === 1 && (
        <div className="w-full space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-gray-900">{t('auth.verify_identity')}</h2>
            <p className="text-sm text-gray-500">{t('auth.verify_desc')}</p>
          </div>

          <div className="space-y-4 flex flex-col items-center w-full pb-8">
            <div className="space-y-2 w-full">
              <label htmlFor="email" className="text-sm font-semibold text-gray-700 ml-1">{t('auth.enter_email')}</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                className="w-full h-14 px-4 border border-gray-200 rounded-xl outline-none focus:border-[#0064E0] transition-all text-[15px]"
              />
            </div>

            <button
              onClick={() => handleSelectMethod('email')}
              disabled={!email}
              className="w-full h-16 flex items-center justify-between px-4 border-2 border-[#E5E7EB] rounded-xl hover:border-[#0064E0] hover:bg-blue-50/10 transition-all group disabled:opacity-50 active:scale-[0.98]"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-50 rounded-lg group-hover:bg-[#0064E0]/10">
                  <Mail size={20} className="text-gray-400 group-hover:text-[#0064E0]" />
                </div>
                <span className="font-semibold text-gray-700 group-hover:text-gray-900">Email</span>
              </div>
              <ChevronRight size={20} className="text-gray-300 group-hover:text-[#0064E0]" />
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="w-full space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-gray-900">{t('auth.enter_otp')}</h2>
            <p className="text-sm text-gray-500 max-w-[280px] mx-auto leading-relaxed">
              {t('auth.otp_validity')}
            </p>
          </div>

          <form onSubmit={handleVerifyOtp} className="space-y-6">
            <OtpInput value={otp} onChange={setOtp} />

            <button
              type="submit"
              disabled={loading || otp.length < 6}
              className="w-full h-14 bg-[#0064E0] text-white rounded-[12px] font-semibold text-lg hover:bg-[#0050B3] transition-all disabled:opacity-50"
            >
              {loading ? 'Verifying...' : t('auth.continue')}
            </button>
          </form>
        </div>
      )}

      {step === 3 && (
        <div className="w-full space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-gray-900">{t('auth.new_password')}</h2>
            <p className="text-sm text-gray-500 mx-auto leading-relaxed">
              {t('auth.password_match')}
            </p>
          </div>

          <form onSubmit={handleUpdatePassword} className="space-y-6 flex flex-col items-center w-full">
            <PasswordInput
              id="new-password"
              label="New Password"
              value={newPassword}
              onChange={setNewPassword}
              placeholder="********"
            />

            <PasswordInput
              id="confirm-password"
              label="Confirm New Password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              placeholder="********"
            />

            <button
              type="submit"
              disabled={loading || !newPassword || newPassword !== confirmPassword}
              className="w-full h-14 bg-[#0064E0] text-white rounded-xl font-bold text-[16px] hover:bg-[#0050B3] transition-all disabled:opacity-50"
            >
              {loading ? 'Updating...' : t('auth.continue')}
            </button>
          </form>
        </div>
      )}

      <div className="mt-8 text-center pt-6 border-t border-gray-100 w-full">
        <button 
          onClick={() => step > 1 ? setStep(step - 1) : window.history.back()}
          className="text-gray-500 hover:text-[#0064E0] font-medium text-sm transition-colors"
        >
          {step > 1 ? 'Go Back' : 'Cancel'}
        </button>
      </div>
      </div>
    </div>
  ) : (
    // Step 4 Modal
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-[2px]">
      <div className="w-full max-w-sm bg-white rounded-3xl p-10 flex flex-col items-center text-center shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="mb-6 p-4 bg-green-50 rounded-full">
          <CheckCircle2 size={48} className="text-green-500" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('auth.success_title')}</h2>
        <p className="text-sm text-gray-500 mb-8 leading-relaxed">
          {t('auth.success_desc')}
        </p>
        <Link href="/login" className="w-full">
          <button className="w-full h-14 bg-[#0064E0] text-white rounded-[12px] font-semibold text-lg hover:bg-[#0050B3] transition-all active:scale-95">
            {t('auth.continue')} 
          </button>
        </Link>
      </div>
    </div>
  ))
}
