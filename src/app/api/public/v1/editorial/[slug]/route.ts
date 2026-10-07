import { NextRequest } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase/admin';
import { apiError, apiSuccess } from '@/lib/response/envelope';

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const supabase = getAdminSupabase();
    if (!supabase) {
      return apiError('CONFIG_ERROR', 'Database client unavailable', undefined, 500);
    }

    const { data: post, error } = await supabase
      .from('editorial_posts')
      .select(`
        id,
        slug,
        title,
        excerpt,
        body,
        pillar,
        author_display_name,
        tags,
        published_at,
        seo_title,
        seo_description,
        hero_media_id,
        media_assets:hero_media_id (
          public_url,
          derivatives
        )
      `)
      .eq('slug', params.slug)
      .eq('status', 'published')
      .is('deleted_at', null)
      .maybeSingle();

    if (error || !post) {
      return apiError('NOT_FOUND', 'Editorial post not found', undefined, 404);
    }

    return apiSuccess(post);
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', err?.message || 'Failed to fetch editorial article', undefined, 500);
  }
}
