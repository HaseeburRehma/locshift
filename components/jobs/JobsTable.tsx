'use client'

import { useRouter } from 'next/navigation'
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  ColumnDef,
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
import { ExternalLink } from 'lucide-react'
import { Job } from '@/lib/types'
import { JobStatusBadge } from './JobStatusBadge'
import { JobTimer } from './JobTimer'

export function JobsTable({ jobs }: { jobs: Job[] }) {
  const router = useRouter()

  const columns: ColumnDef<Job>[] = [
    {
      accessorKey: 'scheduled_time',
      header: 'Scheduled Time',
      cell: ({ row }) => {
        const val = row.original.scheduled_time
        if (!val) return <span className="text-muted-foreground">—</span>
        return new Date(val).toLocaleString('de-DE', { timeZone: 'Europe/Berlin', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
      },
    },
    {
      id: 'customer',
      header: 'Customer',
      cell: ({ row }) => {
        const lead = row.original.lead
        return (
          <div>
            <div className="font-medium">{lead?.name || '—'}</div>
            <div className="text-xs text-muted-foreground">{lead?.city || '—'}</div>
          </div>
        )
      },
    },
    {
      id: 'technician',
      header: 'Technician',
      cell: ({ row }) => row.original.technician?.name || <span className="text-red-500 text-xs font-semibold">Unassigned</span>,
    },
    {
      id: 'job_type',
      header: 'Job Type',
      cell: ({ row }) => row.original.lead?.job_type || row.original.lead?.service_type || '—',
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <JobStatusBadge status={row.original.status} />,
    },
    {
      id: 'timer',
      header: 'Timer',
      cell: ({ row }) => (
        <JobTimer 
          jobId={row.original.id} 
          status={row.original.status} 
          scheduledTime={row.original.scheduled_time}
          startedAt={extractStartedAt(row.original.notes)}
        />
      ),
    },
    {
      id: 'actions',
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => (
        <div className="text-right" onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1"
            onClick={() => router.push(`/dashboard/jobs/${row.original.id}`)}
          >
            <ExternalLink className="h-3 w-3" />
            View
          </Button>
        </div>
      ),
    },
  ]

  const table = useReactTable({
    data: jobs,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  // Helper function to extract started_at from notes workaround specified by prompt
  function extractStartedAt(notes: string | null): string | null {
    if (!notes) return null
    const match = notes.match(/^STARTED_AT:([^|]+)\|/)
    return match ? match[1] : null
  }

  function isOverdue(job: Job) {
    if (job.status !== 'scheduled' || !job.scheduled_time) return false
    return new Date(job.scheduled_time).getTime() < new Date().getTime()
  }

  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
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
                className={`cursor-pointer hover:bg-muted/50 ${isOverdue(row.original) ? 'bg-red-50/50 hover:bg-red-50' : ''}`}
                onClick={() => router.push(`/dashboard/jobs/${row.original.id}`)}
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
                No jobs found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
