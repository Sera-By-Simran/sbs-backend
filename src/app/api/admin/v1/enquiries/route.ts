import { NextRequest } from 'next/server';
import { authenticateStaff } from '@/lib/auth/jwt';
import { getAdminSupabase } from '@/lib/supabase/admin';
import { apiError, apiSuccess } from '@/lib/response/envelope';

export async function GET(req: NextRequest) {
  const staff = await authenticateStaff(req);
  if (!staff) {
    return apiError('UNAUTHORIZED', 'Staff authentication required', undefined, 401);
  }

  const supabase = getAdminSupabase();
  if (!supabase) {
    return apiError('CONFIG_ERROR', 'Database client unavailable', undefined, 500);
  }
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');

  let query = supabase
    .from('enquiries')
    .select(`
      id,
      reference,
      status,
      source,
      message,
      occasion,
      needed_by,
      preferred_channel,
      created_at,
      updated_at,
      customers (
        id,
        full_name,
        phone_e164,
        email
      ),
      enquiry_items (
        id,
        product_id,
        name_snapshot,
        sku_snapshot,
        price_paise_snapshot,
        quantity,
        customer_note
      )
    `)
    .order('created_at', { ascending: false });

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    return apiError('DB_ERROR', error.message, undefined, 500);
  }

  return apiSuccess(data);
}
