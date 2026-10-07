import { NextRequest } from 'next/server';
import { authenticateStaff } from '@/lib/auth/jwt';
import { getAdminSupabase } from '@/lib/supabase/admin';
import { apiError, apiSuccess } from '@/lib/response/envelope';

export async function GET(req: NextRequest) {
  const staff = await authenticateStaff(req);
  if (!staff) return apiError('UNAUTHORIZED', 'Staff auth required', undefined, 401);

  const supabase = getAdminSupabase();
  if (!supabase) return apiError('CONFIG_ERROR', 'Database client unavailable', undefined, 500);

  // Fetch profiles with user_roles
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select(`
      id,
      full_name,
      is_active,
      last_seen_at,
      mfa_enrolled,
      created_at,
      user_roles (
        role,
        granted_at
      )
    `)
    .order('created_at', { ascending: true });

  if (error) return apiError('DB_ERROR', error.message, undefined, 500);

  // Get emails from auth.users via admin client
  const { data: authData } = await supabase.auth.admin.listUsers();
  const emailMap = new Map((authData?.users || []).map((u) => [u.id, u.email]));

  const enriched = (profiles || []).map((p) => ({
    ...p,
    email: emailMap.get(p.id) || 'staff@serabysimran.com',
    roles: p.user_roles?.map((r: any) => r.role) || [],
  }));

  return apiSuccess(enriched);
}
