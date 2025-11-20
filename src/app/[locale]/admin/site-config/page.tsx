'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import dynamic from 'next/dynamic';

// 动态导入 react-json-view 避免 SSR 问题
const ReactJson = dynamic(() => import('react-json-view'), {
  ssr: false,
  loading: () => <div className="text-muted-foreground animate-pulse">Loading JSON editor...</div>,
});

interface SiteConfigItem {
  id: number;
  uuid: string;
  scope: 'client' | 'admin' | 'common';
  config: Record<string, any>;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
}

interface ApiResponse {
  success: boolean;
  data: SiteConfigItem[];
  message: string;
}

const fetcher = (url: string): Promise<ApiResponse> => fetch(url).then((res) => res.json());

const scopeLabels: Record<string, { title: string; description: string }> = {
  client: {
    title: 'Client Configuration',
    description: 'Configuration for the client-side application (C端配置)',
  },
  admin: {
    title: 'Admin Configuration',
    description: 'Configuration for the CMS admin panel (管理端配置)',
  },
  common: {
    title: 'Common Configuration',
    description: 'Shared configuration for both client and admin (通用配置)',
  },
};

export default function SiteConfigPage() {
  const { data, error, isLoading, mutate } = useSWR<ApiResponse>('/api/admin/site-config', fetcher);
  const [configs, setConfigs] = useState<SiteConfigItem[]>([]);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (data?.data) {
      setConfigs(data.data);
    }
  }, [data]);

  const handleJsonEdit = (scope: string, edit: any) => {
    if (!edit.updated_src) return;

    setConfigs((prev) =>
      prev.map((item) => (item.scope === scope ? { ...item, config: edit.updated_src } : item)),
    );
  };

  const handleSave = async (item: SiteConfigItem) => {
    setSaving(item.scope);
    try {
      const response = await fetch(`/api/admin/site-config/${item.uuid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: item.config }),
      });

      const result = (await response.json()) as { success: boolean; message?: string };

      if (result.success) {
        toast.success(`${scopeLabels[item.scope].title} saved successfully`);
        mutate();
      } else {
        toast.error(result.message || 'Failed to save configuration');
      }
    } catch (error) {
      console.error('Error saving configuration:', error);
      toast.error('Error saving configuration');
    } finally {
      setSaving(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading configurations...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-destructive">Error loading configurations</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-foreground text-3xl font-bold">Site Configuration</h1>
        <p className="text-muted-foreground mt-2">
          Manage configuration for different parts of the application
        </p>
      </div>

      {/* Configuration Cards */}
      <div className="grid gap-6">
        {configs.map((item) => {
          const scopeInfo = scopeLabels[item.scope];
          return (
            <Card key={item.uuid} className="p-6">
              <div className="space-y-4">
                {/* Card Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold">{scopeInfo.title}</h2>
                    <p className="text-muted-foreground text-sm">{scopeInfo.description}</p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      Scope:{' '}
                      <code className="bg-muted rounded px-2 py-0.5 font-mono text-xs">{item.scope}</code>
                    </p>
                  </div>
                  <Button onClick={() => handleSave(item)} disabled={saving === item.scope}>
                    {saving === item.scope ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>

                {/* JSON Editor */}
                <div className="border-border bg-muted/10 rounded-lg border p-4">
                  <ReactJson
                    src={item.config}
                    name={false}
                    collapsed={false}
                    enableClipboard={false}
                    displayDataTypes={false}
                    displayObjectSize={false}
                    onEdit={(edit) => handleJsonEdit(item.scope, edit)}
                    onAdd={(add) => handleJsonEdit(item.scope, add)}
                    onDelete={(del) => handleJsonEdit(item.scope, del)}
                    theme="monokai"
                    style={{
                      backgroundColor: 'transparent',
                      fontSize: '14px',
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                    }}
                  />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Help Section */}
      <Card className="bg-muted/50 p-6">
        <h3 className="mb-2 text-lg font-semibold">Usage Instructions</h3>
        <div className="text-muted-foreground space-y-2 text-sm">
          <p>• Click on values in the JSON editor to edit them directly</p>
          <p>• Use the + icon to add new fields to objects</p>
          <p>• Use the - icon to remove fields from objects</p>
          <p>• Click "Save Changes" to persist your modifications</p>
          <p>• The scope field is read-only and cannot be modified</p>
        </div>
      </Card>
    </div>
  );
}
