import { NextRequest } from 'next/server';
import { authenticateStaff } from '@/lib/auth/jwt';
import { apiError, apiSuccess } from '@/lib/response/envelope';

export async function GET(req: NextRequest) {
  const staff = await authenticateStaff(req);
  if (!staff) {
    return apiError('UNAUTHORIZED', 'Invalid or missing staff session', undefined, 401);
  }

  return apiSuccess({
    id: staff.id,
    email: staff.email,
    roles: staff.roles,
  });
}
