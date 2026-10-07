import { NextRequest } from 'next/server';
import { authenticateStaff } from '@/lib/auth/jwt';
import { getAdminSupabase } from '@/lib/supabase/admin';
import { apiError, apiSuccess } from '@/lib/response/envelope';
import { recordAuditLog } from '@/lib/audit/logger';

export async function GET(req: NextRequest) {
  const staff = await authenticateStaff(req);
  if (!staff) {
    return apiError('UNAUTHORIZED', 'Staff authentication required', undefined, 401);
  }

  const supabase = getAdminSupabase();
  if (!supabase) {
    return apiError('CONFIG_ERROR', 'Database client unavailable', undefined, 500);
  }

  const [settingsRes, trustRes] = await Promise.all([
    supabase.from('site_settings').select('*'),
    supabase.from('trust_items').select('*').order('sort_order', { ascending: true }),
  ]);

  if (settingsRes.error) {
    return apiError('DB_ERROR', settingsRes.error.message, undefined, 500);
  }

  return apiSuccess({
    settings: settingsRes.data || [],
    trust_items: trustRes.data || [],
  });
}

export async function PUT(req: NextRequest) {
  const staff = await authenticateStaff(req);
  if (!staff) {
    return apiError('UNAUTHORIZED', 'Staff authentication required', undefined, 401);
  }

  const supabase = getAdminSupabase();
  if (!supabase) {
    return apiError('CONFIG_ERROR', 'Database client unavailable', undefined, 500);
  }

  try {
    const body = await req.json();
    const { key, value } = body;

    if (!key) {
      return apiError('VALIDATION_FAILED', 'Setting key is required', undefined, 422);
    }

    const { data, error } = await supabase
      .from('site_settings')
      .upsert({
        key,
        value,
        updated_by: staff.id,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return apiError('DB_ERROR', error.message, undefined, 500);
    }

    await recordAuditLog({
      actor: staff,
      action: 'update_setting',
      entityType: 'site_setting',
      entityId: key,
      after: { value },
    });

    return apiSuccess(data);
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', err?.message || 'Failed to update setting', undefined, 500);
  }
}
