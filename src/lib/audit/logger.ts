import crypto from 'crypto';
import { getSupabaseAdmin } from '../supabase/admin';
import { AuthenticatedStaff } from '../auth/jwt';

export interface AuditLogEntry {
  actor?: AuthenticatedStaff | null;
  action: string;
  entityType: string;
  entityId: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  diff?: Record<string, unknown> | null;
  ip?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
}

const PII_KEYS = new Set(['phone', 'phone_e164', 'email', 'ship_phone', 'ship_line1', 'ship_line2', 'password']);

function redactPII(obj: Record<string, unknown> | null | undefined): Record<string, unknown> | null {
  if (!obj) return null;
  const cleaned: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (PII_KEYS.has(k.toLowerCase())) {
      cleaned[k] = '[redacted]';
    } else if (v && typeof v === 'object' && !Array.isArray(v)) {
      cleaned[k] = redactPII(v as Record<string, unknown>);
    } else {
      cleaned[k] = v;
    }
  }
  return cleaned;
}

export function hashIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  const salt = process.env.IP_HASH_SALT || 'sera_salt_default';
  return crypto.createHash('sha256').update(`${ip}:${salt}`).digest('hex').substring(0, 32);
}

export async function recordAuditLog(entry: AuditLogEntry): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const actorId = entry.actor?.id || null;
  const actorRoles = entry.actor?.roles || [];

  try {
    await supabase.from('audit_logs').insert({
      actor_id: actorId,
      actor_role_snapshot: actorRoles,
      action: entry.action,
      entity_type: entry.entityType,
      entity_id: entry.entityId,
      before: redactPII(entry.before),
      after: redactPII(entry.after),
      diff: entry.diff || null,
      ip_hash: hashIp(entry.ip),
      user_agent_hash: entry.userAgent ? crypto.createHash('md5').update(entry.userAgent).digest('hex') : null,
      request_id: entry.requestId || null,
    });
  } catch (err) {
    console.error('Failed to record audit log:', err);
  }
}
