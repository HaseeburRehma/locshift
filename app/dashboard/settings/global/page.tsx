'use client'

import React, { useState } from 'react'
import { 
    Clock, 
    Plus, 
    Trash2, 
    Edit2, 
    ChevronLeft,
    ShieldCheck,
    BarChart
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useWorkModels } from '@/hooks/useWorkModels'
import { WorkModelForm } from '@/components/dashboard/WorkModelForm'
import { WorkingTimeModel } from '@/lib/types'
import Link from 'next/link'
import { useUser } from '@/lib/user-context'
import { redirect } from 'next/navigation'

export default function GlobalSettingsPage() {
    const { isAdmin, isLoading: userLoading } = useUser()
    const { models, loading: modelsLoading, createModel, updateModel, deleteModel } = useWorkModels()
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [editingModel, setEditingModel] = useState<WorkingTimeModel | null>(null)

    // RBAC: Strict Admin only for global system settings (Section 4.1)
    if (!userLoading && !isAdmin) redirect('/dashboard')

    const handleCreate = async (data: Partial<WorkingTimeModel>) => {
        await createModel(data)
    }

    const handleUpdate = async (data: Partial<WorkingTimeModel>) => {
        if (editingModel) {
            await updateModel(editingModel.id, data)
        }
    }

    const openEdit = (model: WorkingTimeModel) => {
        setEditingModel(model)
        setIsFormOpen(true)
    }

    const openCreate = () => {
        setEditingModel(null)
        setIsFormOpen(true)
    }

    if (userLoading || modelsLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 animate-pulse">Syncing Global Parameters...</p>
            </div>
        )
    }

    return (
        <div className="space-y-10 pb-20">
            {/* Header: Operations Console Breadcrumb Style */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-4">
                    <Link 
                        href="/dashboard/settings" 
                        className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 transition-colors group"
                    >
                        <ChevronLeft className="h-3 w-3 group-hover:-translate-x-1 transition-transform" />
                        Settings Hub
                    </Link>
                    <div className="space-y-2">
                        <h1 className="text-4xl font-black tracking-tighter flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-xl">
                                <Clock className="h-6 w-6" />
                            </div>
                            Global Parameters
                        </h1>
                        <p className="text-muted-foreground font-medium max-w-2xl">
                            Configure mission-critical working time models and system-wide operational constants (Section 4.1).
                        </p>
                    </div>
                </div>

                <Button 
                    onClick={openCreate}
                    className="rounded-2xl bg-blue-600 font-bold uppercase tracking-widest text-[11px] h-12 px-6 shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95 group"
                >
                    <Plus className="h-4 w-4 mr-2 group-hover:rotate-90 transition-transform duration-300" />
                    New Model
                </Button>
            </div>

            {/* Grid of Work Models */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {models.map((model) => (
                    <div 
                        key={model.id}
                        className="group bg-white rounded-[2rem] border border-slate-100 p-8 shadow-sm hover:shadow-xl hover:shadow-slate-100 transition-all border-l-[6px] border-l-blue-600"
                    >
                        <div className="flex flex-col h-full space-y-6">
                            <div className="flex items-start justify-between">
                                <div className="space-y-1">
                                    <h3 className="text-xl font-bold tracking-tight text-slate-900 leading-none">
                                        {model.name}
                                    </h3>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-blue-600/60">
                                        Active Work Model
                                    </p>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        onClick={() => openEdit(model)}
                                        className="h-8 w-8 rounded-xl hover:bg-blue-50 text-slate-400 hover:text-blue-600"
                                    >
                                        <Edit2 className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        onClick={() => deleteModel(model.id)}
                                        className="h-8 w-8 rounded-xl hover:bg-red-50 text-slate-400 hover:text-red-500"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </div>

                            <div className="bg-slate-50/50 rounded-2xl p-6 border border-slate-50 space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Target Hours</span>
                                    <span className="text-xl font-black text-slate-900 tracking-tighter">
                                        {model.target_hours_per_week}h
                                        <span className="text-[10px] text-slate-400 font-bold tracking-normal ml-1">/ week</span>
                                    </span>
                                </div>
                                <div className="h-[2px] w-full bg-blue-100 rounded-full overflow-hidden">
                                     <div className="h-full bg-blue-600 w-full" />
                                </div>
                                <div className="flex items-center gap-3">
                                   <div className="h-8 w-8 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-blue-600 shadow-sm">
                                      <ShieldCheck className="h-4 w-4" />
                                   </div>
                                   <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Standardized Policy</span>
                                </div>
                            </div>

                            <p className="text-sm text-slate-500 font-medium leading-relaxed italic">
                                {model.description || 'No description provided.'}
                            </p>

                            <div className="pt-4 mt-auto">
                                <div className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-300">
                                    Last Updated: {new Date(model.updated_at).toLocaleDateString()}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}

                {models.length === 0 && (
                    <div className="col-span-full py-20 bg-slate-50/30 rounded-[3rem] border border-dashed border-slate-200 flex flex-col items-center justify-center text-center space-y-4">
                        <div className="h-16 w-16 rounded-[2rem] bg-white text-slate-300 flex items-center justify-center shadow-sm">
                            <BarChart className="h-8 w-8" />
                        </div>
                        <div className="space-y-1">
                             <p className="font-bold text-slate-900">No work models registered</p>
                             <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Create the first organizational model to begin.</p>
                        </div>
                        <Button 
                            variant="outline" 
                            onClick={openCreate}
                            className="rounded-xl border-slate-200 font-bold uppercase tracking-widest text-[10px] h-10 px-6 hover:bg-white"
                        >
                            <Plus className="h-3.5 w-3.5 mr-2" /> Initialize Models
                        </Button>
                    </div>
                )}
            </div>

            <WorkModelForm
                model={editingModel}
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                onSubmit={editingModel ? handleUpdate : handleCreate}
            />
        </div>
    )
}
