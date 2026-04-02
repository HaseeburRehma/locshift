import React from 'react'

interface StatusBadgeProps {
  status: 'approved' | 'pending' | 'rejected'
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const styles = {
    approved: 'bg-green-100 text-green-700 border-green-200',
    pending:  'bg-amber-100  text-amber-700  border-amber-200',
    rejected: 'bg-red-100    text-red-700    border-red-200',
  }

  return (
    <span className={`
      px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border
      ${styles[status]}
    `}>
      {status}
    </span>
  )
}
