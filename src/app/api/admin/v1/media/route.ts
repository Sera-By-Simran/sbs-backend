import { NextRequest } from 'next/server';
import { authenticateStaff } from '@/lib/auth/jwt';
import { can } from '@/lib/auth/rbac';
import { apiError, apiSuccess } from '@/lib/response/envelope';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  const staff = await authenticateStaff(req);
  if (!staff || !can(staff, 'read', 'media')) {
    return apiError('UNAUTHORIZED', 'Access denied to media library', undefined, 401);
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) return apiError('SERVER_ERROR', 'Database not ready', undefined, 500);

  const { searchParams } = new URL(req.url);
  const visibility = searchParams.get('visibility');
  const tag = searchParams.get('tag');

  let query = supabase
    .from('media_assets')
    .select(`
      *,
      derivatives:media_derivatives(*),
      fidelity_review:fidelity_reviews(*)
    `)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(50);

  if (visibility) query = query.eq('visibility', visibility);
  if (tag) query = query.contains('tags', [tag]);

  const { data, error } = await query;
  if (error) {
    return apiError('DB_ERROR', error.message, undefined, 500);
  }

  return apiSuccess(data);
}
