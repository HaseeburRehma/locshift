'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Loader2, UserPlus, Shield, Mail, Key, Eye, EyeOff } from 'lucide-react'
import { useTranslation } from '@/lib/i18n'

interface CreateUserModalProps {
  open: boolean
  onClose: (success?: boolean) => void
}

export function CreateUserModal({ open, onClose }: CreateUserModalProps) {
  const { locale } = useTranslation()
  const L = (de: string, en: string) => (locale === 'de' ? de : en)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    fullName: '',
    role: 'viewer',
    password: '',
  })

  // Locale-aware role labels (was a module-level constant before).
  const ROLES = [
    { value: 'admin',         label: L('Verwalter',          'Administrator') },
    { value: 'manager',       label: L('Manager',            'Manager') },
    { value: 'disponent',     label: L('Disponent',          'Disponent (Dispatcher)') },
    { value: 'technician',   label: L('Techniker',           'Technician') },
    { value: 'partner_admin', label: L('Partner-Admin',      'Partner Admin') },
    { value: 'partner_agent', label: L('Partner-Agent',      'Partner Agent') },
    { value: 'viewer',        label: L('Betrachter',         'Viewer') },
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.email || !formData.password || !formData.role) {
      toast.error(L('Bitte alle Pflichtfelder ausfüllen', 'Please fill in all required fields'))
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await res.json()
      if (res.ok) {
        toast.success(L(`Benutzer ${formData.email} erfolgreich angelegt`, `User ${formData.email} created successfully`))
        setFormData({ email: '', fullName: '', role: 'viewer', password: '' })
        onClose(true)
      } else {
        throw new Error(data.error || L('Benutzer konnte nicht angelegt werden', 'Failed to create user'))
      }
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-purple-600" />
              {L('Neuen Benutzer anlegen', 'Create New User')}
            </DialogTitle>
            <DialogDescription>
              {L(
                'Fügen Sie ein neues Mitglied zur Plattform hinzu. Es kann sich sofort anmelden.',
                'Add a new member to the platform. They will be able to log in immediately.',
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-sm font-semibold">{L('Vollständiger Name', 'Full Name')}</Label>
              <div className="relative">
                <Input
                  id="fullName"
                  placeholder={L('z. B. Max Mustermann', 'e.g. Max Mustermann')}
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="pl-9"
                />
                <Shield className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-semibold">{L('E-Mail-Adresse', 'Email Address')} <span className="text-red-500">*</span></Label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  required
                  placeholder="name@firma.de"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="pl-9"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role" className="text-sm font-semibold">{L('Benutzerrolle', 'User Role')} <span className="text-red-500">*</span></Label>
              <Select
                value={formData.role}
                onValueChange={(v) => setFormData({ ...formData, role: v })}
              >
                <SelectTrigger id="role" className="w-full bg-slate-50 border-slate-200">
                  <SelectValue placeholder={L('Rolle wählen', 'Select a role')} />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-semibold">{L('Initial-Passwort', 'Initial Password')} <span className="text-red-500">*</span></Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="pl-9 pr-10"
                />
                <Key className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground italic">{L('Mindestens 8 Zeichen.', 'Must be at least 8 characters.')}</p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onClose()}>{L('Abbrechen', 'Cancel')}</Button>
            <Button
              type="submit"
              className="bg-purple-600 hover:bg-purple-700 text-white"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {L('Wird angelegt…', 'Creating...')}
                </>
              ) : (
                L('Benutzerkonto anlegen', 'Create User Account')
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
