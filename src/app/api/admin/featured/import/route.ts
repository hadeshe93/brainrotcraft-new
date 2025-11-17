/**
 * Featured Collections Import API
 * POST /api/admin/featured/import
 * Cloudflare Workers Compatible (no file system access)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareEnv } from '@/services/base';
import { requireAdmin } from '@/lib/auth-helpers';
import { importFeatured, ImportStrategy, FeaturedImportData } from '@/services/content/featured';

/**
 * Import featured collections from request body
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin permission
    await requireAdmin(request);

    // Parse request body
    const body = await request.json();
    const { data, strategy = 'upsert' as ImportStrategy } = body;

    // Validate data
    if (!data || !Array.isArray(data)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request: "data" must be an array of featured collections',
        },
        { status: 400 },
      );
    }

    if (data.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request: "data" array cannot be empty',
        },
        { status: 400 },
      );
    }

    // Validate strategy
    if (!['upsert', 'skip_existing', 'overwrite'].includes(strategy)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid strategy. Must be one of: upsert, skip_existing, overwrite',
        },
        { status: 400 },
      );
    }

    // Validate required fields in each item
    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      if (!item.name || !item.slug) {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid featured collection at index ${i}: missing required fields (name, slug)`,
          },
          { status: 400 },
        );
      }
    }

    // Map to import format
    const items: FeaturedImportData[] = data.map((item) => ({
      name: item.name,
      slug: item.slug,
      content: item.content || '',
      metaTitle: item.metaTitle || item.metadataTitle || item.name,
      metaDescription: item.metaDescription || item.metadataDescription || '',
    }));

    // Get Cloudflare environment
    const env = await getCloudflareEnv();

    // Import featured collections
    const result = await importFeatured(items, strategy, env.DB);

    return NextResponse.json({
      success: true,
      data: result,
      message: `Imported ${result.created} new, updated ${result.updated}, skipped ${result.skipped}, failed ${result.failed} featured collections`,
    });
  } catch (error) {
    console.error('Featured import error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to import featured collections',
      },
      { status: 500 },
    );
  }
}
