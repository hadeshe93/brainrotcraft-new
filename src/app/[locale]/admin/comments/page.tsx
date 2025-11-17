'use client';

import { useState, useMemo } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import DataTable, { Column } from '@/components/admin/data-table';
import Toolbar, { ToolbarAction } from '@/components/admin/toolbar';
import Pagination from '@/components/admin/pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import MdiDotsVertical from '~icons/mdi/dots-vertical';
import MdiCheck from '~icons/mdi/check';
import MdiClose from '~icons/mdi/close';
import MdiDelete from '~icons/mdi/delete';
import MdiRefresh from '~icons/mdi/refresh';
import { formatDistanceToNow } from 'date-fns';

interface Comment {
  uuid: string;
  gameUuid: string;
  gameName: string;
  content: string;
  anonymousName: string;
  source: 'user' | 'anonymous' | 'ai' | 'admin';
  status: 'pending' | 'approved' | 'rejected';
  createdAt: number;
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

export default function CommentsPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Build API URL with query parameters
  const apiUrl = useMemo(() => {
    const urlParams = new URLSearchParams({
      page: String(currentPage),
      pageSize: String(pageSize),
    });

    if (searchQuery) {
      urlParams.append('search', searchQuery);
    }

    if (statusFilter && statusFilter !== 'all') {
      urlParams.append('status', statusFilter);
    }

    return `/api/admin/comments?${urlParams.toString()}`;
  }, [currentPage, pageSize, searchQuery, statusFilter]);

  // Use SWR for data fetching
  const { data, error, isLoading, isValidating, mutate } = useSWR(apiUrl, fetcher, {
    keepPreviousData: true,
    revalidateOnFocus: false,
  });

  const comments = data?.data || [];
  const totalItems = data?.meta?.total || 0;
  const totalPages = data?.meta?.totalPages || 0;

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  const handleUpdateStatus = async (uuid: string, status: 'approved' | 'rejected') => {
    const updatingToast = toast.loading(`Updating comment status...`);

    try {
      const response = await fetch(`/api/admin/comments/${uuid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        toast.success(`Comment ${status} successfully`, { id: updatingToast });
        mutate();
      } else {
        const data = (await response.json()) as any;
        toast.error(data?.message || 'Failed to update comment', { id: updatingToast });
      }
    } catch (error) {
      console.error('Failed to update comment status:', error);
      toast.error('An error occurred while updating the comment', { id: updatingToast });
    }
  };

  const handleDelete = async (uuid: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    const deletingToast = toast.loading('Deleting comment...');

    try {
      const response = await fetch(`/api/admin/comments/${uuid}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Comment deleted successfully', { id: deletingToast });
        mutate();
      } else {
        const data = (await response.json()) as any;
        toast.error(data?.message || 'Failed to delete comment', { id: deletingToast });
      }
    } catch (error) {
      console.error('Failed to delete comment:', error);
      toast.error('An error occurred while deleting the comment', { id: deletingToast });
    }
  };

  const handleBatchApprove = async () => {
    if (selectedIds.length === 0) return;

    const updatingToast = toast.loading(`Approving ${selectedIds.length} comment(s)...`);

    try {
      await Promise.all(
        selectedIds.map((uuid) =>
          fetch(`/api/admin/comments/${uuid}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'approved' }),
          }),
        ),
      );

      toast.success(`Successfully approved ${selectedIds.length} comment(s)`, { id: updatingToast });
      setSelectedIds([]);
      mutate();
    } catch (error) {
      console.error('Failed to batch approve:', error);
      toast.error('An error occurred while approving comments', { id: updatingToast });
    }
  };

  const handleBatchReject = async () => {
    if (selectedIds.length === 0) return;

    const updatingToast = toast.loading(`Rejecting ${selectedIds.length} comment(s)...`);

    try {
      await Promise.all(
        selectedIds.map((uuid) =>
          fetch(`/api/admin/comments/${uuid}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'rejected' }),
          }),
        ),
      );

      toast.success(`Successfully rejected ${selectedIds.length} comment(s)`, { id: updatingToast });
      setSelectedIds([]);
      mutate();
    } catch (error) {
      console.error('Failed to batch reject:', error);
      toast.error('An error occurred while rejecting comments', { id: updatingToast });
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedIds.length} comment(s)?`)) return;

    const deletingToast = toast.loading(`Deleting ${selectedIds.length} comment(s)...`);

    try {
      await Promise.all(selectedIds.map((uuid) => fetch(`/api/admin/comments/${uuid}`, { method: 'DELETE' })));

      toast.success(`Successfully deleted ${selectedIds.length} comment(s)`, { id: deletingToast });
      setSelectedIds([]);
      mutate();
    } catch (error) {
      console.error('Failed to batch delete:', error);
      toast.error('An error occurred while deleting comments', { id: deletingToast });
    }
  };

  const batchActions: ToolbarAction[] = [
    {
      label: 'Approve Selected',
      onClick: handleBatchApprove,
      variant: 'default',
    },
    {
      label: 'Reject Selected',
      onClick: handleBatchReject,
      variant: 'secondary',
    },
    {
      label: 'Delete Selected',
      onClick: handleBatchDelete,
      variant: 'destructive',
    },
  ];

  const columns: Column<Comment>[] = [
    {
      key: 'gameName',
      header: 'Game',
      render: (comment) => <span className="font-medium">{comment.gameName}</span>,
    },
    {
      key: 'content',
      header: 'Comment',
      render: (comment) => <p className="line-clamp-2 max-w-md text-sm">{comment.content}</p>,
    },
    {
      key: 'anonymousName',
      header: 'Author',
      render: (comment) => (
        <div>
          <p className="text-sm">{comment.anonymousName || 'Anonymous'}</p>
          <Badge variant="outline" className="mt-1 text-xs">
            {comment.source}
          </Badge>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (comment) => {
        const variant =
          comment.status === 'approved' ? 'default' : comment.status === 'rejected' ? 'destructive' : 'secondary';
        return <Badge variant={variant as any}>{comment.status}</Badge>;
      },
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (comment) => (
        <span className="text-muted-foreground text-sm">
          {formatDistanceToNow(new Date(comment.createdAt * 1000), { addSuffix: true })}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'w-20',
      render: (comment) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MdiDotsVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {comment.status !== 'approved' && (
              <DropdownMenuItem onClick={() => handleUpdateStatus(comment.uuid, 'approved')}>
                <MdiCheck className="mr-2 size-4" />
                Approve
              </DropdownMenuItem>
            )}
            {comment.status !== 'rejected' && (
              <DropdownMenuItem onClick={() => handleUpdateStatus(comment.uuid, 'rejected')}>
                <MdiClose className="mr-2 size-4" />
                Reject
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => handleDelete(comment.uuid)} className="text-destructive">
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
          <h1 className="text-foreground text-3xl font-bold">Comment Management</h1>
          <p className="text-muted-foreground mt-2">Review and moderate user comments</p>
        </div>
        {/* Manual Refresh Button */}
        <Button variant="outline" size="sm" onClick={() => mutate()} disabled={isValidating} className="gap-2">
          <MdiRefresh className={`size-4 ${isValidating ? 'animate-spin' : ''}`} />
          {isValidating ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-end gap-4">
        <div className="flex-1">
          <Toolbar
            searchPlaceholder="Search comments by content or author..."
            onSearch={handleSearch}
            batchActions={batchActions}
            selectedCount={selectedIds.length}
          />
        </div>
        <div className="w-48">
          <Label>Status Filter</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-destructive/10 border-destructive/50 text-destructive rounded-lg border p-4">
          <h3 className="font-semibold">Failed to load comments</h3>
          <p className="text-sm opacity-90">{error.message || 'An error occurred while fetching comments'}</p>
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
            <p>Loading comments...</p>
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
            data={comments}
            getRowId={(comment) => comment.uuid}
            onSelectionChange={setSelectedIds}
            selectable
            emptyMessage="No comments found"
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
    </div>
  );
}
