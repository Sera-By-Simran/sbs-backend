import { NextRequest } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase/admin';
import { apiError, apiSuccess } from '@/lib/response/envelope';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q')?.trim() || '';

    if (!q || q.length < 2) {
      return apiSuccess({ products: [], total: 0, query: q });
    }

    const supabase = getAdminSupabase();
    if (!supabase) {
      return apiError('CONFIG_ERROR', 'Database client unavailable', undefined, 500);
    }

    // Search safe columns: name, description, slug, sku
    const { data: products, error } = await supabase
      .from('products')
      .select(`
        id,
        slug,
        sku,
        name,
        tagline,
        description,
        price_paise,
        compare_at_paise,
        public_availability,
        badge,
        category:primary_category_id (
          id,
          name,
          slug
        ),
        product_media (
          is_primary,
          sort_order,
          media_asset:media_asset_id (
            public_url,
            derivatives
          )
        )
      `)
      .eq('publish_status', 'published')
      .is('deleted_at', null)
      .or(`name.ilike.%${q}%,description.ilike.%${q}%,tagline.ilike.%${q}%,slug.ilike.%${q}%`)
      .limit(20);

    if (error) {
      return apiError('DB_ERROR', error.message, undefined, 500);
    }

    // Log search event silently for analytics
    await supabase.from('search_queries').insert({
      q_normalised: q.toLowerCase(),
      result_count: products?.length || 0,
    });

    return apiSuccess({
      products: products || [],
      total: products?.length || 0,
      query: q,
    });
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', err?.message || 'Search failed', undefined, 500);
  }
}
