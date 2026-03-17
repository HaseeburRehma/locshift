'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { User, Shield, Briefcase, UserCog } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'
import { toast } from 'sonner'
import { useTranslation } from '@/lib/i18n'
import { CreateUserModal } from './CreateUserModal'
import { Plus } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then(res => res.json())

export function UserManagementPanel() {
  const { locale } = useTranslation()
  const [updating, setUpdating] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const { data: users, error, mutate } = useSWR('/api/users', fetcher)

  const deleteUser = async (userId: string) => {
    if (!confirm(locale === 'en' ? 'Are you sure you want to delete this user?' : 'Möchten Sie diesen Benutzer wirklich löschen?')) return
    
    setUpdating(userId)
    try {
      const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success(locale === 'en' ? 'User deleted' : 'Benutzer gelöscht')
        mutate()
      } else {
        const err = await res.json()
        throw new Error(err.error || 'Failed to delete')
      }
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setUpdating(null)
    }
  }

  const handleRoleChange = async (userId: string, newRole: string) => {
    setUpdating(userId)
    try {
      const res = await fetch('/api/users/role', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole })
      })

      if (res.ok) {
        toast.success(locale === 'en' ? 'Role updated successfully' : 'Rolle erfolgreich aktualisiert')
        mutate()
      } else {
        throw new Error('Failed to update')
      }
    } catch (err) {
      toast.error(locale === 'en' ? 'Failed to update user role' : 'Fehler beim Aktualisieren der Rolle')
    } finally {
      setUpdating(null)
    }
  }

  if (error) return <div className="text-red-500">Failed to load users</div>
  if (!users) return <div className="flex justify-center p-8"><Spinner /></div>

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Shield className="w-4 h-4 text-purple-600" />
      case 'manager': return <Briefcase className="w-4 h-4 text-blue-600" />
      case 'technician': return <UserCog className="w-4 h-4 text-orange-600" />
      default: return <User className="w-4 h-4 text-slate-600" />
    }
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'manager': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'technician': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'partner_admin': return 'bg-emerald-100 text-emerald-800 border-emerald-200'
      case 'partner_agent': return 'bg-teal-100 text-teal-800 border-teal-200'
      case 'disponent': return 'bg-indigo-100 text-indigo-800 border-indigo-200'
      default: return 'bg-slate-100 text-slate-800 border-slate-200'
    }
  }

  return (
    <Card className="shadow-sm border-slate-200">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-slate-800" />
            {locale === 'en' ? 'User Roles & Access' : 'Benutzerrollen & Zugriff'}
          </div>
          <Button 
            onClick={() => setIsModalOpen(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white gap-2 h-9 rounded-xl"
          >
            <Plus className="w-4 h-4" />
            {locale === 'en' ? 'Add New User' : 'Benutzer hinzufügen'}
          </Button>
        </CardTitle>
        <CardDescription>
          {locale === 'en' ? 'Manage roles for all registered users on the platform.' : 'Verwalten Sie die Rollen für alle registrierten Benutzer auf der Plattform.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border border-slate-200">
          <div className="grid grid-cols-12 gap-4 p-4 font-medium text-sm text-slate-500 border-b bg-slate-50">
            <div className="col-span-4">User</div>
            <div className="col-span-4">Current Role</div>
            <div className="col-span-4 justify-self-end">Change Role</div>
          </div>
          <div className="divide-y divide-slate-100">
            {Array.isArray(users) ? (
              users.map((user: any) => (
                <div key={user.id} className="grid grid-cols-12 gap-4 p-4 items-center">
                  <div className="col-span-4">
                    <div className="font-medium text-slate-900">{user.full_name || 'Anonymous User'}</div>
                    <div className="text-xs text-slate-500">{user.email || 'No email associated'}</div>
                  </div>
                  <div className="col-span-4 flex items-center gap-2">
                    <Badge variant="outline" className={`flex items-center gap-1.5 px-2 py-0.5 ${getRoleBadge(user.role)}`}>
                      {getRoleIcon(user.role)}
                      <span className="capitalize">{user.role?.replace('_', ' ') || 'Viewer'}</span>
                    </Badge>
                  </div>
                  <div className="col-span-4 justify-self-end">
                    <select 
                      title={locale === 'en' ? 'Select role' : 'Rolle auswählen'}
                      className="text-sm border rounded-md px-3 py-1.5 bg-slate-50 min-w-[140px]"
                      value={user.role || 'viewer'}
                      onChange={(e) => handleRoleChange(user.id, e.target.value)}
                      disabled={updating === user.id}
                    >
                      <option value="viewer">Viewer (Default)</option>
                      <option value="admin">Admin</option>
                      <option value="manager">Manager</option>
                      <option value="disponent">Disponent (Dispatcher)</option>
                      <option value="technician">Technician</option>
                      <option value="partner_admin">Partner Admin</option>
                      <option value="partner_agent">Partner Agent</option>
                    </select>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                      onClick={() => deleteUser(user.id)}
                      disabled={updating === user.id}
                      title={locale === 'en' ? 'Delete user' : 'Benutzer löschen'}
                    >
                      <Plus className="w-4 h-4 rotate-45" />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-muted-foreground italic">
                {users?.error || 'No users found or session expired.'}
              </div>
            )}
          </div>
        </div>
      </CardContent>
      <CreateUserModal 
        open={isModalOpen} 
        onClose={(success) => {
          setIsModalOpen(false)
          if (success) mutate()
        }} 
      />
    </Card>
  )
}
