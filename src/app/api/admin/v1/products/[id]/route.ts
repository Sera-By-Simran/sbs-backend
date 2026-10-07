import { NextRequest } from 'next/server';
import { authenticateStaff } from '@/lib/auth/jwt';
import { can } from '@/lib/auth/rbac';
import { apiError, apiSuccess } from '@/lib/response/envelope';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { recordAuditLog } from '@/lib/audit/logger';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const staff = await authenticateStaff(req);
  if (!staff || !can(staff, 'read', 'products')) {
    return apiError('UNAUTHORIZED', 'Access denied to product', undefined, 401);
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) return apiError('SERVER_ERROR', 'Database not ready', undefined, 500);

  const { data: product, error } = await supabase
    .from('products')
    .select(`
      *,
      category:categories(id, name, slug),
      variants:product_variants(*),
      claims:product_claims(*),
      media:product_media(
        id,
        role,
        sort_order,
        is_primary,
        alt_override,
        media_asset:media_assets(*)
      )
    `)
    .eq('id', params.id)
    .single();

  if (error || !product) {
    return apiError('NOT_FOUND', 'Product not found', undefined, 404);
  }

  // Sourcing & Cost isolation check
  let sourcingData = null;
  if (can(staff, 'read', 'products:cost')) {
    const { data: suppProd } = await supabase
      .from('supplier_products')
      .select('*, supplier:suppliers(id, name, code)')
      .eq('product_id', params.id);
    sourcingData = suppProd;
  }

  return apiSuccess({
    ...(product as Record<string, unknown>),
    sourcing: sourcingData, // Null if user lacks permission
  });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const staff = await authenticateStaff(req);
  if (!staff || !can(staff, 'update', 'products')) {
    return apiError('FORBIDDEN', 'Insufficient permissions to update product', undefined, 403);
  }

  const body = await req.json();
  const supabase = getSupabaseAdmin();
  if (!supabase) return apiError('SERVER_ERROR', 'Database not ready', undefined, 500);

  // Fetch current state for audit
  const { data: before } = await supabase
    .from('products')
    .select('*')
    .eq('id', params.id)
    .single();

  if (!before) {
    return apiError('NOT_FOUND', 'Product not found', undefined, 404);
  }

  const updateFields = {
    ...body,
    updated_by: staff.id,
    updated_at: new Date().toISOString(),
  };

  const { data: updated, error } = await supabase
    .from('products')
    .update(updateFields)
    .eq('id', params.id)
    .select()
    .single();

  if (error) {
    return apiError('DB_ERROR', error.message, undefined, 400);
  }

  await recordAuditLog({
    actor: staff,
    action: 'product:update',
    entityType: 'product',
    entityId: params.id,
    before: before as Record<string, unknown>,
    after: updated as Record<string, unknown>,
    ip: req.headers.get('x-forwarded-for') || null,
  });

  return apiSuccess(updated);
}
