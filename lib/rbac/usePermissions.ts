'use client'

import { useUser } from "@/lib/user-context"
import { Permission, hasPermission, canAccess } from "./permissions"

export function usePermissions() {
  const { role, isLoading: loading } = useUser()
  
  return {
    can: (permission: Permission) => hasPermission(role, permission),
    canAny: (permissions: Permission[]) => canAccess(role, permissions),
    role,
    loading,
    isAdmin: role === 'admin',
    isManager: role === 'manager',
    isDisponent: role === 'disponent',
    isTechnician: role === 'technician',
    isPartner: ['partner_admin', 'partner_agent'].includes(role),
    isViewer: role === 'viewer',
  }
}
