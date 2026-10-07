import { NextRequest } from 'next/server';
import { authenticateStaff } from '@/lib/auth/jwt';
import { getAdminSupabase } from '@/lib/supabase/admin';
import { apiError, apiSuccess } from '@/lib/response/envelope';
import { z } from 'zod';

const TransitionSchema = z.object({
  to_status: z.enum([
    'new',
    'supplier_check',
    'availability_confirmed',
    'customer_confirmed',
    'unavailable',
    'cancelled',
  ]),
  notes: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const staff = await authenticateStaff(req);
  if (!staff) {
    return apiError('UNAUTHORIZED', 'Staff authentication required', undefined, 401);
  }

  try {
    const body = await req.json();
    const parsed = TransitionSchema.safeParse(body);
    if (!parsed.success) {
      return apiError('VALIDATION_FAILED', 'Invalid transition parameters', parsed.error.flatten().fieldErrors, 422);
    }

    const supabase = getAdminSupabase();
    if (!supabase) {
      return apiError('CONFIG_ERROR', 'Database client unavailable', undefined, 500);
    }

    const { data, error } = await supabase.rpc('transition_enquiry', {
      p_enquiry_id: params.id,
      p_to_status: parsed.data.to_status,
      p_notes: parsed.data.notes || null,
    });

    if (error) {
      return apiError('RPC_ERROR', error.message, undefined, 400);
    }

    return apiSuccess(data);
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', err?.message || 'Transition failed', undefined, 500);
  }
}
