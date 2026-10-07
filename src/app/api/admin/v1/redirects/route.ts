import { NextRequest } from 'next/server';
import { authenticateStaff } from '@/lib/auth/jwt';
import { getAdminSupabase } from '@/lib/supabase/admin';
import { apiError, apiSuccess } from '@/lib/response/envelope';
import { z } from 'zod';

const RedirectSchema = z.object({
  from_path: z.string().startsWith('/'),
  to_path: z.string(),
  status_code: z.enum(['301', '302']).default('301').transform(Number),
});

export async function GET(req: NextRequest) {
  const staff = await authenticateStaff(req);
  if (!staff) return apiError('UNAUTHORIZED', 'Staff auth required', undefined, 401);

  const supabase = getAdminSupabase();
  if (!supabase) return apiError('CONFIG_ERROR', 'Database client unavailable', undefined, 500);

  const { data, error } = await supabase
    .from('redirects')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return apiError('DB_ERROR', error.message, undefined, 500);
  return apiSuccess(data || []);
}

export async function POST(req: NextRequest) {
  const staff = await authenticateStaff(req);
  if (!staff) return apiError('UNAUTHORIZED', 'Staff auth required', undefined, 401);

  try {
    const body = await req.json();
    const parsed = RedirectSchema.safeParse(body);
    if (!parsed.success) {
      return apiError('VALIDATION_FAILED', 'Invalid redirect path', parsed.error.flatten().fieldErrors, 422);
    }

    const supabase = getAdminSupabase();
    if (!supabase) return apiError('CONFIG_ERROR', 'Database client unavailable', undefined, 500);

    const { data, error } = await supabase
      .from('redirects')
      .upsert(
        {
          from_path: parsed.data.from_path,
          to_path: parsed.data.to_path,
          status_code: parsed.data.status_code,
          created_by: staff.id,
        },
        { onConflict: 'from_path' }
      )
      .select()
      .single();

    if (error) return apiError('DB_ERROR', error.message, undefined, 500);
    return apiSuccess(data, undefined, 201);
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', err?.message || 'Failed to save redirect', undefined, 500);
  }
}

export async function DELETE(req: NextRequest) {
  const staff = await authenticateStaff(req);
  if (!staff) return apiError('UNAUTHORIZED', 'Staff auth required', undefined, 401);

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return apiError('BAD_REQUEST', 'Redirect id required', undefined, 400);

  const supabase = getAdminSupabase();
  if (!supabase) return apiError('CONFIG_ERROR', 'Database client unavailable', undefined, 500);

  const { error } = await supabase.from('redirects').delete().eq('id', id);
  if (error) return apiError('DB_ERROR', error.message, undefined, 500);

  return apiSuccess({ deleted: true });
}
