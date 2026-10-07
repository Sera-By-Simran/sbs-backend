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
    const kind = searchParams.get('kind'); // 'collection' | 'edit' | 'occasion'

    let query = supabase
      .from('collections')
      .select(`
        id,
        kind,
        slug,
        name,
        tagline,
        intro,
        sort_order,
        status,
        hero_media_id,
        media_assets:hero_media_id (
          public_url,
          derivatives
        )
      `)
      .eq('status', 'published')
      .is('deleted_at', null)
      .order('sort_order', { ascending: true });

    if (kind) {
      query = query.eq('kind', kind);
    }

    const { data, error } = await query;

    if (error) {
      return apiError('DB_ERROR', error.message, undefined, 500);
    }

    return apiSuccess(data || []);
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', err?.message || 'Failed to fetch collections', undefined, 500);
  }
}
