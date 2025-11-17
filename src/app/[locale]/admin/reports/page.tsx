'use client';

import { useState, useMemo } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import DataTable, { Column } from '@/components/admin/data-table';
import Toolbar, { ToolbarAction } from '@/components/admin/toolbar';
import Pagination from '@/components/admin/pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import MdiDotsVertical from '~icons/mdi/dots-vertical';
import MdiEye from '~icons/mdi/eye';
import MdiCheck from '~icons/mdi/check';
import MdiClose from '~icons/mdi/close';
import MdiRefresh from '~icons/mdi/refresh';
import { formatDistanceToNow } from 'date-fns';

interface Report {
  uuid: string;
  gameUuid: string;
  gameName: string;
  reportType: string;
  content: string;
  userName: string;
  userEmail: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'rejected';
  adminNote?: string;
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

export default function ReportsPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

    return `/api/admin/reports?${urlParams.toString()}`;
  }, [currentPage, pageSize, searchQuery, statusFilter]);

  // Use SWR for data fetching
  const { data, error, isLoading, isValidating, mutate } = useSWR(apiUrl, fetcher, {
    keepPreviousData: true,
    revalidateOnFocus: false,
  });

  const reports = data?.data || [];
  const totalItems = data?.meta?.total || 0;
  const totalPages = data?.meta?.totalPages || 0;

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  const handleView = (report: Report) => {
    setSelectedReport(report);
    setAdminNote(report.adminNote || '');
    setDetailOpen(true);
  };

  const handleUpdateStatus = async (status: 'reviewed' | 'resolved' | 'rejected') => {
    if (!selectedReport) return;

    setIsSubmitting(true);
    const updatingToast = toast.loading(`Updating report status...`);

    try {
      const response = await fetch(`/api/admin/reports/${selectedReport.uuid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          admin_note: adminNote,
        }),
      });

      if (response.ok) {
        toast.success(`Report marked as ${status} successfully`, { id: updatingToast });
        setDetailOpen(false);
        mutate();
      } else {
        const data = (await response.json()) as any;
        toast.error(data?.message || 'Failed to update report', { id: updatingToast });
      }
    } catch (error) {
      console.error('Failed to update report:', error);
      toast.error('An error occurred while updating the report', { id: updatingToast });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBatchResolve = async () => {
    if (selectedIds.length === 0) return;

    const updatingToast = toast.loading(`Resolving ${selectedIds.length} report(s)...`);

    try {
      await Promise.all(
        selectedIds.map((uuid) =>
          fetch(`/api/admin/reports/${uuid}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'resolved' }),
          }),
        ),
      );

      toast.success(`Successfully resolved ${selectedIds.length} report(s)`, { id: updatingToast });
      setSelectedIds([]);
      mutate();
    } catch (error) {
      console.error('Failed to batch resolve:', error);
      toast.error('An error occurred while resolving reports', { id: updatingToast });
    }
  };

  const handleBatchReject = async () => {
    if (selectedIds.length === 0) return;

    const updatingToast = toast.loading(`Rejecting ${selectedIds.length} report(s)...`);

    try {
      await Promise.all(
        selectedIds.map((uuid) =>
          fetch(`/api/admin/reports/${uuid}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'rejected' }),
          }),
        ),
      );

      toast.success(`Successfully rejected ${selectedIds.length} report(s)`, { id: updatingToast });
      setSelectedIds([]);
      mutate();
    } catch (error) {
      console.error('Failed to batch reject:', error);
      toast.error('An error occurred while rejecting reports', { id: updatingToast });
    }
  };

  const batchActions: ToolbarAction[] = [
    {
      label: 'Mark as Resolved',
      onClick: handleBatchResolve,
      variant: 'default',
    },
    {
      label: 'Mark as Rejected',
      onClick: handleBatchReject,
      variant: 'secondary',
    },
  ];

  const columns: Column<Report>[] = [
    {
      key: 'gameName',
      header: 'Game',
      render: (report) => <span className="font-medium">{report.gameName}</span>,
    },
    {
      key: 'reportType',
      header: 'Type',
      render: (report) => <Badge variant="outline">{report.reportType}</Badge>,
    },
    {
      key: 'content',
      header: 'Description',
      render: (report) => <p className="line-clamp-2 max-w-md text-sm">{report.content}</p>,
    },
    {
      key: 'userName',
      header: 'Reporter',
      render: (report) => (
        <div className="text-sm">
          <p>{report.userName}</p>
          <p className="text-muted-foreground text-xs">{report.userEmail}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (report) => {
        const variant =
          report.status === 'resolved'
            ? 'default'
            : report.status === 'rejected'
              ? 'destructive'
              : report.status === 'reviewed'
                ? 'secondary'
                : 'outline';
        return <Badge variant={variant as any}>{report.status}</Badge>;
      },
    },
    {
      key: 'createdAt',
      header: 'Reported',
      render: (report) => (
        <span className="text-muted-foreground text-sm">
          {formatDistanceToNow(new Date(report.createdAt * 1000), { addSuffix: true })}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'w-20',
      render: (report) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MdiDotsVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleView(report)}>
              <MdiEye className="mr-2 size-4" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => window.open(`/game/${report.gameUuid}`, '_blank')}>
              View Game
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
          <h1 className="text-foreground text-3xl font-bold">Report Management</h1>
          <p className="text-muted-foreground mt-2">Review and handle user reports</p>
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
            searchPlaceholder="Search reports by game or reporter..."
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
              <SelectItem value="reviewed">Reviewed</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-destructive/10 border-destructive/50 text-destructive rounded-lg border p-4">
          <h3 className="font-semibold">Failed to load reports</h3>
          <p className="text-sm opacity-90">{error.message || 'An error occurred while fetching reports'}</p>
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
            <p>Loading reports...</p>
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
            data={reports}
            getRowId={(report) => report.uuid}
            onSelectionChange={setSelectedIds}
            selectable
            emptyMessage="No reports found"
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

      {/* Report Detail Dialog */}
      {selectedReport && (
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Report Details</DialogTitle>
              <DialogDescription>Review and process this report</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Game Info */}
              <div>
                <Label>Game</Label>
                <p className="mt-1 font-medium">{selectedReport.gameName}</p>
              </div>

              {/* Report Type */}
              <div>
                <Label>Report Type</Label>
                <p className="mt-1">
                  <Badge variant="outline">{selectedReport.reportType}</Badge>
                </p>
              </div>

              {/* Reporter Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Reporter Name</Label>
                  <p className="mt-1">{selectedReport.userName}</p>
                </div>
                <div>
                  <Label>Reporter Email</Label>
                  <p className="mt-1">{selectedReport.userEmail}</p>
                </div>
              </div>

              {/* Description */}
              <div>
                <Label>Description</Label>
                <p className="bg-muted mt-1 rounded-md p-3 text-sm">{selectedReport.content}</p>
              </div>

              {/* Status */}
              <div>
                <Label>Current Status</Label>
                <p className="mt-1">
                  <Badge>{selectedReport.status}</Badge>
                </p>
              </div>

              {/* Admin Note */}
              <div>
                <Label htmlFor="admin-note">Admin Note</Label>
                <Textarea
                  id="admin-note"
                  placeholder="Add notes about this report..."
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  rows={3}
                  className="mt-1"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => setDetailOpen(false)} className="flex-1">
                  Cancel
                </Button>
                <Button
                  onClick={() => handleUpdateStatus('reviewed')}
                  disabled={isSubmitting}
                  variant="secondary"
                  className="flex-1"
                >
                  <MdiCheck className="mr-2 size-4" />
                  Mark Reviewed
                </Button>
                <Button
                  onClick={() => handleUpdateStatus('resolved')}
                  disabled={isSubmitting}
                  variant="default"
                  className="flex-1"
                >
                  <MdiCheck className="mr-2 size-4" />
                  Resolve
                </Button>
                <Button
                  onClick={() => handleUpdateStatus('rejected')}
                  disabled={isSubmitting}
                  variant="destructive"
                  className="flex-1"
                >
                  <MdiClose className="mr-2 size-4" />
                  Reject
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
