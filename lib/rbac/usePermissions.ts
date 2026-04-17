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
    isDisponent: role === 'disponent' || (role as string) === 'dispatcher',
    isTechnician: role === 'technician',
    isPartner: role === 'partner_admin' || role === 'partner_agent',
    isViewer: (role as string) === 'viewer',
  }
}
