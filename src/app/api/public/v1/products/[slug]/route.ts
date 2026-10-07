import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/response/envelope';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return apiError('SERVER_ERROR', 'Database not ready', undefined, 500);

  const { data: product, error } = await supabase
    .from('products')
    .select(`
      id,
      slug,
      sku,
      name,
      subtitle,
      short_description,
      description,
      price_paise,
      compare_at_paise,
      currency,
      show_price,
      public_availability,
      availability_note,
      badge,
      is_gift_eligible,
      feature_bullets,
      details,
      care_override,
      shipping_returns_override,
      seo_title,
      seo_description,
      category:categories(id, name, slug, default_care_text),
      claims:product_claims(claim_key),
      media:product_media(
        role,
        sort_order,
        is_primary,
        alt_override,
        media_asset:media_assets!inner(id, width, height, blur_data_url, alt_text)
      )
    `)
    .eq('slug', params.slug)
    .eq('status', 'published')
    .is('deleted_at', null)
    .single();

  if (error || !product) {
    return apiError('NOT_FOUND', 'Product not found', undefined, 404);
  }

  const res = apiSuccess(product);
  res.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
  return res;
}
