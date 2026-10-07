import { NextRequest } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase/admin';
import { apiError, apiSuccess } from '@/lib/response/envelope';
import { z } from 'zod';

const TrackOrderSchema = z.object({
  reference: z.string().min(5, 'Order reference required'),
  phone: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const internalKey = req.headers.get('x-internal-key');
  const expectedKey = process.env.INTERNAL_API_KEY;

  if (expectedKey && internalKey !== expectedKey) {
    return apiError('FORBIDDEN', 'Direct public tracking blocked. Route via boutique gateway.', undefined, 403);
  }

  try {
    const body = await req.json();
    const parsed = TrackOrderSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        'VALIDATION_FAILED',
        'Invalid tracking request',
        parsed.error.flatten().fieldErrors,
        422
      );
    }

    const supabase = getAdminSupabase();
    if (!supabase) {
      return apiError('CONFIG_ERROR', 'Database client unavailable', undefined, 500);
    }

    const { reference, phone } = parsed.data;
    const cleanRef = reference.trim().toUpperCase();

    // Query order with items and shipments (NO private supplier details)
    let query = supabase
      .from('orders')
      .select(`
        id,
        reference,
        status,
        ordered_at,
        sourced_at,
        qc_at,
        packed_at,
        dispatched_at,
        delivered_at,
        total_paise,
        ship_name,
        ship_city,
        ship_state,
        ship_pincode,
        order_items (
          id,
          name_snapshot,
          sku_snapshot,
          quantity,
          unit_price_paise,
          line_total_paise
        ),
        shipments (
          id,
          carrier,
          tracking_no,
          tracking_url,
          dispatched_at,
          estimated_delivery_at,
          delivered_at
        )
      `)
      .ilike('reference', cleanRef)
      .maybeSingle();

    const { data: order, error } = await query;

    if (error || !order) {
      return apiError('NOT_FOUND', 'No boutique order found matching this reference.', undefined, 404);
    }

    // Optional phone check if phone provided
    if (phone) {
      const cleanPhone = phone.replace(/[^0-9]/g, '');
      const { data: custCheck } = await supabase
        .from('orders')
        .select('ship_phone')
        .eq('id', order.id)
        .single();

      if (custCheck && !custCheck.ship_phone.endsWith(cleanPhone.slice(-4))) {
        return apiError('FORBIDDEN', 'Verification details do not match this order reference.', undefined, 403);
      }
    }

    return apiSuccess({
      order: {
        reference: order.reference,
        status: order.status,
        ordered_at: order.ordered_at,
        dispatched_at: order.dispatched_at,
        delivered_at: order.delivered_at,
        recipient: {
          name: order.ship_name,
          city: order.ship_city,
          state: order.ship_state,
          pincode: order.ship_pincode,
        },
        items: order.order_items,
        shipment: order.shipments?.[0] || null,
      },
    });
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', err?.message || 'Order tracking lookup failed', undefined, 500);
  }
}
