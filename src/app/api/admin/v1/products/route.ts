import { NextRequest } from 'next/server';
import { authenticateStaff } from '@/lib/auth/jwt';
import { can } from '@/lib/auth/rbac';
import { apiError, apiSuccess } from '@/lib/response/envelope';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { recordAuditLog } from '@/lib/audit/logger';
import { z } from 'zod';

const createProductSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  sku: z.string().min(3),
  subtitle: z.string().optional(),
  short_description: z.string().optional(),
  primary_category_id: z.string().uuid(),
  price_paise: z.number().int().min(0),
  compare_at_paise: z.number().int().nullable().optional(),
  public_availability: z.enum([
    'available_to_order',
    'made_to_order',
    'limited',
    'sold_out',
    'coming_soon',
    'hidden_price',
  ]).default('available_to_order'),
  badge: z.enum(['none', 'new_in', 'bestseller', 'limited_edition']).default('none'),
});

export async function GET(req: NextRequest) {
  const staff = await authenticateStaff(req);
  if (!staff || !can(staff, 'read', 'products')) {
    return apiError('UNAUTHORIZED', 'Access denied to products', undefined, 401);
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) return apiError('SERVER_ERROR', 'Database not ready', undefined, 500);

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const categoryId = searchParams.get('category_id');

  let query = supabase
    .from('products')
    .select(`
      *,
      category:categories(id, name, slug),
      media:product_media(
        id,
        role,
        is_primary,
        media_asset:media_assets(id, width, height, blur_data_url, alt_text)
      )
    `)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (status) query = query.eq('status', status);
  if (categoryId) query = query.eq('primary_category_id', categoryId);

  const { data, error } = await query;
  if (error) {
    return apiError('DB_ERROR', error.message, undefined, 500);
  }

  // Calculate completeness percentage per product
  const productsWithCompleteness = (data || []).map((p: Record<string, unknown>) => {
    let score = 0;
    if (p.name && p.slug) score += 20;
    if (p.primary_category_id) score += 20;
    if (p.price_paise !== undefined) score += 20;
    if (Array.isArray(p.media) && p.media.length > 0) score += 20;
    if (p.short_description || p.description) score += 20;

    return {
      ...p,
      completeness_pct: score,
    };
  });

  return apiSuccess(productsWithCompleteness);
}

export async function POST(req: NextRequest) {
  const staff = await authenticateStaff(req);
  if (!staff || !can(staff, 'create', 'products')) {
    return apiError('FORBIDDEN', 'Insufficient permissions to create products', undefined, 403);
  }

  const json = await req.json();
  const parsed = createProductSchema.safeParse(json);
  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', 'Invalid product data', parsed.error.flatten().fieldErrors, 422);
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) return apiError('SERVER_ERROR', 'Database not ready', undefined, 500);

  const productData = {
    ...parsed.data,
    status: 'draft' as const,
    created_by: staff.id,
    updated_by: staff.id,
  };

  const { data, error } = await supabase
    .from('products')
    .insert(productData)
    .select()
    .single();

  if (error) {
    return apiError('DB_ERROR', error.message, undefined, 400);
  }

  await recordAuditLog({
    actor: staff,
    action: 'product:create',
    entityType: 'product',
    entityId: data.id,
    after: data,
    ip: req.headers.get('x-forwarded-for') || null,
  });

  return apiSuccess(data, undefined, 201);
}
