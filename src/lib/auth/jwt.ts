import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';
import { AppRole } from '@/types/database';

export interface AuthenticatedStaff {
  id: string;
  email: string;
  roles: AppRole[];
}

/**
 * Extracts and verifies the Supabase access token from Authorization header.
 * Fetches user roles from public.user_roles.
 */
export async function authenticateStaff(req: NextRequest): Promise<AuthenticatedStaff | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) return null;

  const client = createClient(url, anonKey);
  const { data: { user }, error } = await client.auth.getUser(token);

  if (error || !user) {
    return null;
  }

  // Fetch roles using service-role client
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return null;

  const adminClient = createClient(url, serviceKey);
  const { data: rolesData } = await adminClient
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id);

  const roles = (rolesData || []).map((r: { role: AppRole }) => r.role);

  return {
    id: user.id,
    email: user.email || '',
    roles,
  };
}
