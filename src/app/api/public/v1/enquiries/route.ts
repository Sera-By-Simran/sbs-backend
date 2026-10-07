import { NextRequest } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase/admin';
import { apiError, apiSuccess } from '@/lib/response/envelope';
import { z } from 'zod';

const EnquiryItemSchema = z.object({
  product_id: z.string().uuid(),
  quantity: z.number().int().min(1).default(1),
  customer_note: z.string().optional(),
});

const EnquirySubmissionSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().min(10, 'Valid 10-digit phone number is required'),
  email: z.string().email().optional().or(z.literal('')),
  preferred_channel: z.enum(['whatsapp', 'phone', 'email', 'instagram']).default('whatsapp'),
  occasion: z.string().optional(),
  needed_by: z.string().optional(),
  message: z.string().optional(),
  marketing_consent: z.boolean().default(false),
  items: z.array(EnquiryItemSchema).min(1, 'Please select at least one jewellery piece'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = EnquirySubmissionSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        'VALIDATION_FAILED',
        'Invalid enquiry submission payload',
        parsed.error.flatten().fieldErrors,
        422
      );
    }

    const data = parsed.data;
    const supabase = getAdminSupabase();

    // 1. Find or create customer by phone
    let customerId: string | null = null;
    const cleanPhone = data.phone.replace(/[^0-9+]/g, '');

    const { data: existingCust } = await supabase
      .from('customers')
      .select('id')
      .eq('phone_e164', cleanPhone)
      .maybeSingle();

    if (existingCust) {
      customerId = existingCust.id;
      // Update name/email if provided
      await supabase
        .from('customers')
        .update({
          full_name: data.full_name,
          email: data.email || null,
          marketing_consent: data.marketing_consent,
          updated_at: new Date().toISOString(),
        })
        .eq('id', customerId);
    } else {
      const { data: newCust, error: custErr } = await supabase
        .from('customers')
        .insert({
          full_name: data.full_name,
          phone_e164: cleanPhone,
          email: data.email || null,
          preferred_channel: data.preferred_channel,
          marketing_consent: data.marketing_consent,
          consent_source: 'boutique_enquiry_form',
        })
        .select('id')
        .single();

      if (custErr) {
        throw new Error(`Customer record creation failed: ${custErr.message}`);
      }
      customerId = newCust.id;
    }

    // 2. Create enquiry record
    const { data: enquiry, error: enqErr } = await supabase
      .from('enquiries')
      .insert({
        customer_id: customerId,
        source: 'boutique_concierge_tray',
        message: data.message || null,
        occasion: data.occasion || null,
        needed_by: data.needed_by || null,
        preferred_channel: data.preferred_channel,
        consent_contact: true,
        consent_marketing: data.marketing_consent,
      })
      .select('id, reference')
      .single();

    if (enqErr) {
      throw new Error(`Enquiry creation failed: ${enqErr.message}`);
    }

    // 3. Resolve and snapshot enquiry items
    const productIds = data.items.map((i) => i.product_id);
    const { data: products } = await supabase
      .from('products')
      .select('id, name, sku, price_paise')
      .in('id', productIds);

    const productMap = new Map((products || []).map((p: any) => [p.id, p]));

    const itemsToInsert = data.items.map((item) => {
      const product = productMap.get(item.product_id);
      return {
        enquiry_id: enquiry.id,
        product_id: item.product_id,
        quantity: item.quantity,
        customer_note: item.customer_note || null,
        name_snapshot: product?.name || 'Selected Piece',
        sku_snapshot: product?.sku || 'UNKNOWN',
        price_paise_snapshot: product?.price_paise || 0,
      };
    });

    if (itemsToInsert.length > 0) {
      const { error: itemsErr } = await supabase
        .from('enquiry_items')
        .insert(itemsToInsert);

      if (itemsErr) {
        console.error('Failed to snapshot enquiry items:', itemsErr);
      }
    }

    return apiSuccess({
      enquiry_id: enquiry.id,
      reference: enquiry.reference,
      customer_name: data.full_name,
      preferred_channel: data.preferred_channel,
      message: 'Your bespoke enquiry has been submitted. A SÉRA private concierge will reach out to you shortly.',
    }, 201);
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', err?.message || 'Failed to submit enquiry', undefined, 500);
  }
}
