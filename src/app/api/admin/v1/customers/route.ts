import { NextRequest } from 'next/server';
import { authenticateStaff } from '@/lib/auth/jwt';
import { getAdminSupabase } from '@/lib/supabase/admin';
import { apiError, apiSuccess } from '@/lib/response/envelope';

export async function GET(req: NextRequest) {
  const staff = await authenticateStaff(req);
  if (!staff) return apiError('UNAUTHORIZED', 'Staff auth required', undefined, 401);

  const supabase = getAdminSupabase();
  if (!supabase) return apiError('CONFIG_ERROR', 'Database client unavailable', undefined, 500);

  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q');

  let query = supabase
    .from('customers')
    .select(`
      id,
      full_name,
      phone_e164,
      email,
      preferred_channel,
      city,
      state,
      marketing_consent,
      tags,
      internal_notes,
      created_at,
      enquiries (count),
      orders (count)
    `)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (q) {
    query = query.or(`full_name.ilike.%${q}%,phone_e164.ilike.%${q}%,email.ilike.%${q}%`);
  }

  const { data, error } = await query;
  if (error) return apiError('DB_ERROR', error.message, undefined, 500);

  return apiSuccess(data || []);
}
