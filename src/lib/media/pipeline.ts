import sharp from 'sharp';
import crypto from 'crypto';
import { getSupabaseAdmin } from '../supabase/admin';
import { MediaRole, MediaSource, MediaVisibility } from '@/types/database';

export interface ProcessMediaInput {
  buffer: Buffer;
  filename: string;
  mime: string;
  role?: MediaRole;
  source?: MediaSource;
  visibility?: MediaVisibility;
  altText?: string;
  uploadedBy?: string;
}

export interface ProcessedMediaResult {
  assetId: string;
  url: string;
  blurDataUrl: string;
  width: number;
  height: number;
  aspectRatio: number;
}

const DERIVATIVE_WIDTHS = [320, 640, 1024, 1440];

export async function processAndStoreMedia(input: ProcessMediaInput): Promise<ProcessedMediaResult> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    throw new Error('Supabase admin client not initialized');
  }

  const checksum = crypto.createHash('sha256').update(input.buffer).digest('hex');
  const metadata = await sharp(input.buffer).metadata();
  const width = metadata.width || 800;
  const height = metadata.height || 800;
  const aspectRatio = Number((width / height).toFixed(2));

  // 1. Generate low-res blurred base64 placeholder (≤ 1KB)
  const blurBuffer = await sharp(input.buffer)
    .resize(20, 20, { fit: 'inside' })
    .webp({ quality: 20 })
    .toBuffer();
  const blurDataUrl = `data:image/webp;base64,${blurBuffer.toString('base64')}`;

  const assetId = crypto.randomUUID();
  const baseFilename = pathSanitize(input.filename.replace(/\.[^/.]+$/, ''));
  const originalPath = `originals/${assetId}/${input.filename}`;

  // 2. Upload original to media-originals bucket
  await supabase.storage
    .from('media-originals')
    .upload(originalPath, input.buffer, {
      contentType: input.mime,
      upsert: true,
    });

  // 3. Insert Master Asset row
  const { error: assetError } = await supabase.from('media_assets').insert({
    id: assetId,
    kind: 'image',
    visibility: input.visibility || 'public',
    bucket: 'media-originals',
    path: originalPath,
    original_filename: input.filename,
    mime: input.mime,
    bytes: input.buffer.length,
    width,
    height,
    aspect_ratio: aspectRatio,
    checksum_sha256: checksum,
    blur_data_url: blurDataUrl,
    alt_text: input.altText || input.filename,
    source: input.source || 'studio_photo',
    processing_status: 'ready',
    uploaded_by: input.uploadedBy || null,
  });

  if (assetError) {
    throw new Error(`Failed to insert media asset: ${assetError.message}`);
  }

  // 4. Generate & upload derivatives to media-public
  const derivativePromises = DERIVATIVE_WIDTHS.filter(w => w <= width + 200).map(async (targetWidth) => {
    // Generate WebP
    const webpBuffer = await sharp(input.buffer)
      .resize(targetWidth, null, { withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    const webpPath = `derivatives/${assetId}/${targetWidth}w.webp`;
    await supabase.storage.from('media-public').upload(webpPath, webpBuffer, {
      contentType: 'image/webp',
      upsert: true,
    });

    await supabase.from('media_derivatives').insert({
      media_id: assetId,
      format: 'webp',
      width: targetWidth,
      path: webpPath,
      bytes: webpBuffer.length,
    });

    // Generate JPEG fallback
    const jpegBuffer = await sharp(input.buffer)
      .resize(targetWidth, null, { withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();

    const jpegPath = `derivatives/${assetId}/${targetWidth}w.jpeg`;
    await supabase.storage.from('media-public').upload(jpegPath, jpegBuffer, {
      contentType: 'image/jpeg',
      upsert: true,
    });

    await supabase.from('media_derivatives').insert({
      media_id: assetId,
      format: 'jpeg',
      width: targetWidth,
      path: jpegPath,
      bytes: jpegBuffer.length,
    });
  });

  await Promise.all(derivativePromises);

  // Public URL for main derivative
  const { data: publicUrlData } = supabase.storage
    .from('media-public')
    .getPublicUrl(`derivatives/${assetId}/${Math.min(640, width)}w.webp`);

  return {
    assetId,
    url: publicUrlData.publicUrl,
    blurDataUrl,
    width,
    height,
    aspectRatio,
  };
}

function pathSanitize(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
}
