'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Job } from '@/lib/types'
import { useTranslation } from '@/lib/i18n'

interface JobsTableProps {
  jobs: Job[]
}

export function JobsTable({ jobs }: JobsTableProps) {
  const { locale } = useTranslation()

  if (jobs.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground italic">
        {locale === 'en' ? 'No jobs scheduled for today' : 'Heute keine Aufträge geplant'}
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{locale === 'en' ? 'Customer' : 'Kunde'}</TableHead>
          <TableHead>{locale === 'en' ? 'Type' : 'Typ'}</TableHead>
          <TableHead>{locale === 'en' ? 'Time' : 'Zeit'}</TableHead>
          <TableHead>{locale === 'en' ? 'Status' : 'Status'}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {jobs.map((job) => (
          <TableRow key={job.id}>
            <TableCell className="font-medium">{job.lead?.name || 'Unknown'}</TableCell>
            <TableCell>{job.lead?.job_type || 'General'}</TableCell>
            <TableCell>
              {job.scheduled_time 
                ? new Date(job.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
                : '-'}
            </TableCell>
            <TableCell>
              <Badge variant="secondary" className="capitalize">
                {job.status}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
