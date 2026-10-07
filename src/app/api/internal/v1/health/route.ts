import { NextRequest } from 'next/server';
import { apiSuccess } from '@/lib/response/envelope';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  const adminClient = getSupabaseAdmin();
  const dbConfigured = !!adminClient;

  return apiSuccess({
    service: 'sbs-backend',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    env: process.env.APP_ENV || 'development',
    databaseConfigured: dbConfigured,
  });
}
