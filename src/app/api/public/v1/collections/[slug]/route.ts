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

    const { data: collection, error: colErr } = await supabase
      .from('collections')
      .select(`
        id,
        kind,
        slug,
        name,
        tagline,
        intro,
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

    if (colErr || !collection) {
      return apiError('NOT_FOUND', 'Collection not found', undefined, 404);
    }

    // Fetch products mapped to this collection
    const { data: mappedProducts, error: prodErr } = await supabase
      .from('collection_products')
      .select(`
        sort_order,
        is_featured,
        styling_note,
        product:product_id (
          id,
          slug,
          sku,
          name,
          tagline,
          price_paise,
          compare_at_paise,
          public_availability,
          badge,
          primary_image_id,
          product_media (
            is_primary,
            sort_order,
            media_asset:media_asset_id (
              public_url,
              derivatives
            )
          )
        )
      `)
      .eq('collection_id', collection.id)
      .order('sort_order', { ascending: true });

    if (prodErr) {
      return apiError('DB_ERROR', prodErr.message, undefined, 500);
    }

    return apiSuccess({
      ...collection,
      products: mappedProducts?.map((mp) => ({
        ...mp.product,
        styling_note: mp.styling_note,
        is_featured: mp.is_featured,
      })) || [],
    });
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', err?.message || 'Failed to fetch collection details', undefined, 500);
  }
}
