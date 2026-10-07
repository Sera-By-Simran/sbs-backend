import { NextRequest } from 'next/server';
import { authenticateStaff } from '@/lib/auth/jwt';
import { getAdminSupabase } from '@/lib/supabase/admin';
import { apiError, apiSuccess } from '@/lib/response/envelope';

export async function GET(req: NextRequest) {
  const staff = await authenticateStaff(req);
  if (!staff) {
    return apiError('UNAUTHORIZED', 'Staff authentication required', undefined, 401);
  }

  // Only owner or admin can review security audit logs
  if (!staff.roles.includes('owner') && !staff.roles.includes('admin')) {
    return apiError('FORBIDDEN', 'Access restricted to owner/admin', undefined, 403);
  }

  const supabase = getAdminSupabase();
  if (!supabase) {
    return apiError('CONFIG_ERROR', 'Database client unavailable', undefined, 500);
  }

  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get('limit') || '50', 10);

  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    return apiError('DB_ERROR', error.message, undefined, 500);
  }

  return apiSuccess(data || []);
}
