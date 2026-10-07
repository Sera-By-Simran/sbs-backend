import { NextRequest } from 'next/server';
import { authenticateStaff } from '@/lib/auth/jwt';
import { getAdminSupabase } from '@/lib/supabase/admin';
import { apiError, apiSuccess } from '@/lib/response/envelope';
import { z } from 'zod';

const CollectionSchema = z.object({
  kind: z.enum(['collection', 'edit', 'occasion', 'campaign']).default('collection'),
  slug: z.string().min(2),
  name: z.string().min(2),
  tagline: z.string().optional(),
  intro: z.any().optional(),
  hero_media_id: z.string().uuid().optional().nullable(),
  status: z.enum(['draft', 'in_review', 'scheduled', 'published', 'archived']).default('draft'),
  sort_order: z.number().int().default(0),
  show_in_nav: z.boolean().default(true),
});

export async function GET(req: NextRequest) {
  const staff = await authenticateStaff(req);
  if (!staff) return apiError('UNAUTHORIZED', 'Staff auth required', undefined, 401);

  const supabase = getAdminSupabase();
  if (!supabase) return apiError('CONFIG_ERROR', 'Database client unavailable', undefined, 500);

  const { data, error } = await supabase
    .from('collections')
    .select('*')
    .is('deleted_at', null)
    .order('sort_order', { ascending: true });

  if (error) return apiError('DB_ERROR', error.message, undefined, 500);
  return apiSuccess(data || []);
}

export async function POST(req: NextRequest) {
  const staff = await authenticateStaff(req);
  if (!staff) return apiError('UNAUTHORIZED', 'Staff auth required', undefined, 401);

  try {
    const body = await req.json();
    const parsed = CollectionSchema.safeParse(body);
    if (!parsed.success) {
      return apiError('VALIDATION_FAILED', 'Invalid collection', parsed.error.flatten().fieldErrors, 422);
    }

    const supabase = getAdminSupabase();
    if (!supabase) return apiError('CONFIG_ERROR', 'Database client unavailable', undefined, 500);

    const { data, error } = await supabase
      .from('collections')
      .insert(parsed.data)
      .select()
      .single();

    if (error) return apiError('DB_ERROR', error.message, undefined, 500);
    return apiSuccess(data, undefined, 201);
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', err?.message || 'Failed to create collection', undefined, 500);
  }
}
