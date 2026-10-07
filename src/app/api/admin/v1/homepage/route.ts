import { NextRequest } from 'next/server';
import { authenticateStaff } from '@/lib/auth/jwt';
import { getAdminSupabase } from '@/lib/supabase/admin';
import { apiError, apiSuccess } from '@/lib/response/envelope';

export async function GET(req: NextRequest) {
  const staff = await authenticateStaff(req);
  if (!staff) return apiError('UNAUTHORIZED', 'Staff auth required', undefined, 401);

  const supabase = getAdminSupabase();
  if (!supabase) return apiError('CONFIG_ERROR', 'Database client unavailable', undefined, 500);

  const { data, error } = await supabase
    .from('homepage_sections')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) return apiError('DB_ERROR', error.message, undefined, 500);
  return apiSuccess(data || []);
}

export async function POST(req: NextRequest) {
  const staff = await authenticateStaff(req);
  if (!staff) return apiError('UNAUTHORIZED', 'Staff auth required', undefined, 401);

  try {
    const body = await req.json();
    const supabase = getAdminSupabase();
    if (!supabase) return apiError('CONFIG_ERROR', 'Database client unavailable', undefined, 500);

    const { data, error } = await supabase
      .from('homepage_sections')
      .insert({
        page_key: 'home',
        type: body.type || 'hero',
        variant: body.variant || 'default',
        config: body.config || {},
        sort_order: body.sort_order || 0,
        status: body.status || 'draft',
        updated_by: staff.id,
      })
      .select()
      .single();

    if (error) return apiError('DB_ERROR', error.message, undefined, 500);
    return apiSuccess(data, undefined, 201);
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', err?.message || 'Failed to save section', undefined, 500);
  }
}
