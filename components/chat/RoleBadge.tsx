import React from 'react'
import { UserRole } from '@/lib/types'

interface RoleBadgeProps {
  role: UserRole
}

export function RoleBadge({ role }: RoleBadgeProps) {
  const getBadgeStyles = () => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-700'
      case 'manager':
      case 'disponent':
        return 'bg-blue-100 text-blue-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const getRoleLabel = () => {
    if (role === 'admin') return 'Administrator'
    if (role === 'manager' || role === 'disponent') return 'Dispatcher'
    return 'Employee'
  }

  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${getBadgeStyles()}`}>
      {getRoleLabel()}
    </span>
  )
}
