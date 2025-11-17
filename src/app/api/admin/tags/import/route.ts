import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareEnv } from '@/services/base';
import { requireAdmin } from '@/lib/auth-helpers';
import { importTags, ImportStrategy, TagImportData } from '@/services/content/tags';

export async function POST(request: NextRequest) {
  try {
    // 1. Check admin authorization
    await requireAdmin(request);

    // 2. Parse request body
    const body = await request.json();
    const { data, strategy = 'upsert' as ImportStrategy, clearExisting = false } = body;

    // 3. Validate data
    if (!data || !Array.isArray(data)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request: "data" must be an array of tag objects',
        },
        { status: 400 },
      );
    }

    if (data.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No tags found in request data',
        },
        { status: 400 },
      );
    }

    // 4. Validate strategy
    if (!['upsert', 'skip_existing', 'overwrite'].includes(strategy)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid strategy. Must be one of: upsert, skip_existing, overwrite',
        },
        { status: 400 },
      );
    }

    // 5. Validate required fields for each tag
    for (let i = 0; i < data.length; i++) {
      const tag = data[i];
      if (!tag.name || !tag.slug) {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid tag at index ${i}: missing required fields (name or slug)`,
          },
          { status: 400 },
        );
      }
    }

    // 6. Optional: Clear existing data (dangerous operation)
    if (clearExisting) {
      // TODO: Implement clearAllTags if needed
      // This is intentionally left unimplemented for safety
      console.warn('clearExisting flag is set but not implemented for safety reasons');
    }

    // 7. Execute import
    const env = await getCloudflareEnv();
    const items: TagImportData[] = data.map((item) => ({
      name: item.name,
      slug: item.slug,
      content: item.content || '',
      metaTitle: item.metaTitle || item.metadataTitle || item.name,
      metaDescription: item.metaDescription || item.metadataDescription || '',
    }));

    const result = await importTags(items, strategy, env.DB);

    // 8. Return success response
    return NextResponse.json({
      success: true,
      data: result,
      message: `Successfully imported ${result.total} tags (${result.created} created, ${result.updated} updated, ${result.skipped} skipped, ${result.failed} failed)`,
    });
  } catch (error) {
    console.error('Error importing tags:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 },
    );
  }
}

/**
 * GET handler to check import API information
 */
export async function GET() {
  try {
    await requireAdmin();

    return NextResponse.json({
      success: true,
      data: {
        supportedStrategies: ['upsert', 'skip_existing', 'overwrite'],
        description: 'POST to this endpoint to import tags. Send tag data in the request body.',
        requestFormat: {
          data: 'Array of tag objects (required)',
          strategy: 'Import strategy: upsert | skip_existing | overwrite (optional, default: upsert)',
          clearExisting: 'Clear existing data before import (optional, default: false)',
        },
        exampleRequest: {
          data: [
            {
              name: 'Multiplayer',
              slug: 'multiplayer',
              content: 'Multiplayer games content...',
              metaTitle: 'Multiplayer Games',
              metaDescription: 'Play with friends online...',
            },
          ],
          strategy: 'upsert',
        },
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 },
    );
  }
}
