import { AuthenticatedStaff } from './jwt';
import { AppRole } from '@/types/database';

export type Resource =
  | 'products'
  | 'products:cost'
  | 'categories'
  | 'collections'
  | 'suppliers'
  | 'enquiries'
  | 'orders'
  | 'media'
  | 'cms'
  | 'showroom'
  | 'users'
  | 'audit';

export type Action = 'read' | 'create' | 'update' | 'delete' | 'publish';

/**
 * Evaluates whether an authenticated staff member can perform an action on a resource.
 */
export function can(user: AuthenticatedStaff | null, action: Action, resource: Resource): boolean {
  if (!user || user.roles.length === 0) return false;

  // Owner has omnipotent access
  if (user.roles.includes('owner')) return true;

  // Admin has full operational access
  if (user.roles.includes('admin')) {
    if (resource === 'users' && action === 'delete') return false; // Only owner can delete staff
    return true;
  }

  // Sourcing Manager
  if (user.roles.includes('sourcing_manager')) {
    if (['suppliers', 'products:cost'].includes(resource)) return true;
    if (resource === 'products' && ['read', 'update'].includes(action)) return true;
    if (['enquiries', 'orders'].includes(resource) && ['read', 'update'].includes(action)) return true;
    if (resource === 'media' && ['read', 'create'].includes(action)) return true;
    return false;
  }

  // Content Editor
  if (user.roles.includes('content_editor')) {
    if (['products:cost', 'suppliers', 'users', 'audit'].includes(resource)) return false;
    if (['products', 'categories', 'collections', 'cms', 'showroom', 'media'].includes(resource)) return true;
    return false;
  }

  // Fulfilment Manager
  if (user.roles.includes('fulfilment_manager')) {
    if (resource === 'orders' && ['read', 'update'].includes(action)) return true;
    if (resource === 'products' && action === 'read') return true;
    if (resource === 'media' && ['read', 'create'].includes(action)) return true;
    return false;
  }

  // Support Agent
  if (user.roles.includes('support_agent')) {
    if (['enquiries', 'orders'].includes(resource) && ['read', 'update'].includes(action)) return true;
    if (['products', 'categories'].includes(resource) && action === 'read') return true;
    return false;
  }

  // Analyst
  if (user.roles.includes('analyst')) {
    if (action === 'read') return true;
    return false;
  }

  return false;
}
