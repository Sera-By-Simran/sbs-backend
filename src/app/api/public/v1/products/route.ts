import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/response/envelope';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return apiError('SERVER_ERROR', 'Database not ready', undefined, 500);

  const { searchParams } = new URL(req.url);
  const categorySlug = searchParams.get('category');
  const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit')) || 24));
  const offset = Math.max(0, Number(searchParams.get('offset')) || 0);

  let query = supabase
    .from('products')
    .select(`
      id,
      slug,
      sku,
      name,
      subtitle,
      short_description,
      price_paise,
      compare_at_paise,
      currency,
      show_price,
      public_availability,
      badge,
      category:categories!inner(id, name, slug),
      media:product_media(
        role,
        is_primary,
        show_on_card_hover,
        media_asset:media_assets!inner(id, width, height, blur_data_url, alt_text)
      )
    `)
    .eq('status', 'published')
    .is('deleted_at', null)
    .range(offset, offset + limit - 1)
    .order('created_at', { ascending: false });

  if (categorySlug) {
    query = query.eq('category.slug', categorySlug);
  }

  const { data, error } = await query;
  if (error) {
    return apiError('DB_ERROR', error.message, undefined, 500);
  }

  const res = apiSuccess(data);
  res.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
  return res;
}
