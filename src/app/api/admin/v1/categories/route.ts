import { NextRequest } from 'next/server';
import { authenticateStaff } from '@/lib/auth/jwt';
import { can } from '@/lib/auth/rbac';
import { apiError, apiSuccess } from '@/lib/response/envelope';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { z } from 'zod';

const createCategorySchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  parent_id: z.string().uuid().nullable().optional(),
  description: z.string().optional(),
  tagline: z.string().optional(),
  is_visible: z.boolean().default(true),
  show_in_nav: z.boolean().default(true),
  sort_order: z.number().int().default(0),
});

export async function GET(req: NextRequest) {
  const staff = await authenticateStaff(req);
  if (!staff || !can(staff, 'read', 'categories')) {
    return apiError('UNAUTHORIZED', 'Access denied to categories', undefined, 401);
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) return apiError('SERVER_ERROR', 'Database not ready', undefined, 500);

  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .is('deleted_at', null)
    .order('sort_order', { ascending: true });

  if (error) {
    return apiError('DB_ERROR', error.message, undefined, 500);
  }

  return apiSuccess(data);
}

export async function POST(req: NextRequest) {
  const staff = await authenticateStaff(req);
  if (!staff || !can(staff, 'create', 'categories')) {
    return apiError('FORBIDDEN', 'Insufficient permissions to create categories', undefined, 403);
  }

  const json = await req.json();
  const parsed = createCategorySchema.safeParse(json);
  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', 'Invalid category data', parsed.error.flatten().fieldErrors, 422);
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) return apiError('SERVER_ERROR', 'Database not ready', undefined, 500);

  const { data, error } = await supabase
    .from('categories')
    .insert(parsed.data)
    .select()
    .single();

  if (error) {
    return apiError('DB_ERROR', error.message, undefined, 400);
  }

  return apiSuccess(data, undefined, 201);
}
