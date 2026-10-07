import { NextRequest } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase/admin';
import { apiError, apiSuccess } from '@/lib/response/envelope';

export const revalidate = 60;

export async function GET(req: NextRequest) {
  try {
    const supabase = getAdminSupabase();
    if (!supabase) {
      return apiError('CONFIG_ERROR', 'Database client unavailable', undefined, 500);
    }

    const { searchParams } = new URL(req.url);
    const pillar = searchParams.get('pillar'); // e.g. 'craft' | 'styling' | 'care' | 'philosophy'

    let query = supabase
      .from('editorial_posts')
      .select(`
        id,
        slug,
        title,
        excerpt,
        pillar,
        author_display_name,
        tags,
        published_at,
        hero_media_id,
        media_assets:hero_media_id (
          public_url,
          derivatives
        )
      `)
      .eq('status', 'published')
      .is('deleted_at', null)
      .order('published_at', { ascending: false });

    if (pillar) {
      query = query.eq('pillar', pillar);
    }

    const { data, error } = await query;

    if (error) {
      return apiError('DB_ERROR', error.message, undefined, 500);
    }

    return apiSuccess(data || []);
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', err?.message || 'Failed to fetch editorial posts', undefined, 500);
  }
}
