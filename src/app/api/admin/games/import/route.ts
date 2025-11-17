import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareEnv } from '@/services/base';
import { requireAdmin } from '@/lib/auth-helpers';
import { importGames, ImportStrategy, GameImportData } from '@/services/content/games';

export async function POST(request: NextRequest) {
  try {
    // 1. Check admin authorization
    await requireAdmin(request);

    // 2. Parse request body
    const body = (await request.json()) as any;
    const { data, strategy = 'upsert' as ImportStrategy, clearExisting = false } = body;

    // 3. Validate data
    if (!data || !Array.isArray(data)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request: "data" must be an array of game objects',
        },
        { status: 400 },
      );
    }

    if (data.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No games found in request data',
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

    // 5. Validate required fields for each game
    for (let i = 0; i < data.length; i++) {
      const game = data[i];
      if (!game.name || !game.slug) {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid game at index ${i}: missing required fields (name or slug)`,
          },
          { status: 400 },
        );
      }
    }

    // 6. Optional: Clear existing data (dangerous operation)
    if (clearExisting) {
      // TODO: Implement clearAllGames if needed
      // This is intentionally left unimplemented for safety
      console.warn('clearExisting flag is set but not implemented for safety reasons');
    }

    // 7. Transform data to GameImportData format
    const items: GameImportData[] = data.map((item) => ({
      name: item.name,
      slug: item.slug,
      thumbnail: item.thumbnail || item.coverImage || '',
      source: item.source || item.gameUrl || '',
      status: item.status || 'draft',
      categories: Array.isArray(item.categories) ? item.categories.map((c: string) => c.toLowerCase()) : [],
      tags: Array.isArray(item.tags)
        ? item.tags.map((t: string) =>
            t
              .toLowerCase()
              .replace(/\s+/g, '-')
              .replace(/[^a-z0-9-]/g, ''),
          )
        : [],
      introduction: item.introduction
        ? {
            metaTitle: item.introduction.metaTitle || item.metaTitle || item.name,
            metaDescription: item.introduction.metaDescription || item.metaDescription || '',
            content: item.introduction.content || item.content || '',
          }
        : undefined,
    }));

    // 8. Execute import
    const env = await getCloudflareEnv();
    const result = await importGames(items, strategy, env.DB);

    // 9. Return success response
    return NextResponse.json({
      success: true,
      data: result,
      message: `Successfully imported ${result.total} games (${result.created} created, ${result.updated} updated, ${result.skipped} skipped, ${result.failed} failed)`,
    });
  } catch (error) {
    console.error('Error importing games:', error);

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
        description: 'POST to this endpoint to import games. Send game data in the request body.',
        requestFormat: {
          data: 'Array of game objects (required)',
          strategy: 'Import strategy: upsert | skip_existing | overwrite (optional, default: upsert)',
          clearExisting: 'Clear existing data before import (optional, default: false)',
        },
        exampleRequest: {
          data: [
            {
              name: 'Geometry Dash',
              slug: 'geometry-dash',
              thumbnail: 'https://example.com/image.png',
              source: 'https://example.com/game',
              status: 'published',
              categories: ['action', 'arcade'],
              tags: ['rhythm', 'challenging'],
              introduction: {
                metaTitle: 'Play Geometry Dash Online',
                metaDescription: 'Jump and fly your way through danger...',
                content: 'Full game description here...',
              },
            },
          ],
          strategy: 'upsert',
        },
        notes: [
          'Categories and tags will be automatically normalized (lowercase, kebab-case)',
          'The API will create associations with existing categories and tags',
          'Missing categories or tags will generate warnings but not fail the import',
        ],
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
