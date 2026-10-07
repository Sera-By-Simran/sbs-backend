import { NextRequest } from 'next/server';
import { authenticateStaff } from '@/lib/auth/jwt';
import { can } from '@/lib/auth/rbac';
import { apiError, apiSuccess } from '@/lib/response/envelope';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { z } from 'zod';

const createSupplierSchema = z.object({
  name: z.string().min(2),
  code: z.string().min(2).toUpperCase(),
  city: z.string().optional(),
  website: z.string().optional(),
  payment_terms: z.string().optional(),
  default_lead_time_days_min: z.number().int().optional(),
  default_lead_time_days_max: z.number().int().optional(),
  internal_notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const staff = await authenticateStaff(req);
  if (!staff || !can(staff, 'read', 'suppliers')) {
    return apiError('FORBIDDEN', 'Access denied to suppliers (Restricted role)', undefined, 403);
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) return apiError('SERVER_ERROR', 'Database not ready', undefined, 500);

  const { data, error } = await supabase
    .from('suppliers')
    .select(`
      *,
      contacts:supplier_contacts(*),
      products_count:supplier_products(count)
    `)
    .is('deleted_at', null)
    .order('name');

  if (error) {
    return apiError('DB_ERROR', error.message, undefined, 500);
  }

  return apiSuccess(data);
}

export async function POST(req: NextRequest) {
  const staff = await authenticateStaff(req);
  if (!staff || !can(staff, 'create', 'suppliers')) {
    return apiError('FORBIDDEN', 'Insufficient permissions to create suppliers', undefined, 403);
  }

  const json = await req.json();
  const parsed = createSupplierSchema.safeParse(json);
  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', 'Invalid supplier data', parsed.error.flatten().fieldErrors, 422);
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) return apiError('SERVER_ERROR', 'Database not ready', undefined, 500);

  const { data, error } = await supabase
    .from('suppliers')
    .insert(parsed.data)
    .select()
    .single();

  if (error) {
    return apiError('DB_ERROR', error.message, undefined, 400);
  }

  return apiSuccess(data, undefined, 201);
}
