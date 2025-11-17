/**
 * Sidebar Data API Endpoint
 * Provides categories and tags data for sidebar navigation
 * Used by Header component (mobile menu) and can be shared across the app
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareEnv } from '@/services/base';
import { getSidebarData } from '@/services/content/home';

export async function GET(request: NextRequest) {
  try {
    // Get Cloudflare D1 database
    const env = await getCloudflareEnv();
    const db = (env as any).DB as D1Database;

    // Fetch categories and tags in parallel
    const data = await getSidebarData(db);

    // Return the data
    return NextResponse.json(data, {
      headers: {
        // Cache for 5 minutes
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('Failed to fetch sidebar data:', error);
    return NextResponse.json({ error: 'Failed to fetch sidebar data' }, { status: 500 });
  }
}
