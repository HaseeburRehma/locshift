'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { ChevronLeft, CheckCircle2 } from 'lucide-react'
import OtpInput from './OtpInput'
import PasswordInput from './PasswordInput'
import type { Session } from '@supabase/supabase-js'

export default function RegisterForm() {
  const [step, setStep] = useState(1)
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  // Store the FULL session from verifyOtp — not just userId
  const [verifiedSession, setVerifiedSession] = useState<Session | null>(null)
  const supabase = createClient()

  const handleSendOtp = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!email) return
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      })
      if (error) throw error
      setStep(2)
      toast.success('Code sent! Check your email.')
    } catch (err: any) {
      toast.error(err.message || 'Error sending code')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (otp.length < 6) return
    setLoading(true)

    let settled = false
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => {
        if (!settled) reject(new Error('Verification timed out. Please try again.'))
      }, 15000)
    )

    const verifyPromise = async (): Promise<Session> => {
      // Try 'email' type first — works for both new and returning users
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'email',
      })
      if (!error && data.session) return data.session

      // Fallback to 'signup' type
      const { data: data2, error: error2 } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'signup',
      })
      if (!error2 && data2.session) return data2.session

      throw error2 || error || new Error('Code is invalid or has expired.')
    }

    try {
      const session = await Promise.race([verifyPromise(), timeoutPromise])
      settled = true
      setVerifiedSession(session)
      setStep(3)
      toast.success('Email confirmed!')
    } catch (err: any) {
      settled = true
      toast.error(err?.message || 'Invalid or expired code.')
    } finally {
      setLoading(false)
    }
  }

  const handleCompleteSetup = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!fullName || !password || !verifiedSession) return
    setLoading(true)

    try {
      // Delegate EVERYTHING to the server — no browser auth locks, no RLS, no timing issues.
      // The admin client on the server sets the password and upserts the profile directly.
      const res = await fetch('/api/auth/complete-registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: verifiedSession.user.id,
          fullName,
          email,
          password,
        }),
      })

      const body = await res.json()

      if (!res.ok) {
        throw new Error(body.error || 'Setup failed. Please try again.')
      }

      toast.success('Welcome to LokShift!')
      // Short delay so the session cookie from verifyOtp has time to propagate
      setTimeout(() => { window.location.replace('/dashboard') }, 600)

    } catch (err: any) {
      toast.error(err.message || 'Error completing setup. Please try again.')
    } finally {
      setLoading(false)
    }
  }


  const passwordStrength =
    password.length === 0 ? 0
      : password.length < 6 ? 1
        : password.length < 10 ? 2
          : password.length < 14 ? 3
            : 4

  return (
    <div className="w-full max-w-md mx-auto flex flex-col min-h-[100dvh] bg-white pt-4">
      <div className="flex items-center justify-between px-4 h-12">
        <button
          onClick={() => (step > 1 ? setStep(step - 1) : window.history.back())}
          className="w-10 h-10 flex items-center justify-center text-[#0064E0] bg-blue-50/50 rounded-full hover:bg-blue-50 transition-colors"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <button onClick={() => { window.location.href = '/' }}
          className="text-[#0064E0] text-[15px] font-semibold px-4 py-2 hover:bg-blue-50 rounded-full transition-colors">
          Cancel
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center px-8 pt-8">
        <div className="mb-12">
          <div className="relative w-48 h-10">
            <Image src="/logo-3.png" alt="LokShift" fill className="object-contain" priority />
          </div>
        </div>

        {step === 1 && (
          <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center">
              <h2 className="text-[22px] font-bold text-gray-900 tracking-tight">Signup to continue</h2>
            </div>
            <form onSubmit={handleSendOtp} className="space-y-6 w-full">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full h-[58px] px-5 text-[16px] bg-white border border-gray-200 rounded-xl outline-none focus:border-[#0064E0] focus:ring-1 focus:ring-[#0064E0] transition-all placeholder:text-gray-400"
                required />
              <p className="text-[12px] text-gray-400 text-center leading-relaxed px-4">
                By signing up, I accept the LokShift{' '}
                <Link href="/terms" className="text-[#0064E0] font-medium hover:underline">Terms of Services</Link>{' '}
                and acknowledge the{' '}
                <Link href="/privacy" className="text-[#0064E0] font-medium hover:underline">Privacy Policy</Link>.
              </p>
              <button type="submit" disabled={loading || !email}
                className="w-full h-[56px] bg-[#0064E0] text-white rounded-[12px] font-bold text-[17px] hover:bg-[#0050B3] active:scale-[0.98] transition-all disabled:opacity-50">
                {loading ? 'Sending...' : 'Sign up'}
              </button>
            </form>
          </div>
        )}

        {step === 2 && (
          <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center space-y-2">
              <h2 className="text-[22px] font-bold text-gray-900 tracking-tight">We&apos;ve emailed you a code</h2>
              <p className="text-[14px] text-gray-500 leading-relaxed">Enter the 6-digit code we sent to:</p>
              <p className="text-[14px] font-bold text-gray-900">{email}</p>
            </div>
            <form onSubmit={handleVerifyOtp} className="space-y-10 w-full pt-4">
              <OtpInput value={otp} onChange={setOtp} disabled={loading} />
              <button type="submit" disabled={loading || otp.length < 6}
                className="w-full h-[56px] bg-[#0064E0] text-white rounded-[12px] font-bold text-[17px] hover:bg-[#0050B3] active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg shadow-blue-100">
                {loading ? 'Verifying...' : 'Verify Code'}
              </button>
              <button type="button" onClick={() => handleSendOtp()} disabled={loading}
                className="w-full text-center text-[14px] text-[#0064E0] font-semibold py-2 hover:underline disabled:opacity-50">
                Didn&apos;t receive a code? Resend
              </button>
            </form>
          </div>
        )}

        {step === 3 && (
          <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center gap-2 mb-1">
                <h2 className="text-[22px] font-bold text-gray-900 tracking-tight">Email address confirmed</h2>
                <div className="bg-emerald-500 rounded-full p-0.5">
                  <CheckCircle2 className="h-5 w-5 text-white" />
                </div>
              </div>
              <p className="text-[14px] text-gray-500 font-medium">Finish setting up your account</p>
            </div>
            <form onSubmit={handleCompleteSetup} className="space-y-6 w-full">
              <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-gray-900 ml-1">Email</label>
                <input type="email" value={email} disabled
                  className="w-full h-[54px] px-5 text-[15px] bg-gray-50 border border-gray-100 rounded-xl text-gray-500 cursor-not-allowed" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-gray-900 ml-1">Full Name</label>
                <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full h-[54px] px-5 text-[15px] border border-gray-200 rounded-xl outline-none focus:border-[#0064E0] focus:ring-1 focus:ring-[#0064E0] transition-all"
                  required />
              </div>
              <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-gray-900 ml-1">Password</label>
                <PasswordInput id="reg-pass" label="" value={password} onChange={setPassword}
                  placeholder="Create a secure password" required />
                <div className="flex gap-1.5 px-0.5 pt-1">
                  {[1, 2, 3, 4].map((level) => (
                    <div key={level} className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${passwordStrength >= level
                        ? level <= 1 ? 'bg-red-400' : level <= 2 ? 'bg-yellow-400' : level <= 3 ? 'bg-blue-400' : 'bg-emerald-500'
                        : 'bg-gray-100'
                      }`} />
                  ))}
                </div>
                {password.length > 0 && (
                  <p className={`text-[11px] font-bold text-center mt-1 ${passwordStrength <= 1 ? 'text-red-500' : passwordStrength <= 2 ? 'text-yellow-600' : passwordStrength <= 3 ? 'text-blue-600' : 'text-emerald-600'
                    }`}>
                    {passwordStrength <= 1 ? 'Too short' : passwordStrength <= 2 ? 'Fair' : passwordStrength <= 3 ? 'Good' : 'Strong'}
                  </p>
                )}
              </div>
              <p className="text-[11px] text-gray-400 text-center leading-relaxed pt-2">
                By signing up, I accept the LokShift{' '}
                <Link href="/terms" className="text-[#0064E0] font-medium hover:underline">Terms of Services</Link>{' '}
                and acknowledge the{' '}
                <Link href="/privacy" className="text-[#0064E0] font-medium hover:underline">Privacy Policy</Link>.
              </p>
              <button type="submit" disabled={loading || !fullName || password.length < 6}
                className="w-full h-[56px] bg-[#0064E0] text-white rounded-[12px] font-bold text-[17px] hover:bg-[#0050B3] active:scale-[0.98] transition-all disabled:opacity-50">
                {loading ? 'Saving...' : 'Continue'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}