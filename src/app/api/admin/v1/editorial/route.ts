import { NextRequest } from 'next/server';
import { authenticateStaff } from '@/lib/auth/jwt';
import { getAdminSupabase } from '@/lib/supabase/admin';
import { apiError, apiSuccess } from '@/lib/response/envelope';
import { z } from 'zod';

const PostSchema = z.object({
  slug: z.string().min(2),
  title: z.string().min(2),
  excerpt: z.string().optional(),
  body: z.any().optional(),
  pillar: z.string().default('styling'),
  author_display_name: z.string().default('Simran / SÉRA Editorial'),
  tags: z.array(z.string()).default([]),
  status: z.enum(['draft', 'in_review', 'scheduled', 'published', 'archived']).default('draft'),
  hero_media_id: z.string().uuid().optional().nullable(),
});

export async function GET(req: NextRequest) {
  const staff = await authenticateStaff(req);
  if (!staff) return apiError('UNAUTHORIZED', 'Staff auth required', undefined, 401);

  const supabase = getAdminSupabase();
  if (!supabase) return apiError('CONFIG_ERROR', 'Database client unavailable', undefined, 500);

  const { data, error } = await supabase
    .from('editorial_posts')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) return apiError('DB_ERROR', error.message, undefined, 500);
  return apiSuccess(data || []);
}

export async function POST(req: NextRequest) {
  const staff = await authenticateStaff(req);
  if (!staff) return apiError('UNAUTHORIZED', 'Staff auth required', undefined, 401);

  try {
    const body = await req.json();
    const parsed = PostSchema.safeParse(body);
    if (!parsed.success) {
      return apiError('VALIDATION_FAILED', 'Invalid article', parsed.error.flatten().fieldErrors, 422);
    }

    const supabase = getAdminSupabase();
    if (!supabase) return apiError('CONFIG_ERROR', 'Database client unavailable', undefined, 500);

    const postData: any = { ...parsed.data };
    if (postData.status === 'published' && !postData.published_at) {
      postData.published_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('editorial_posts')
      .insert(postData)
      .select()
      .single();

    if (error) return apiError('DB_ERROR', error.message, undefined, 500);
    return apiSuccess(data, undefined, 201);
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', err?.message || 'Failed to create editorial post', undefined, 500);
  }
}
