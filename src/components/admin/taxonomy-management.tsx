'use client';

import { useState, useEffect, useMemo } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import DataTable, { Column } from '@/components/admin/data-table';
import Toolbar, { ToolbarAction } from '@/components/admin/toolbar';
import Pagination from '@/components/admin/pagination';
import TranslationTabs, { type TranslationData } from '@/components/admin/translation-tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import MdiDotsVertical from '~icons/mdi/dots-vertical';
import MdiPencil from '~icons/mdi/pencil';
import MdiDelete from '~icons/mdi/delete';
import MdiRefresh from '~icons/mdi/refresh';
import { formatDistanceToNow } from 'date-fns';
import { DEFAULT_LOCALE } from '@/i18n/language';
import type { LanguageRecord } from '@/types/services/language';

interface TaxonomyItem {
  uuid: string;
  name: string;
  slug: string;
  iconUrl?: string;
  metadataTitle?: string;
  metadataDescription?: string;
  content?: string;
  createdAt: number;
  translations?: TranslationData; // Multi-language translations
}

interface TaxonomyManagementProps {
  type: 'category' | 'tag' | 'featured';
  title: string;
  description: string;
  apiEndpoint: string;
}

// SWR fetcher function
const fetcher = async (url: string) => {
  const response = await fetch(url);
  const data = (await response.json()) as any;

  if (!response.ok) {
    throw new Error(data?.message || 'Failed to fetch data');
  }

  return data;
};

export default function TaxonomyManagement({ type, title, description, apiEndpoint }: TaxonomyManagementProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TaxonomyItem | null>(null);
  const [previewIconUrl, setPreviewIconUrl] = useState<string | null>(null);
  const [iconPreviewOpen, setIconPreviewOpen] = useState(false);

  // Form state
  const [slug, setSlug] = useState('');
  const [iconUrl, setIconUrl] = useState('');
  const [translations, setTranslations] = useState<TranslationData>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Build API URL with query parameters
  const apiUrl = useMemo(() => {
    const urlParams = new URLSearchParams({
      page: String(currentPage),
      pageSize: String(pageSize),
    });

    if (searchQuery) {
      urlParams.append('search', searchQuery);
    }

    return `${apiEndpoint}?${urlParams.toString()}`;
  }, [apiEndpoint, currentPage, pageSize, searchQuery]);

  // Use SWR for data fetching
  const {
    data,
    error: fetchError,
    isLoading,
    isValidating,
    mutate,
  } = useSWR(apiUrl, fetcher, {
    keepPreviousData: true,
    revalidateOnFocus: false,
  });

  // Fetch languages for translation tabs
  const { data: languagesData } = useSWR<{ data: LanguageRecord[] }>('/api/admin/languages', fetcher);
  const languages = languagesData?.data || [];

  const items = data?.data || [];
  const totalItems = data?.meta?.total || 0;
  const totalPages = data?.meta?.totalPages || 0;

  // Reset form when item changes
  useEffect(() => {
    if (editingItem) {
      setSlug(editingItem.slug);
      setIconUrl(editingItem.iconUrl || '');

      // Load translations from API response
      // API returns translations WITHOUT default locale (to reduce response size)
      // Default locale data is in the base fields, so we merge it in
      setTranslations({
        [DEFAULT_LOCALE]: {
          name: editingItem.name,
          metadataTitle: editingItem.metadataTitle || '',
          metadataDescription: editingItem.metadataDescription || '',
          content: editingItem.content || '',
        },
        ...(editingItem.translations || {}),
      });
    } else {
      setSlug('');
      setIconUrl('');
      setTranslations({
        [DEFAULT_LOCALE]: {
          name: '',
          metadataTitle: '',
          metadataDescription: '',
          content: '',
        },
      });
    }
    setError('');
  }, [editingItem, formOpen]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  const handleAdd = () => {
    setEditingItem(null);
    setFormOpen(true);
  };

  const handleEdit = (item: TaxonomyItem) => {
    setEditingItem(item);
    setFormOpen(true);
  };

  const handleDelete = async (uuid: string) => {
    if (!confirm(`Are you sure you want to delete this ${type}?`)) return;

    const deletingToast = toast.loading(`Deleting ${type}...`);

    try {
      const response = await fetch(`${apiEndpoint}/${uuid}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} deleted successfully`, { id: deletingToast });
        mutate();
      } else {
        const data = (await response.json()) as any;
        toast.error(data?.message || `Failed to delete ${type}`, { id: deletingToast });
      }
    } catch (error) {
      console.error(`Failed to delete ${type}:`, error);
      toast.error(`An error occurred while deleting the ${type}`, { id: deletingToast });
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedIds.length} ${type}(s)?`)) return;

    const deletingToast = toast.loading(`Deleting ${selectedIds.length} ${type}(s)...`);

    try {
      await Promise.all(selectedIds.map((uuid) => fetch(`${apiEndpoint}/${uuid}`, { method: 'DELETE' })));

      toast.success(`Successfully deleted ${selectedIds.length} ${type}(s)`, { id: deletingToast });
      setSelectedIds([]);
      mutate();
    } catch (error) {
      console.error(`Failed to batch delete ${type}s:`, error);
      toast.error(`An error occurred while deleting ${type}s`, { id: deletingToast });
    }
  };

  const handleTranslationsChange = (newTranslations: TranslationData) => {
    setTranslations(newTranslations);

    // Auto-generate slug from English name when creating new item
    if (!editingItem && newTranslations[DEFAULT_LOCALE]?.name) {
      const englishName = newTranslations[DEFAULT_LOCALE].name;
      const autoSlug = englishName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      setSlug(autoSlug);
    }
  };

  const handleIconPreview = (iconUrl: string) => {
    setPreviewIconUrl(iconUrl);
    setIconPreviewOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      // Extract default locale values for backward compatibility
      const defaultTranslation = translations[DEFAULT_LOCALE] || {};

      const body: any = {
        name: defaultTranslation.name || '',
        slug,
        metadataTitle: defaultTranslation.metadataTitle || '',
        metadataDescription: defaultTranslation.metadataDescription || '',
        translations,
      };

      if (iconUrl) {
        body.iconUrl = iconUrl;
      }

      if (defaultTranslation.content) {
        body.content = defaultTranslation.content;
      }

      const url = editingItem ? `${apiEndpoint}/${editingItem.uuid}` : apiEndpoint;
      const method = editingItem ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = (await response.json()) as any;

      if (response.ok) {
        setFormOpen(false);
        mutate();
        toast.success(
          editingItem
            ? `${type.charAt(0).toUpperCase() + type.slice(1)} updated successfully`
            : `${type.charAt(0).toUpperCase() + type.slice(1)} created successfully`,
        );
      } else {
        setError(data?.message || `Failed to save ${type}`);
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const batchActions: ToolbarAction[] = [
    {
      label: 'Delete Selected',
      onClick: handleBatchDelete,
      variant: 'destructive',
    },
  ];

  const columns: Column<TaxonomyItem>[] = [
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      render: (item) => <span className="font-medium">{item.name}</span>,
    },
    {
      key: 'slug',
      header: 'Slug',
      render: (item) => <code className="text-muted-foreground text-xs">{item.slug}</code>,
    },
    // Icon column (only for categories)
    ...(type === 'category'
      ? [
          {
            key: 'iconUrl',
            header: 'Icon',
            className: 'w-24',
            render: (item: TaxonomyItem) =>
              item.iconUrl ? (
                <button
                  onClick={() => handleIconPreview(item.iconUrl!)}
                  className="hover:bg-accent flex size-12 items-center justify-center rounded-md border transition-colors"
                  title="Click to preview"
                >
                  <img src={item.iconUrl} alt={item.name} className="size-8 object-contain" />
                </button>
              ) : (
                <span className="text-muted-foreground text-xs">-</span>
              ),
          } as Column<TaxonomyItem>,
        ]
      : []),
    {
      key: 'metadataDescription',
      header: 'SEO Description',
      render: (item) => (
        <span className="text-muted-foreground line-clamp-2 text-sm">{item.metadataDescription || '-'}</span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (item) => (
        <span className="text-muted-foreground text-sm">
          {formatDistanceToNow(new Date(item.createdAt * 1000), { addSuffix: true })}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'w-20',
      render: (item) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MdiDotsVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleEdit(item)}>
              <MdiPencil className="mr-2 size-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleDelete(item.uuid)} className="text-destructive">
              <MdiDelete className="mr-2 size-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-foreground text-3xl font-bold">{title}</h1>
          <p className="text-muted-foreground mt-2">{description}</p>
        </div>
        {/* Manual Refresh Button */}
        <Button variant="outline" size="sm" onClick={() => mutate()} disabled={isValidating} className="gap-2">
          <MdiRefresh className={`size-4 ${isValidating ? 'animate-spin' : ''}`} />
          {isValidating ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {/* Toolbar */}
      <Toolbar
        searchPlaceholder={`Search ${type}s by name or slug...`}
        onSearch={handleSearch}
        onAdd={handleAdd}
        addLabel={`Add ${type === 'category' ? 'Category' : type === 'tag' ? 'Tag' : 'Featured'}`}
        batchActions={batchActions}
        selectedCount={selectedIds.length}
      />

      {/* Error State */}
      {fetchError && (
        <div className="bg-destructive/10 border-destructive/50 text-destructive rounded-lg border p-4">
          <h3 className="font-semibold">Failed to load {type}s</h3>
          <p className="text-sm opacity-90">{fetchError.message || `An error occurred while fetching ${type}s`}</p>
          <Button variant="outline" size="sm" onClick={() => mutate()} className="mt-3">
            Try Again
          </Button>
        </div>
      )}

      {/* Data Table */}
      {isLoading ? (
        <div className="text-muted-foreground flex h-64 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <MdiRefresh className="size-8 animate-spin" />
            <p>Loading {type}s...</p>
          </div>
        </div>
      ) : (
        <div className="relative">
          {/* Show subtle loading indicator when revalidating */}
          {isValidating && (
            <div className="bg-background/80 absolute inset-0 z-10 flex items-center justify-center backdrop-blur-sm">
              <div className="bg-card flex items-center gap-2 rounded-lg border p-3 shadow-sm">
                <MdiRefresh className="size-4 animate-spin" />
                <span className="text-sm">Updating...</span>
              </div>
            </div>
          )}
          <DataTable
            columns={columns}
            data={items}
            getRowId={(item) => item.uuid}
            onSelectionChange={setSelectedIds}
            selectable
            emptyMessage={`No ${type}s found`}
          />
        </div>
      )}

      {/* Pagination */}
      {totalItems > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
        />
      )}

      {/* Form Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[90vh] !max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? `Edit ${type}` : `Create New ${type}`}</DialogTitle>
            <DialogDescription>
              {editingItem ? `Update ${type} information` : `Add a new ${type} to the platform`}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-foreground text-lg font-semibold">Basic Information</h3>

              {/* Slug */}
              <div className="space-y-2">
                <Label htmlFor="slug">
                  Slug <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="slug"
                  type="text"
                  placeholder={`${type}-slug-url`}
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  required
                  maxLength={100}
                  pattern="[a-z0-9-]+"
                />
                <p className="text-muted-foreground text-xs">
                  URL-friendly identifier (lowercase letters, numbers, and hyphens only)
                </p>
              </div>

              {/* Icon URL */}
              <div className="space-y-2">
                <Label htmlFor="iconUrl">Icon URL</Label>
                <Input
                  id="iconUrl"
                  type="text"
                  placeholder={`https://example.com/icon.svg`}
                  value={iconUrl}
                  onChange={(e) => setIconUrl(e.target.value)}
                  maxLength={500}
                />
                <p className="text-muted-foreground text-xs">URL to the {type} icon image (optional)</p>
              </div>
            </div>

            {/* Multi-language Content */}
            <div className="space-y-4">
              <div className="border-border border-t pt-4">
                <h3 className="text-foreground mb-4 text-lg font-semibold">Multi-language Content</h3>
                <p className="text-muted-foreground mb-4 text-sm">
                  Edit content for different languages. English is the default language and is required.
                </p>
              </div>

              <TranslationTabs
                languages={languages}
                translations={translations}
                onChange={handleTranslationsChange}
                showName={true}
                nameLabel={`${type.charAt(0).toUpperCase() + type.slice(1)} Name`}
                titleLabel="SEO Title"
                descriptionLabel="SEO Description"
                contentLabel="Content (Markdown)"
                contentRequired={false}
                contentRows={6}
                showContent={true}
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="text-destructive border-destructive/50 bg-destructive/10 rounded-md border p-3 text-sm">
                {error}
              </div>
            )}

            {/* Submit Buttons */}
            <div className="flex gap-3 border-t pt-4">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="flex-1">
                {isSubmitting ? 'Saving...' : editingItem ? `Update ${type}` : `Create ${type}`}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Icon Preview Dialog */}
      <Dialog open={iconPreviewOpen} onOpenChange={setIconPreviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Icon Preview</DialogTitle>
            <DialogDescription>View the category icon in full size</DialogDescription>
          </DialogHeader>
          <div className="bg-muted flex min-h-[400px] items-center justify-center rounded-lg p-8">
            {previewIconUrl && (
              <img src={previewIconUrl} alt="Icon preview" className="max-h-[400px] max-w-full object-contain" />
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIconPreviewOpen(false)}>
              Close
            </Button>
            {previewIconUrl && (
              <Button variant="default" onClick={() => window.open(previewIconUrl, '_blank')} className="gap-2">
                Open in New Tab
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
