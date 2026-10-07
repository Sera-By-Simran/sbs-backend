import { NextRequest } from 'next/server';
import { authenticateStaff } from '@/lib/auth/jwt';
import { can } from '@/lib/auth/rbac';
import { apiError, apiSuccess } from '@/lib/response/envelope';
import { processAndStoreMedia } from '@/lib/media/pipeline';
import { MediaRole, MediaSource, MediaVisibility } from '@/types/database';

export async function POST(req: NextRequest) {
  const staff = await authenticateStaff(req);
  if (!staff || !can(staff, 'create', 'media')) {
    return apiError('FORBIDDEN', 'Insufficient permissions to upload media', undefined, 403);
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const altText = (formData.get('alt_text') as string) || '';
    const role = (formData.get('role') as MediaRole) || 'showcase';
    const source = (formData.get('source') as MediaSource) || 'studio_photo';
    const visibility = (formData.get('visibility') as MediaVisibility) || 'public';

    if (!file) {
      return apiError('VALIDATION_ERROR', 'No file uploaded', undefined, 400);
    }

    if (visibility === 'public' && !altText.trim()) {
      return apiError('VALIDATION_ERROR', 'Alt text is required for public media', undefined, 422);
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await processAndStoreMedia({
      buffer,
      filename: file.name,
      mime: file.type,
      role,
      source,
      visibility,
      altText,
      uploadedBy: staff.id,
    });

    return apiSuccess(result, undefined, 201);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Upload processing failed';
    return apiError('UPLOAD_FAILED', message, undefined, 500);
  }
}
