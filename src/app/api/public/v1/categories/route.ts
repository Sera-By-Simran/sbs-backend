import { NextResponse } from 'next/server';
import { apiError, apiSuccess } from '@/lib/response/envelope';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export async function GET() {
  const supabase = getSupabaseAdmin();
  if (!supabase) return apiError('SERVER_ERROR', 'Database not ready', undefined, 500);

  const { data, error } = await supabase
    .from('categories')
    .select('id, name, slug, parent_id, description, tagline, banner_media_id, sort_order')
    .eq('is_visible', true)
    .is('deleted_at', null)
    .order('sort_order', { ascending: true });

  if (error) {
    return apiError('DB_ERROR', error.message, undefined, 500);
  }

  // Set public cache headers (stale-while-revalidate)
  const res = apiSuccess(data);
  res.headers.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  return res;
}
