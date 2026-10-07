import { NextRequest } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase/admin';
import { apiError, apiSuccess } from '@/lib/response/envelope';

export async function GET(req: NextRequest) {
  const supabase = getAdminSupabase();
  if (!supabase) {
    return apiError('CONFIG_ERROR', 'Database client unavailable', undefined, 500);
  }

  const [trustRes, settingsRes] = await Promise.all([
    supabase
      .from('trust_items')
      .select('id, icon_key, title, subtitle')
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
    supabase
      .from('site_settings')
      .select('key, value')
      .eq('is_public', true),
  ]);

  if (trustRes.error) {
    return apiError('DB_ERROR', trustRes.error.message, undefined, 500);
  }

  const settingsDict: Record<string, any> = {};
  (settingsRes.data || []).forEach((s: any) => {
    settingsDict[s.key] = s.value;
  });

  return apiSuccess({
    trust_items: trustRes.data || [],
    settings: settingsDict,
  });
}
