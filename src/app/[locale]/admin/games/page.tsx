'use client';

import { useState, useMemo, use } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import DataTable, { Column } from '@/components/admin/data-table';
import Toolbar, { ToolbarAction } from '@/components/admin/toolbar';
import Pagination from '@/components/admin/pagination';
import GameForm from '@/components/admin/game-form';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import MdiDotsVertical from '~icons/mdi/dots-vertical';
import MdiPencil from '~icons/mdi/pencil';
import MdiDelete from '~icons/mdi/delete';
import MdiEye from '~icons/mdi/eye';
import MdiRefresh from '~icons/mdi/refresh';
import MdiLink from '~icons/mdi/link';
import Image from '@/components/image';
import GameRelationsDialog from '@/components/admin/game-relations-dialog';
import type { LanguageRecord } from '@/types/services/language';

interface Game {
  uuid: string;
  name: string;
  slug: string;
  thumbnail: string;
  source: string;
  status: 'draft' | 'online' | 'offline';
  interact: number;
  rating: number;
  createdAt: number;
  introduction?: {
    metadataTitle?: string;
    metadataDescription?: string;
    content?: string;
  };
}

interface GamesPageProps {
  params: Promise<{
    locale: string;
  }>;
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

export default function GamesPage(props: GamesPageProps) {
  const params = use(props.params);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [isEditLoading, setIsEditLoading] = useState(false);
  const [orderBy, setOrderBy] = useState<'created_at' | 'rating' | 'interact' | 'name' | 'status'>('created_at');
  const [orderDirection, setOrderDirection] = useState<'asc' | 'desc'>('desc');
  const [relationsDialogOpen, setRelationsDialogOpen] = useState(false);
  const [managingGame, setManagingGame] = useState<Game | null>(null);

  // Build API URL with query parameters
  const apiUrl = useMemo(() => {
    const urlParams = new URLSearchParams({
      page: String(currentPage),
      pageSize: String(pageSize),
      orderBy,
      orderDirection,
    });

    if (searchQuery) {
      urlParams.append('search', searchQuery);
    }

    return `/api/admin/games?${urlParams.toString()}`;
  }, [currentPage, pageSize, searchQuery, orderBy, orderDirection]);

  // Use SWR for data fetching
  const { data, error, isLoading, isValidating, mutate } = useSWR(apiUrl, fetcher, {
    keepPreviousData: true, // Keep previous data while loading new page
    revalidateOnFocus: false, // Don't revalidate on window focus
  });

  // Fetch languages for game form
  const { data: languagesData } = useSWR<{ data: LanguageRecord[] }>('/api/admin/languages', fetcher);
  const languages = languagesData?.data || [];

  const games = data?.data || [];
  const totalItems = data?.meta?.total || 0;
  const totalPages = data?.meta?.totalPages || 0;

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1); // Reset to first page on search
  };

  const handleSortChange = (column: string, direction: 'asc' | 'desc') => {
    setOrderBy(column as 'created_at' | 'rating' | 'interact' | 'name' | 'status');
    setOrderDirection(direction);
    setCurrentPage(1); // Reset to first page on sort change
  };

  const handleAdd = () => {
    setEditingGame(null);
    setFormOpen(true);
  };

  const handleManageRelations = (game: Game) => {
    setManagingGame(game);
    setRelationsDialogOpen(true);
  };

  const handleEdit = async (game: Game) => {
    setIsEditLoading(true);
    const loadingToast = toast.loading('Loading game details...');

    try {
      // Fetch full game details including introduction
      const response = await fetch(`/api/admin/games/${game.uuid}`);
      const data = (await response.json()) as any;

      if (response.ok && data.success) {
        setEditingGame(data.data);
        setFormOpen(true);
        toast.dismiss(loadingToast);
      } else {
        toast.error(data?.message || 'Failed to fetch game details', { id: loadingToast });
        // Fallback to using list data
        setEditingGame(game);
        setFormOpen(true);
      }
    } catch (error) {
      console.error('Failed to fetch game details:', error);
      toast.error('An error occurred while loading game details', { id: loadingToast });
      // Fallback to using list data
      setEditingGame(game);
      setFormOpen(true);
    } finally {
      setIsEditLoading(false);
    }
  };

  const handleDelete = async (uuid: string) => {
    if (!confirm('Are you sure you want to delete this game?')) return;

    const deletingToast = toast.loading('Deleting game...');

    try {
      const response = await fetch(`/api/admin/games/${uuid}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Game deleted successfully', { id: deletingToast });
        // Optimistically update the UI
        mutate();
      } else {
        const data = (await response.json()) as any;
        toast.error(data?.message || 'Failed to delete game', { id: deletingToast });
      }
    } catch (error) {
      console.error('Failed to delete game:', error);
      toast.error('An error occurred while deleting the game', { id: deletingToast });
    }
  };

  const handleBatchUpdate = async (status: string) => {
    if (selectedIds.length === 0) return;

    const updatingToast = toast.loading(`Updating ${selectedIds.length} game(s)...`);

    try {
      const response = await fetch('/api/admin/games/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          uuids: selectedIds,
          data: { status },
        }),
      });

      if (response.ok) {
        toast.success(`Successfully updated ${selectedIds.length} game(s) to ${status}`, { id: updatingToast });
        setSelectedIds([]);
        mutate();
      } else {
        const data = (await response.json()) as any;
        toast.error(data?.message || 'Failed to update games', { id: updatingToast });
      }
    } catch (error) {
      console.error('Failed to batch update:', error);
      toast.error('An error occurred while updating games', { id: updatingToast });
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedIds.length} game(s)?`)) return;

    const deletingToast = toast.loading(`Deleting ${selectedIds.length} game(s)...`);

    try {
      const response = await fetch('/api/admin/games/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          uuids: selectedIds,
        }),
      });

      if (response.ok) {
        toast.success(`Successfully deleted ${selectedIds.length} game(s)`, { id: deletingToast });
        setSelectedIds([]);
        mutate();
      } else {
        const data = (await response.json()) as any;
        toast.error(data?.message || 'Failed to delete games', { id: deletingToast });
      }
    } catch (error) {
      console.error('Failed to batch delete:', error);
      toast.error('An error occurred while deleting games', { id: deletingToast });
    }
  };

  const batchActions: ToolbarAction[] = [
    {
      label: 'Set as Draft',
      onClick: () => handleBatchUpdate('draft'),
    },
    {
      label: 'Set as Online',
      onClick: () => handleBatchUpdate('online'),
    },
    {
      label: 'Set as Offline',
      onClick: () => handleBatchUpdate('offline'),
    },
    {
      label: 'Delete Selected',
      onClick: handleBatchDelete,
      variant: 'destructive',
    },
  ];

  const columns: Column<Game>[] = [
    {
      key: 'thumbnail',
      header: 'Thumbnail',
      render: (game) => (
        <div className="border-border relative size-12 overflow-hidden rounded-md border">
          <Image src={game.thumbnail} alt={game.name} className="size-full object-cover" />
        </div>
      ),
    },
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      render: (game) => <span className="font-medium">{game.name}</span>,
    },
    {
      key: 'slug',
      header: 'Slug',
      render: (game) => <code className="text-muted-foreground text-xs">{game.slug}</code>,
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (game) => {
        const variant = game.status === 'online' ? 'default' : game.status === 'offline' ? 'secondary' : 'outline';
        return <Badge variant={variant as any}>{game.status}</Badge>;
      },
    },
    {
      key: 'rating',
      header: 'Rating',
      sortable: true,
      render: (game) => <span>{game.rating?.toFixed(1) || '0.0'}</span>,
    },
    {
      key: 'interact',
      header: 'Interactions',
      sortable: true,
      render: (game) => <span>{game.interact || 0}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'w-20',
      render: (game) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MdiDotsVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => window.open(`/game/${game.slug}`, '_blank')}>
              <MdiEye className="mr-2 size-4" />
              View
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleEdit(game)} disabled={isEditLoading}>
              <MdiPencil className="mr-2 size-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleManageRelations(game)}>
              <MdiLink className="mr-2 size-4" />
              Manage Relations
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleDelete(game.uuid)} className="text-destructive">
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
          <h1 className="text-foreground text-3xl font-bold">Game Management</h1>
          <p className="text-muted-foreground mt-2">Manage all games on the platform</p>
        </div>
        {/* Manual Refresh Button */}
        <Button variant="outline" size="sm" onClick={() => mutate()} disabled={isValidating} className="gap-2">
          <MdiRefresh className={`size-4 ${isValidating ? 'animate-spin' : ''}`} />
          {isValidating ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {/* Toolbar */}
      <Toolbar
        searchPlaceholder="Search games by name or slug..."
        onSearch={handleSearch}
        onAdd={handleAdd}
        addLabel="Add Game"
        batchActions={batchActions}
        selectedCount={selectedIds.length}
      />

      {/* Error State */}
      {error && (
        <div className="bg-destructive/10 border-destructive/50 text-destructive rounded-lg border p-4">
          <h3 className="font-semibold">Failed to load games</h3>
          <p className="text-sm opacity-90">{error.message || 'An error occurred while fetching games'}</p>
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
            <p>Loading games...</p>
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
            data={games}
            getRowId={(game) => game.uuid}
            onSelectionChange={setSelectedIds}
            selectable
            emptyMessage="No games found"
            sortColumn={orderBy}
            sortDirection={orderDirection}
            onSortChange={handleSortChange}
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

      {/* Game Form Dialog */}
      <GameForm
        open={formOpen}
        onOpenChange={setFormOpen}
        game={editingGame}
        languages={languages}
        onSuccess={() => {
          mutate();
          setEditingGame(null);
          toast.success(editingGame ? 'Game updated successfully' : 'Game created successfully');
        }}
      />

      {/* Game Relations Dialog */}
      <GameRelationsDialog
        game={managingGame}
        open={relationsDialogOpen}
        onOpenChange={setRelationsDialogOpen}
        onSuccess={() => {
          mutate();
        }}
      />
    </div>
  );
}
