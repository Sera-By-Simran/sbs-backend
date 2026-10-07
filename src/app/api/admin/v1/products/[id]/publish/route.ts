import { NextRequest } from 'next/server';
import { authenticateStaff } from '@/lib/auth/jwt';
import { can } from '@/lib/auth/rbac';
import { apiError, apiSuccess } from '@/lib/response/envelope';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { recordAuditLog } from '@/lib/audit/logger';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const staff = await authenticateStaff(req);
  if (!staff || !can(staff, 'publish', 'products')) {
    return apiError('FORBIDDEN', 'Insufficient permissions to publish products', undefined, 403);
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) return apiError('SERVER_ERROR', 'Database not ready', undefined, 500);

  const { data, error } = await supabase.rpc('publish_product', {
    p_product_id: params.id,
  });

  if (error) {
    return apiError('PUBLISH_GATE_FAILED', error.message, undefined, 422);
  }

  await recordAuditLog({
    actor: staff,
    action: 'product:publish',
    entityType: 'product',
    entityId: params.id,
    after: data,
    ip: req.headers.get('x-forwarded-for') || null,
  });

  return apiSuccess(data);
}
