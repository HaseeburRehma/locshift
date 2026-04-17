import { UserRole } from "@/lib/types";

const PERMISSIONS = {
  // Leads
  'leads.view': ['admin','manager','disponent','viewer','partner_admin','partner_agent'],
  'leads.view_pii': ['admin','manager','disponent','partner_admin','partner_agent'],
  'leads.create': ['admin','manager','disponent'],
  'leads.edit': ['admin','manager','disponent','partner_admin','partner_agent'],
  'leads.delete': ['admin'],
  'leads.assign_partner': ['admin','manager','disponent'],
  'leads.list_marketplace': ['admin','manager','disponent'],

  // Jobs
  'jobs.view': ['admin','manager','disponent','technician','viewer','partner_admin','partner_agent'],
  'jobs.create': ['admin','manager','disponent'],
  'jobs.edit': ['admin','manager','disponent','partner_admin','partner_agent'],
  'jobs.update_status': ['admin','manager','disponent','technician','partner_admin','partner_agent'],
  'jobs.delete': ['admin'],

  // Technicians
  'technicians.view': ['admin','manager','disponent','viewer'],
  'technicians.create': ['admin','manager'],
  'technicians.edit': ['admin','manager'],
  'technicians.delete': ['admin'],
  'technicians.toggle_availability': ['admin','manager','disponent','technician'],

  // Partners
  'partners.view': ['admin','manager'],
  'partners.create': ['admin'],
  'partners.edit': ['admin','manager'],
  'partners.delete': ['admin'],

  // Marketplace
  'marketplace.view': ['partner_admin','partner_agent'],
  'marketplace.purchase': ['partner_admin','partner_agent'],
  'marketplace.manage': ['admin','manager'],

  // Financials / Commission
  'finance.view': ['admin','manager','partner_admin'],
  'finance.manage': ['admin'],

  // Reviews
  'reviews.view': ['admin','manager','disponent','viewer','partner_admin'],
  'reviews.manage': ['admin','manager'],

  // Automations
  'automations.view': ['admin','manager'],
  'automations.manage': ['admin'],

  // Settings
  'settings.view': ['admin','manager','partner_admin'],
  'settings.manage': ['admin'],
  'settings.partner_profile': ['partner_admin'],
} as const;

export type Permission = keyof typeof PERMISSIONS;

export function hasPermission(role: UserRole | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  const allowedRoles = PERMISSIONS[permission] as readonly string[];
  // Include 'dispatcher' as an implicit 'disponent' if it's not explicitly listed
  const rolesToCheck = [role];
  if (role === 'dispatcher') rolesToCheck.push('disponent' as UserRole);
  
  return allowedRoles.some(r => rolesToCheck.includes(r as UserRole));
}

export function canAccess(role: UserRole | null | undefined, permissions: Permission[]): boolean {
  if (!role) return false;
  return permissions.some(p => hasPermission(role, p));
}
