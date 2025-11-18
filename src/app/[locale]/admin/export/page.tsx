/**
 * Data Export Management Page
 * Export game data to JSON files
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import ExportClient from './export-client';

export default function ExportPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-foreground text-3xl font-bold">Data Export</h1>
        <p className="text-muted-foreground mt-2">Export game data to JSON files</p>
      </div>

      {/* Export Interface */}
      <Card>
        <CardHeader>
          <CardTitle>Export Data</CardTitle>
          <CardDescription>
            Export game categories, tags, featured collections, and games data to JSON files.
            The exported files will match the format required for data migration and backups.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ExportClient />
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Export Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-foreground mb-2 font-semibold">What gets exported?</h3>
            <ul className="text-muted-foreground list-inside list-disc space-y-1 text-sm">
              <li>
                <strong>Categories:</strong> All category data including name, slug, icon, and SEO metadata
              </li>
              <li>
                <strong>Tags:</strong> All tag data including name, slug, and descriptions
              </li>
              <li>
                <strong>Featured:</strong> All featured collection data with metadata
              </li>
              <li>
                <strong>Games:</strong> All game data with resolved category/tag names, complete metadata, and individual
                markdown content files (exported as a ZIP archive)
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-foreground mb-2 font-semibold">Export Format</h3>
            <ul className="text-muted-foreground list-inside list-disc space-y-1 text-sm">
              <li>Categories, tags, and featured: Single JSON files with metadata</li>
              <li>
                Games: ZIP archive containing:
                <ul className="ml-6 mt-1 list-inside list-circle">
                  <li>games.json - Game metadata and references</li>
                  <li>content/ - Folder with individual .md files for each game</li>
                </ul>
              </li>
              <li>All JSON files use 2-space indentation</li>
              <li>All files are UTF-8 encoded</li>
            </ul>
          </div>

          <div>
            <h3 className="text-foreground mb-2 font-semibold">Notes</h3>
            <ul className="text-muted-foreground list-inside list-disc space-y-1 text-sm">
              <li>Only non-deleted records are exported</li>
              <li>Game category and tag names are resolved from UUIDs</li>
              <li>
                The <code>contentPath</code> field in games.json matches the file path in the ZIP archive
              </li>
              <li>
                Markdown file names are generated from game titles in kebab-case format (e.g., "Undead Corridor" →{' '}
                <code>undead-corridor.md</code>)
              </li>
              <li>Export is performed in real-time from the current database state</li>
              <li>Large exports may take a few seconds to complete</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
