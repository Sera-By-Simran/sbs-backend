import { NextRequest } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase/admin';
import { apiError, apiSuccess } from '@/lib/response/envelope';
import { z } from 'zod';

const NewsletterSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  source: z.string().default('footer_newsletter'),
});

export async function POST(req: NextRequest) {
  const internalKey = req.headers.get('x-internal-key');
  const expectedKey = process.env.INTERNAL_API_KEY;

  if (expectedKey && internalKey !== expectedKey) {
    return apiError('FORBIDDEN', 'Direct public submission blocked. Route via boutique gateway.', undefined, 403);
  }

  try {
    const body = await req.json();
    const parsed = NewsletterSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        'VALIDATION_FAILED',
        'Invalid newsletter subscription',
        parsed.error.flatten().fieldErrors,
        422
      );
    }

    const supabase = getAdminSupabase();
    if (!supabase) {
      return apiError('CONFIG_ERROR', 'Database client unavailable', undefined, 500);
    }

    const { email, source } = parsed.data;

    // Upsert into newsletter_subscribers
    const { data, error } = await supabase
      .from('newsletter_subscribers')
      .upsert(
        {
          email,
          source,
          status: 'confirmed',
          consent_at: new Date().toISOString(),
        },
        { onConflict: 'email' }
      )
      .select('id, email, status')
      .single();

    if (error) {
      return apiError('DB_ERROR', error.message, undefined, 500);
    }

    return apiSuccess({
      email: data.email,
      message: 'You have been enrolled in the SÉRA Private Client Journal.',
    });
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', err?.message || 'Newsletter subscription failed', undefined, 500);
  }
}
