import { NextRequest } from 'next/server';
import { authenticateStaff } from '@/lib/auth/jwt';
import { getAdminSupabase } from '@/lib/supabase/admin';
import { apiError, apiSuccess } from '@/lib/response/envelope';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const staff = await authenticateStaff(req);
  if (!staff) return apiError('UNAUTHORIZED', 'Staff auth required', undefined, 401);

  const supabase = getAdminSupabase();
  if (!supabase) return apiError('CONFIG_ERROR', 'Database client unavailable', undefined, 500);

  const { data, error } = await supabase
    .from('editorial_posts')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error || !data) return apiError('NOT_FOUND', 'Article not found', undefined, 404);
  return apiSuccess(data);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const staff = await authenticateStaff(req);
  if (!staff) return apiError('UNAUTHORIZED', 'Staff auth required', undefined, 401);

  try {
    const body = await req.json();
    const supabase = getAdminSupabase();
    if (!supabase) return apiError('CONFIG_ERROR', 'Database client unavailable', undefined, 500);

    const { data, error } = await supabase
      .from('editorial_posts')
      .update(body)
      .eq('id', params.id)
      .select()
      .single();

    if (error) return apiError('DB_ERROR', error.message, undefined, 500);
    return apiSuccess(data);
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', err?.message || 'Failed to update editorial post', undefined, 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const staff = await authenticateStaff(req);
  if (!staff) return apiError('UNAUTHORIZED', 'Staff auth required', undefined, 401);

  const supabase = getAdminSupabase();
  if (!supabase) return apiError('CONFIG_ERROR', 'Database client unavailable', undefined, 500);

  const { error } = await supabase
    .from('editorial_posts')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', params.id);

  if (error) return apiError('DB_ERROR', error.message, undefined, 500);
  return apiSuccess({ deleted: true });
}
