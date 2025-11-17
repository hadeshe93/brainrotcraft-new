/**
 * 内容面板组件
 * 用于展示原始内容或改写后的内容
 */

import { cn } from '@/lib/utils';
import type { SEOContent } from '@/services/content/rewrite-prompts';

interface ContentPanelProps {
  title: string;
  content: SEOContent | null;
  highlight?: boolean;
}

export default function ContentPanel({ title, content, highlight = false }: ContentPanelProps) {
  if (!content) {
    return (
      <div
        className={cn('rounded-lg border p-4', highlight ? 'border-primary bg-primary/5' : 'border-border bg-muted/30')}
      >
        <h3 className="mb-3 text-sm font-semibold">{title}</h3>
        <div className="text-muted-foreground text-sm">无内容</div>
      </div>
    );
  }

  return (
    <div
      className={cn('rounded-lg border p-4', highlight ? 'border-primary bg-primary/5' : 'border-border bg-muted/30')}
    >
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>

      <div className="space-y-3">
        {/* Metadata Title */}
        <div>
          <label className="text-muted-foreground mb-1 block text-xs font-medium">Metadata Title</label>
          <div className="bg-background rounded border p-2 text-sm">{content.metadataTitle}</div>
        </div>

        {/* Metadata Description */}
        <div>
          <label className="text-muted-foreground mb-1 block text-xs font-medium">Metadata Description</label>
          <div className="bg-background rounded border p-2 text-sm">{content.metadataDescription}</div>
        </div>

        {/* Content */}
        <div>
          <label className="text-muted-foreground mb-1 block text-xs font-medium">Content</label>
          <div className="bg-background max-h-[300px] overflow-auto rounded border p-2 text-sm">
            <pre className="font-sans whitespace-pre-wrap">{content.content}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}
