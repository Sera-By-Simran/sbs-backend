import { NextRequest } from 'next/server';
import { authenticateStaff } from '@/lib/auth/jwt';
import { getAdminSupabase } from '@/lib/supabase/admin';
import { apiError, apiSuccess } from '@/lib/response/envelope';
import path from 'path';
import fs from 'fs';
import * as XLSX from 'xlsx';

export async function GET(req: NextRequest) {
  const staff = await authenticateStaff(req);
  if (!staff) return apiError('UNAUTHORIZED', 'Staff auth required', undefined, 401);

  try {
    // Locate the master spreadsheet in read-only mode
    const sheetPath = path.resolve(process.cwd(), '../../Sheets/SERA_BY_SIMRAN_PRODUCT_CATALOG_SYSTEM.xlsx');

    if (!fs.existsSync(sheetPath)) {
      return apiError('NOT_FOUND', `Spreadsheet not found at ${sheetPath}`, undefined, 404);
    }

    const fileBuffer = fs.readFileSync(sheetPath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });

    const sheetName = workbook.SheetNames.includes('Product Catalog')
      ? 'Product Catalog'
      : workbook.SheetNames[0];

    const worksheet = workbook.Sheets[sheetName];
    const rows: any[] = XLSX.utils.sheet_to_json(worksheet);

    const analysis = {
      sheet_name: sheetName,
      available_sheets: workbook.SheetNames,
      total_rows: rows.length,
      sample_rows: rows.slice(0, 5).map((r) => ({
        sku: r.SKU || r.sku,
        name: r['Product Name'] || r.name,
        category: r.Category || r.category,
        collection: r.Collection || r.collection,
        selling_price_inr: r['Selling Price (₹)'] || r.price,
        supplier_cost_inr: r['Supplier Cost (₹)'] || r.cost,
        supplier: r.Supplier,
        material: r['Material / Finish'],
        is_template: (r['Product Description'] || '').includes('TEMPLATE'),
      })),
      validation: {
        valid_sku_count: rows.filter((r) => r.SKU && String(r.SKU).trim().length > 0).length,
        template_row_count: rows.filter((r) => (r['Product Description'] || '').includes('TEMPLATE')).length,
        distinct_categories: Array.from(new Set(rows.map((r) => r.Category).filter(Boolean))),
        distinct_collections: Array.from(new Set(rows.map((r) => r.Collection).filter(Boolean))),
      },
    };

    return apiSuccess(analysis);
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', err?.message || 'Failed to inspect catalog sheet', undefined, 500);
  }
}

export async function POST(req: NextRequest) {
  const staff = await authenticateStaff(req);
  if (!staff) return apiError('UNAUTHORIZED', 'Staff auth required', undefined, 401);

  try {
    const body = await req.json();
    const dryRun = body.dry_run !== false; // Default to dry-run safe mode

    const sheetPath = path.resolve(process.cwd(), '../../Sheets/SERA_BY_SIMRAN_PRODUCT_CATALOG_SYSTEM.xlsx');
    if (!fs.existsSync(sheetPath)) {
      return apiError('NOT_FOUND', 'Catalog spreadsheet not found', undefined, 404);
    }

    const fileBuffer = fs.readFileSync(sheetPath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const worksheet = workbook.Sheets['Product Catalog'] || workbook.Sheets[workbook.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(worksheet);

    // Filter out obvious placeholder template rows unless force is requested
    const validRows = rows.filter((r) => {
      const isTemplate = (r['Product Description'] || '').includes('TEMPLATE');
      if (isTemplate && !body.include_templates) return false;
      return r.SKU && r['Product Name'] && r['Selling Price (₹)'];
    });

    if (dryRun) {
      return apiSuccess({
        mode: 'dry_run',
        message: 'Validation simulation complete. Zero changes written to database.',
        eligible_records_count: validRows.length,
        skipped_template_count: rows.length - validRows.length,
        preview: validRows.slice(0, 10).map((r) => ({
          sku: r.SKU,
          name: r['Product Name'],
          price_paise: Math.round(Number(r['Selling Price (₹)']) * 100),
          category: r.Category,
        })),
      });
    }

    // Live import branch when user explicitly submits real items
    const supabase = getAdminSupabase();
    if (!supabase) return apiError('CONFIG_ERROR', 'Database client unavailable', undefined, 500);

    let inserted = 0;
    for (const r of validRows) {
      const slug = String(r['Product Name']).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const pricePaise = Math.round(Number(r['Selling Price (₹)']) * 100);

      const { error: insErr } = await supabase.from('products').upsert(
        {
          sku: r.SKU,
          slug: `${slug}-${r.SKU.toLowerCase()}`,
          name: r['Product Name'],
          price_paise: pricePaise,
          publish_status: 'draft',
          public_availability: 'available_to_order',
        },
        { onConflict: 'sku' }
      );

      if (!insErr) inserted++;
    }

    return apiSuccess({
      mode: 'live_commit',
      imported_count: inserted,
      total_eligible: validRows.length,
    });
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', err?.message || 'Import execution failed', undefined, 500);
  }
}
