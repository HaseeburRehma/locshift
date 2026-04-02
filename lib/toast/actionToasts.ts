import { toast } from 'sonner'

/**
 * Centralized toast spec — consistent icons, titles, and descriptions across all modules.
 * Use these instead of raw toast() calls to ensure visual consistency.
 */
export const actionToasts = {
  // Plans
  planCreated:   () => toast.success('Plan created', { description: 'Employee has been notified of their shift.' }),
  planConfirmed: () => toast.success('Plan confirmed', { description: 'The dispatcher has been notified.' }),
  planRejected:  () => toast.error('Plan rejected', { description: 'Reason sent to the dispatcher.' }),
  planDeleted:   () => toast.success('Plan removed'),
  planCancelled: () => toast.success('Plan cancelled'),
  planUpdated:   () => toast.success('Plan updated'),

  // Time Entries
  timeSubmitted: () => toast.success('Time entry submitted', { description: 'Awaiting admin approval.' }),
  timeVerified:  () => toast.success('Time entry approved'),
  timeRejected:  () => toast.error('Time entry rejected'),
  timeDeleted:   () => toast.success('Time entry deleted'),

  // Per Diem
  perDiemSubmitted: () => toast.success('Per diem submitted'),
  perDiemApproved:  () => toast.success('Per diem approved'),
  perDiemRejected:  () => toast.error('Per diem rejected'),

  // Calendar
  eventCreated: () => toast.success('Event created', { description: 'Members have been notified.' }),
  eventUpdated: () => toast.success('Event updated'),
  eventDeleted: () => toast.success('Event deleted'),

  // Customers
  customerCreated: () => toast.success('Customer added'),
  customerDeleted: () => toast.success('Customer removed'),

  // Generic
  networkError:    () => toast.error('Connection error — retrying...'),
  permissionError: () => toast.error("You don't have permission to do this"),
  genericError:    (msg?: string) => toast.error(msg || 'Something went wrong. Please try again.'),
}
