import { NextRequest } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase/admin';
import { apiError, apiSuccess } from '@/lib/response/envelope';
import { z } from 'zod';

const ContactSchema = z.object({
  full_name: z.string().min(2, 'Name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().optional(),
  subject: z.string().min(3, 'Subject is required'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
});

export async function POST(req: NextRequest) {
  const internalKey = req.headers.get('x-internal-key');
  const expectedKey = process.env.INTERNAL_API_KEY;

  if (expectedKey && internalKey !== expectedKey) {
    return apiError('FORBIDDEN', 'Direct public submission blocked. Route via boutique gateway.', undefined, 403);
  }

  try {
    const body = await req.json();
    const parsed = ContactSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        'VALIDATION_FAILED',
        'Invalid contact submission',
        parsed.error.flatten().fieldErrors,
        422
      );
    }

    const supabase = getAdminSupabase();
    if (!supabase) {
      return apiError('CONFIG_ERROR', 'Database client unavailable', undefined, 500);
    }

    const { full_name, email, phone, subject, message } = parsed.data;

    // Record as VIP enquiry with source = 'contact_form'
    let customerId: string | null = null;
    if (phone) {
      const cleanPhone = phone.replace(/[^0-9+]/g, '');
      const { data: cust } = await supabase
        .from('customers')
        .select('id')
        .eq('phone_e164', cleanPhone)
        .maybeSingle();

      if (cust) {
        customerId = cust.id;
      } else {
        const { data: newCust } = await supabase
          .from('customers')
          .insert({
            full_name,
            phone_e164: cleanPhone,
            email,
            consent_source: 'contact_form',
          })
          .select('id')
          .single();
        if (newCust) customerId = newCust.id;
      }
    }

    const { data: enquiry, error: enqErr } = await supabase
      .from('enquiries')
      .insert({
        customer_id: customerId,
        source: 'contact_form',
        message: `[Subject: ${subject}]\n${message}`,
        preferred_channel: 'email',
        consent_contact: true,
      })
      .select('id, reference')
      .single();

    if (enqErr) {
      return apiError('DB_ERROR', enqErr.message, undefined, 500);
    }

    return apiSuccess({
      reference: enquiry.reference,
      message: 'Your message has been received by our concierge team.',
    });
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', err?.message || 'Contact submission failed', undefined, 500);
  }
}
