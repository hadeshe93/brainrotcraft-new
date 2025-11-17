'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import MdiDelete from '~icons/mdi/delete';
import MdiPlus from '~icons/mdi/plus';
import MdiRefresh from '~icons/mdi/refresh';

interface Game {
  uuid: string;
  name: string;
  slug: string;
}

interface GameRelationsDialogProps {
  game: Game | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface FeaturedRelation {
  gameUuid: string;
  featuredUuid: string;
  sortOrder: number;
  featuredName: string;
  featuredSlug: string;
}

interface CategoryRelation {
  gameUuid: string;
  categoryUuid: string;
  sortOrder: number;
  categoryName: string;
  categorySlug: string;
}

interface TagRelation {
  gameUuid: string;
  tagUuid: string;
  sortOrder: number;
  tagName: string;
  tagSlug: string;
}

interface FeaturedItem {
  uuid: string;
  name: string;
  slug: string;
}

interface CategoryItem {
  uuid: string;
  name: string;
  slug: string;
}

interface TagItem {
  uuid: string;
  name: string;
  slug: string;
}

export default function GameRelationsDialog({ game, open, onOpenChange, onSuccess }: GameRelationsDialogProps) {
  const [activeTab, setActiveTab] = useState<'featured' | 'categories' | 'tags'>('featured');
  const [isLoading, setIsLoading] = useState(false);

  // Featured state
  const [featuredRelations, setFeaturedRelations] = useState<FeaturedRelation[]>([]);
  const [allFeatured, setAllFeatured] = useState<FeaturedItem[]>([]);

  // Categories state
  const [categoryRelations, setCategoryRelations] = useState<CategoryRelation[]>([]);
  const [allCategories, setAllCategories] = useState<CategoryItem[]>([]);

  // Tags state
  const [tagRelations, setTagRelations] = useState<TagRelation[]>([]);
  const [allTags, setAllTags] = useState<TagItem[]>([]);

  // Load data when dialog opens
  useEffect(() => {
    if (open && game) {
      loadAllData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, game]);

  const loadAllData = async () => {
    if (!game) return;

    setIsLoading(true);
    try {
      await Promise.all([
        loadFeaturedRelations(),
        loadAllFeatured(),
        loadCategoryRelations(),
        loadAllCategories(),
        loadTagRelations(),
        loadAllTags(),
      ]);
    } catch (error) {
      console.error('Failed to load relations:', error);
      toast.error('Failed to load relations data');
    } finally {
      setIsLoading(false);
    }
  };

  // Featured methods
  const loadFeaturedRelations = async () => {
    if (!game) return;
    const response = await fetch(`/api/admin/games/relations/featured?gameUuid=${game.uuid}`);
    const data = (await response.json()) as any;
    if (data.success) {
      setFeaturedRelations(data.data);
    }
  };

  const loadAllFeatured = async () => {
    try {
      const response = await fetch('/api/admin/featured');
      const data = (await response.json()) as any;
      if (data.success) {
        setAllFeatured(data.data);
      }
    } catch (error) {
      console.error('Failed to load featured list:', error);
    }
  };

  const handleAddFeatured = async (featuredUuid: string) => {
    if (!game) return;
    const response = await fetch('/api/admin/games/relations/featured', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameUuid: game.uuid, featuredUuid, sortOrder: 0 }),
    });

    if (response.ok) {
      toast.success('Featured relation added');
      loadFeaturedRelations();
      onSuccess();
    } else {
      toast.error('Failed to add featured relation');
    }
  };

  const handleRemoveFeatured = async (featuredUuid: string) => {
    if (!game) return;
    const response = await fetch('/api/admin/games/relations/featured', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameUuid: game.uuid, featuredUuid }),
    });

    if (response.ok) {
      toast.success('Featured relation removed');
      loadFeaturedRelations();
      onSuccess();
    } else {
      toast.error('Failed to remove featured relation');
    }
  };

  const handleUpdateFeaturedOrder = async (featuredUuid: string, sortOrder: number) => {
    if (!game) return;
    const response = await fetch('/api/admin/games/relations/featured', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameUuid: game.uuid, featuredUuid, sortOrder }),
    });

    if (response.ok) {
      toast.success('Sort order updated');
      loadFeaturedRelations();
      onSuccess();
    } else {
      toast.error('Failed to update sort order');
    }
  };

  // Category methods (similar structure)
  const loadCategoryRelations = async () => {
    if (!game) return;
    const response = await fetch(`/api/admin/games/relations/categories?gameUuid=${game.uuid}`);
    const data = (await response.json()) as any;
    if (data.success) {
      setCategoryRelations(data.data);
    }
  };

  const loadAllCategories = async () => {
    const response = await fetch('/api/admin/categories');
    const data = (await response.json()) as any;
    if (data.success) {
      setAllCategories(data.data);
    }
  };

  const handleAddCategory = async (categoryUuid: string) => {
    if (!game) return;
    const response = await fetch('/api/admin/games/relations/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameUuid: game.uuid, categoryUuid, sortOrder: 0 }),
    });

    if (response.ok) {
      toast.success('Category relation added');
      loadCategoryRelations();
      onSuccess();
    } else {
      toast.error('Failed to add category relation');
    }
  };

  const handleRemoveCategory = async (categoryUuid: string) => {
    if (!game) return;
    const response = await fetch('/api/admin/games/relations/categories', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameUuid: game.uuid, categoryUuid }),
    });

    if (response.ok) {
      toast.success('Category relation removed');
      loadCategoryRelations();
      onSuccess();
    } else {
      toast.error('Failed to remove category relation');
    }
  };

  const handleUpdateCategoryOrder = async (categoryUuid: string, sortOrder: number) => {
    if (!game) return;
    const response = await fetch('/api/admin/games/relations/categories', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameUuid: game.uuid, categoryUuid, sortOrder }),
    });

    if (response.ok) {
      toast.success('Sort order updated');
      loadCategoryRelations();
      onSuccess();
    } else {
      toast.error('Failed to update sort order');
    }
  };

  // Tag methods (similar structure)
  const loadTagRelations = async () => {
    if (!game) return;
    const response = await fetch(`/api/admin/games/relations/tags?gameUuid=${game.uuid}`);
    const data = (await response.json()) as any;
    if (data.success) {
      setTagRelations(data.data);
    }
  };

  const loadAllTags = async () => {
    const response = await fetch('/api/admin/tags');
    const data = (await response.json()) as any;
    if (data.success) {
      setAllTags(data.data);
    }
  };

  const handleAddTag = async (tagUuid: string) => {
    if (!game) return;
    const response = await fetch('/api/admin/games/relations/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameUuid: game.uuid, tagUuid, sortOrder: 0 }),
    });

    if (response.ok) {
      toast.success('Tag relation added');
      loadTagRelations();
      onSuccess();
    } else {
      toast.error('Failed to add tag relation');
    }
  };

  const handleRemoveTag = async (tagUuid: string) => {
    if (!game) return;
    const response = await fetch('/api/admin/games/relations/tags', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameUuid: game.uuid, tagUuid }),
    });

    if (response.ok) {
      toast.success('Tag relation removed');
      loadTagRelations();
      onSuccess();
    } else {
      toast.error('Failed to remove tag relation');
    }
  };

  const handleUpdateTagOrder = async (tagUuid: string, sortOrder: number) => {
    if (!game) return;
    const response = await fetch('/api/admin/games/relations/tags', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameUuid: game.uuid, tagUuid, sortOrder }),
    });

    if (response.ok) {
      toast.success('Sort order updated');
      loadTagRelations();
      onSuccess();
    } else {
      toast.error('Failed to update sort order');
    }
  };

  if (!game) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Relations: {game.name}</DialogTitle>
          <DialogDescription>Manage game relationships with Featured, Categories, and Tags</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="text-muted-foreground flex h-64 items-center justify-center">
            <MdiRefresh className="size-8 animate-spin" />
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="featured">Featured</TabsTrigger>
              <TabsTrigger value="categories">Categories</TabsTrigger>
              <TabsTrigger value="tags">Tags</TabsTrigger>
            </TabsList>

            <TabsContent value="featured" className="space-y-4">
              <div>
                <h3 className="mb-2 font-semibold">Current Relations</h3>
                <div className="space-y-2">
                  {featuredRelations.map((rel) => (
                    <div key={rel.featuredUuid} className="flex items-center justify-between rounded border p-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{rel.featuredName}</span>
                        <Badge variant="outline">{rel.featuredSlug}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={rel.sortOrder}
                          onChange={(e) => handleUpdateFeaturedOrder(rel.featuredUuid, Number(e.target.value))}
                          className="w-20"
                          placeholder="Order"
                        />
                        <Button size="sm" variant="destructive" onClick={() => handleRemoveFeatured(rel.featuredUuid)}>
                          <MdiDelete className="size-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {featuredRelations.length === 0 && (
                    <p className="text-muted-foreground text-sm">No featured relations yet</p>
                  )}
                </div>
              </div>

              <div>
                <h3 className="mb-2 font-semibold">Available Featured</h3>
                <div className="space-y-2">
                  {allFeatured
                    .filter((f) => !featuredRelations.some((r) => r.featuredUuid === f.uuid))
                    .map((featured) => (
                      <div key={featured.uuid} className="flex items-center justify-between rounded border p-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{featured.name}</span>
                          <Badge variant="outline">{featured.slug}</Badge>
                        </div>
                        <Button size="sm" onClick={() => handleAddFeatured(featured.uuid)}>
                          <MdiPlus className="mr-1 size-4" />
                          Add
                        </Button>
                      </div>
                    ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="categories" className="space-y-4">
              <div>
                <h3 className="mb-2 font-semibold">Current Relations</h3>
                <div className="space-y-2">
                  {categoryRelations.map((rel) => (
                    <div key={rel.categoryUuid} className="flex items-center justify-between rounded border p-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{rel.categoryName}</span>
                        <Badge variant="outline">{rel.categorySlug}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={rel.sortOrder}
                          onChange={(e) => handleUpdateCategoryOrder(rel.categoryUuid, Number(e.target.value))}
                          className="w-20"
                          placeholder="Order"
                        />
                        <Button size="sm" variant="destructive" onClick={() => handleRemoveCategory(rel.categoryUuid)}>
                          <MdiDelete className="size-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {categoryRelations.length === 0 && (
                    <p className="text-muted-foreground text-sm">No category relations yet</p>
                  )}
                </div>
              </div>

              <div>
                <h3 className="mb-2 font-semibold">Available Categories</h3>
                <div className="max-h-64 space-y-2 overflow-y-auto">
                  {allCategories
                    .filter((c) => !categoryRelations.some((r) => r.categoryUuid === c.uuid))
                    .map((category) => (
                      <div key={category.uuid} className="flex items-center justify-between rounded border p-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{category.name}</span>
                          <Badge variant="outline">{category.slug}</Badge>
                        </div>
                        <Button size="sm" onClick={() => handleAddCategory(category.uuid)}>
                          <MdiPlus className="mr-1 size-4" />
                          Add
                        </Button>
                      </div>
                    ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="tags" className="space-y-4">
              <div>
                <h3 className="mb-2 font-semibold">Current Relations</h3>
                <div className="space-y-2">
                  {tagRelations.map((rel) => (
                    <div key={rel.tagUuid} className="flex items-center justify-between rounded border p-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{rel.tagName}</span>
                        <Badge variant="outline">{rel.tagSlug}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={rel.sortOrder}
                          onChange={(e) => handleUpdateTagOrder(rel.tagUuid, Number(e.target.value))}
                          className="w-20"
                          placeholder="Order"
                        />
                        <Button size="sm" variant="destructive" onClick={() => handleRemoveTag(rel.tagUuid)}>
                          <MdiDelete className="size-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {tagRelations.length === 0 && <p className="text-muted-foreground text-sm">No tag relations yet</p>}
                </div>
              </div>

              <div>
                <h3 className="mb-2 font-semibold">Available Tags</h3>
                <div className="max-h-64 space-y-2 overflow-y-auto">
                  {allTags
                    .filter((t) => !tagRelations.some((r) => r.tagUuid === t.uuid))
                    .map((tag) => (
                      <div key={tag.uuid} className="flex items-center justify-between rounded border p-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{tag.name}</span>
                          <Badge variant="outline">{tag.slug}</Badge>
                        </div>
                        <Button size="sm" onClick={() => handleAddTag(tag.uuid)}>
                          <MdiPlus className="mr-1 size-4" />
                          Add
                        </Button>
                      </div>
                    ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
