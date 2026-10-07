import { NextRequest } from 'next/server';
import { authenticateStaff } from '@/lib/auth/jwt';
import { getAdminSupabase } from '@/lib/supabase/admin';
import { apiError, apiSuccess } from '@/lib/response/envelope';
import { z } from 'zod';

const UpdateUserSchema = z.object({
  role: z.enum(['owner', 'admin', 'content_editor', 'sourcing_manager', 'fulfilment_manager', 'support_agent', 'analyst']).optional(),
  is_active: z.boolean().optional(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const staff = await authenticateStaff(req);
  if (!staff) return apiError('UNAUTHORIZED', 'Staff auth required', undefined, 401);

  try {
    const body = await req.json();
    const parsed = UpdateUserSchema.safeParse(body);
    if (!parsed.success) {
      return apiError('VALIDATION_FAILED', 'Invalid update parameters', parsed.error.flatten().fieldErrors, 422);
    }

    const supabase = getAdminSupabase();
    if (!supabase) return apiError('CONFIG_ERROR', 'Database client unavailable', undefined, 500);

    if (parsed.data.is_active !== undefined) {
      await supabase
        .from('profiles')
        .update({ is_active: parsed.data.is_active })
        .eq('id', params.id);
    }

    if (parsed.data.role) {
      // Clear existing and grant new role
      await supabase.from('user_roles').delete().eq('user_id', params.id);
      await supabase.from('user_roles').insert({
        user_id: params.id,
        role: parsed.data.role,
        granted_by: staff.id,
      });
    }

    return apiSuccess({ updated: true });
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', err?.message || 'Failed to update user', undefined, 500);
  }
}
