'use client'

import { ReactNode } from "react"
import { usePermissions } from "@/lib/rbac/usePermissions"
import { Permission } from "@/lib/rbac/permissions"

interface PermissionGateProps {
  permission?: Permission
  permissions?: Permission[]
  requireAll?: boolean
  fallback?: ReactNode
  children: ReactNode
}

export function PermissionGate({
  permission,
  permissions,
  requireAll = false,
  fallback = null,
  children
}: PermissionGateProps) {
  const { can, canAny, loading } = usePermissions()

  if (loading) return null;

  let hasAccess = false

  if (permission) {
    hasAccess = can(permission)
  } else if (permissions) {
    if (requireAll) {
      hasAccess = permissions.every(p => can(p))
    } else {
      hasAccess = canAny(permissions)
    }
  }

  if (!hasAccess) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
