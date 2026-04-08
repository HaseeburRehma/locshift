'use client'

import React, { useState } from 'react'
import { ChevronLeft, GraduationCap, Award, CheckCircle2, Shield, Plus, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/user-context'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'

export default function QualificationsPage() {
  const router = useRouter()
  const { profile } = useUser()

  const qualifications = [
    { id: '1', title: 'Advanced Railway Logistics', issuer: 'DB Academy', date: '2023-12-15', status: 'Active' },
    { id: '2', title: 'Safety & Security Protcols', issuer: 'ISO Certified', date: '2024-01-20', status: 'Renewed' },
    { id: '3', title: 'Operational Lead (Lvl 2)', issuer: 'LokShift Internal', date: '2024-02-10', status: 'Standard' }
  ]

  return (
    <div className="bg-[#FAFBFF] md:bg-transparent min-h-screen -mx-4 -mt-8 px-4 py-8 space-y-8">
      
      {/* Header */}
      <div className="flex items-center justify-between relative px-2 mb-4">
        <button onClick={() => router.back()} className="w-10 h-10 bg-white shadow-sm border border-slate-100 text-slate-400 rounded-2xl flex items-center justify-center active:scale-95 transition-all">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-black text-slate-900 absolute left-1/2 -translate-x-1/2">Qualifications</h1>
        <button className="w-10 h-10 bg-blue-600 shadow-lg shadow-blue-200 text-white rounded-2xl flex items-center justify-center active:scale-95 transition-all">
          <Plus className="w-6 h-6" />
        </button>
      </div>

      {/* Hero Achievement Card */}
      <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-48 h-48 -mr-16 -mt-16 bg-white opacity-10 rounded-full blur-2xl" />
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-20 h-20 rounded-[2rem] bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-xl">
            <Award className="w-10 h-10 text-white" />
          </div>
          <div className="space-y-1">
             <h4 className="text-2xl font-black">Level 2 Personnel</h4>
             <p className="text-indigo-100 text-xs font-bold uppercase tracking-widest opacity-80">Certified LokShift Specialist</p>
          </div>
        </div>
      </div>

      {/* Qualifications List */}
      <div className="space-y-4 px-1">
        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 px-2 opacity-60">Verified Credentials</h3>
        
        <div className="space-y-3">
          {qualifications.map((qual) => (
            <div key={qual.id} className="group bg-white p-5 rounded-[2.5rem] border border-slate-50 shadow-sm flex items-center gap-5 active:scale-[0.98] transition-all">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-inner shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1.5">
                   <h5 className="font-black text-slate-900 text-sm truncate leading-none">{qual.title}</h5>
                   <Shield className="w-3 h-3 text-emerald-500 shrink-0" />
                </div>
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                   <span>{qual.issuer}</span>
                   <span className="opacity-20">•</span>
                   <span>{qual.date}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Verification Shield */}
      <div className="flex items-center gap-4 p-8 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 bg-emerald-50 rounded-full opacity-50" />
        <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 shrink-0 relative">
          <Shield className="w-7 h-7" />
        </div>
        <div className="space-y-1">
          <p className="text-xs font-black text-slate-900 leading-none">Security Cleared</p>
          <p className="text-[10px] font-medium text-slate-500 leading-tight">All certifications have been manually verified by system administrators.</p>
        </div>
      </div>

    </div>
  )
}
