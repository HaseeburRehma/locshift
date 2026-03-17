'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  flexRender,
  ColumnDef,
  getSortedRowModel,
} from '@tanstack/react-table'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { ExternalLink, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { Lead } from '@/lib/types'
import { LeadStatusBadge, UrgencyBadge } from './LeadStatusBadge'
import { LeadFilters, FilterState } from './LeadFilters'
import { usePermissions } from '@/lib/rbac/usePermissions'
import { EyeOff } from 'lucide-react'

export function LeadsTable({ leads, onRefresh }: { leads: Lead[]; onRefresh?: () => void }) {
  const router = useRouter()
  const { can } = usePermissions()
  const canViewPII = can('leads.view_pii')

  const maskPhone = (phone: string) => {
    if (!phone) return '—'
    if (canViewPII) return phone
    const lastTwo = phone.slice(-2)
    return `+49 *** *** **${lastTwo}`
  }

  const maskEmail = (email: string | null) => {
    if (!email) return '—'
    if (canViewPII) return email
    const [user, domain] = email.split('@')
    return `${user[0]}***@***.${domain.split('.').pop()}`
  }
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    status: 'all',
    urgency: 'all',
    serviceType: 'all',
  })

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const ms = filters.search.toLowerCase()
      const searchMatch = !ms || 
        lead.name.toLowerCase().includes(ms) || 
        lead.phone?.toLowerCase().includes(ms) || 
        lead.city?.toLowerCase().includes(ms) || 
        lead.description?.toLowerCase().includes(ms)
      const statusMatch = filters.status === 'all' || lead.status === filters.status
      const urgMatch = filters.urgency === 'all' || lead.urgency === filters.urgency
      const srvMatch = filters.serviceType === 'all' || lead.service_type === filters.serviceType
      return searchMatch && statusMatch && urgMatch && srvMatch
    })
  }, [leads, filters])

  const columns: ColumnDef<Lead>[] = [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.name}</div>
          <div className="text-xs text-muted-foreground">
            {row.original.city || '—'} {row.original.postcode ? `(${row.original.postcode})` : ''}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'phone',
      header: 'Phone',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {!canViewPII && (
            <span title="Kontaktdaten eingeschränkt">
              <EyeOff className="h-3 w-3 text-muted-foreground" />
            </span>
          )}
          <a 
            href={canViewPII ? `tel:${row.original.phone}` : '#'} 
            className={cn("text-blue-600 hover:underline", !canViewPII && "cursor-default no-underline text-muted-foreground")}
            onClick={(e) => !canViewPII && e.preventDefault()}
          >
            {maskPhone(row.original.phone)}
          </a>
        </div>
      ),
    },
    {
      accessorKey: 'service_type',
      header: 'Service / Job Type',
      cell: ({ row }) => (
        <div>
          <div className="text-sm">{row.original.service_type}</div>
          <div className="text-xs text-muted-foreground">{row.original.job_type}</div>
        </div>
      ),
    },
    {
      accessorKey: 'urgency',
      header: 'Urgency',
      cell: ({ row }) => <UrgencyBadge urgency={row.original.urgency} />,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <LeadStatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'estimated_value',
      header: () => <div className="hidden md:block">Value</div>,
      cell: ({ row }) => <div className="hidden md:block">{row.original.estimated_value || '—'}</div>,
    },
    {
      accessorKey: 'source',
      header: () => <div className="hidden md:block">Source</div>,
      cell: ({ row }) => <div className="hidden md:block capitalize text-muted-foreground">{row.original.source}</div>,
    },
    {
      accessorKey: 'created_at',
      header: 'Created At',
      cell: ({ row }) => {
        const d = new Date(row.original.created_at)
        const formatted = d.toLocaleString('de-DE', { timeZone: 'Europe/Berlin', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        return <div className="text-sm text-muted-foreground">{formatted}</div>
      },
    },
    {
      id: 'actions',
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => {
        const handleDelete = async (e: React.MouseEvent) => {
          e.stopPropagation()
          if (!confirm('Are you sure you want to delete this lead?')) return
          
          try {
            const res = await fetch(`/api/leads/${row.original.id}`, { method: 'DELETE' })
            if (res.ok) {
              onRefresh?.()
            } else {
              const err = await res.json()
              alert(err.error || 'Failed to delete lead')
            }
          } catch (err) {
            alert('Failed to delete lead')
          }
        }

        return (
          <div className="text-right flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1"
              onClick={() => router.push(`/dashboard/leads/${row.original.id}`)}
            >
              <ExternalLink className="h-3 w-3" />
              View
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-100"
              onClick={handleDelete}
              title="Delete Lead"
            >
              <Plus className="h-4 w-4 rotate-45" />
            </Button>
          </div>
        )
      },
    },
  ]

  const table = useReactTable({
    data: filteredLeads,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    initialState: {
      pagination: { pageSize: 20 },
    },
  })

  return (
    <div>
      <LeadFilters filters={filters} onFiltersChange={setFilters} />
      
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/dashboard/leads/${row.original.id}`)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No leads found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between px-2 py-4">
        <div className="text-sm text-muted-foreground">
          Showing {table.getRowModel().rows.length} of {filteredLeads.length} leads
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
