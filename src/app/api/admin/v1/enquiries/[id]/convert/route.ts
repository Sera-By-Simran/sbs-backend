import { NextRequest } from 'next/server';
import { authenticateStaff } from '@/lib/auth/jwt';
import { getAdminSupabase } from '@/lib/supabase/admin';
import { apiError, apiSuccess } from '@/lib/response/envelope';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const staff = await authenticateStaff(req);
  if (!staff) {
    return apiError('UNAUTHORIZED', 'Staff authentication required', undefined, 401);
  }

  try {
    const supabase = getAdminSupabase();
    if (!supabase) {
      return apiError('CONFIG_ERROR', 'Database client unavailable', undefined, 500);
    }

    const { data, error } = await supabase.rpc('convert_enquiry_to_order', {
      p_enquiry_id: params.id,
    });

    if (error) {
      return apiError('RPC_ERROR', error.message, undefined, 400);
    }

    return apiSuccess(data);
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', err?.message || 'Conversion failed', undefined, 500);
  }
}
