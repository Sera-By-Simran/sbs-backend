import { NextRequest } from 'next/server';

/**
 * Validates the internal API key sent by Frontend BFF in x-internal-key header.
 */
export function verifyInternalKey(req: NextRequest): boolean {
  const expectedKey = process.env.INTERNAL_API_KEY;
  if (!expectedKey) return false;

  const headerKey = req.headers.get('x-internal-key');
  if (!headerKey) return false;

  return headerKey === expectedKey;
}
