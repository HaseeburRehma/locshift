'use client'

import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Search, X } from 'lucide-react'

export interface FilterState {
  search: string
  status: string
  urgency: string
  serviceType: string
}

interface LeadFiltersProps {
  filters: FilterState
  onFiltersChange: (filters: FilterState) => void
}

export function LeadFilters({ filters, onFiltersChange }: LeadFiltersProps) {
  const handleReset = () => {
    onFiltersChange({
      search: '',
      status: 'all',
      urgency: 'all',
      serviceType: 'all',
    })
  }

  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-6">
      <div className="relative flex-1">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search name, phone, city..."
          className="pl-9 bg-background"
          value={filters.search}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
        />
      </div>
      
      <Select
        value={filters.status}
        onValueChange={(val) => onFiltersChange({ ...filters, status: val })}
      >
        <SelectTrigger className="w-[140px] bg-background">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="new">New</SelectItem>
          <SelectItem value="qualified">Qualified</SelectItem>
          <SelectItem value="scheduled">Scheduled</SelectItem>
          <SelectItem value="assigned">Assigned</SelectItem>
          <SelectItem value="completed">Completed</SelectItem>
          <SelectItem value="lost">Lost</SelectItem>
          <SelectItem value="cancelled">Cancelled</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={filters.urgency}
        onValueChange={(val) => onFiltersChange({ ...filters, urgency: val })}
      >
        <SelectTrigger className="w-[140px] bg-background">
          <SelectValue placeholder="Urgency" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Urgency</SelectItem>
          <SelectItem value="urgent">Urgent</SelectItem>
          <SelectItem value="high">High</SelectItem>
          <SelectItem value="medium">Medium</SelectItem>
          <SelectItem value="low">Low</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={filters.serviceType}
        onValueChange={(val) => onFiltersChange({ ...filters, serviceType: val })}
      >
        <SelectTrigger className="w-[160px] bg-background">
          <SelectValue placeholder="Service Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Services</SelectItem>
          <SelectItem value="Electrician">Electrician</SelectItem>
          <SelectItem value="Plumber">Plumber</SelectItem>
          <SelectItem value="HVAC">HVAC</SelectItem>
        </SelectContent>
      </Select>

      {(filters.search || filters.status !== 'all' || filters.urgency !== 'all' || filters.serviceType !== 'all') && (
        <Button variant="ghost" className="px-3" onClick={handleReset}>
          <X className="h-4 w-4 mr-2" />
          Clear
        </Button>
      )}
    </div>
  )
}
