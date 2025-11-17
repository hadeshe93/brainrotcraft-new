'use client';

import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import MdiChevronUp from '~icons/mdi/chevron-up';
import MdiChevronDown from '~icons/mdi/chevron-down';

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  getRowId: (row: T) => string;
  onSelectionChange?: (selectedIds: string[]) => void;
  selectable?: boolean;
  emptyMessage?: string;
  className?: string;
  // Controlled sorting (optional)
  sortColumn?: string | null;
  sortDirection?: 'asc' | 'desc';
  onSortChange?: (column: string, direction: 'asc' | 'desc') => void;
}

export default function DataTable<T>({
  columns,
  data,
  getRowId,
  onSelectionChange,
  selectable = false,
  emptyMessage = 'No data available',
  className,
  sortColumn: controlledSortColumn,
  sortDirection: controlledSortDirection,
  onSortChange,
}: DataTableProps<T>) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [internalSortColumn, setInternalSortColumn] = useState<string | null>(null);
  const [internalSortDirection, setInternalSortDirection] = useState<'asc' | 'desc'>('asc');

  // Use controlled or internal state
  const sortColumn = controlledSortColumn !== undefined ? controlledSortColumn : internalSortColumn;
  const sortDirection = controlledSortDirection !== undefined ? controlledSortDirection : internalSortDirection;

  const handleSelectAll = (checked: boolean | 'indeterminate') => {
    if (checked === true) {
      const allIds = data.map(getRowId);
      setSelectedIds(new Set(allIds));
      onSelectionChange?.(allIds);
    } else {
      setSelectedIds(new Set());
      onSelectionChange?.([]);
    }
  };

  const handleSelectRow = (rowId: string, checked: boolean | 'indeterminate') => {
    const newSelectedIds = new Set(selectedIds);
    if (checked === true) {
      newSelectedIds.add(rowId);
    } else {
      newSelectedIds.delete(rowId);
    }
    setSelectedIds(newSelectedIds);
    onSelectionChange?.(Array.from(newSelectedIds));
  };

  const handleSort = (columnKey: string) => {
    const newDirection = sortColumn === columnKey ? (sortDirection === 'asc' ? 'desc' : 'asc') : 'asc';

    if (onSortChange) {
      // Controlled mode: notify parent
      onSortChange(columnKey, newDirection);
    } else {
      // Uncontrolled mode: update internal state
      setInternalSortColumn(columnKey);
      setInternalSortDirection(newDirection);
    }
  };

  const isAllSelected = data.length > 0 && selectedIds.size === data.length;
  const isSomeSelected = selectedIds.size > 0 && selectedIds.size < data.length;

  return (
    <div className={cn('border-border overflow-hidden rounded-lg border', className)}>
      <Table>
        <TableHeader>
          <TableRow>
            {selectable && (
              <TableHead className="w-12">
                <Checkbox
                  checked={isAllSelected}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all"
                  className={cn(isSomeSelected && 'data-[state=checked]:bg-muted-foreground')}
                />
              </TableHead>
            )}
            {columns.map((column) => (
              <TableHead key={column.key} className={column.className}>
                {column.sortable ? (
                  <Button
                    variant="ghost"
                    onClick={() => handleSort(column.key)}
                    className="hover:bg-accent data-[state=open]:bg-accent -ml-3 h-8"
                  >
                    {column.header}
                    {sortColumn === column.key && (
                      <span className="ml-2">
                        {sortDirection === 'asc' ? (
                          <MdiChevronUp className="size-4" />
                        ) : (
                          <MdiChevronDown className="size-4" />
                        )}
                      </span>
                    )}
                  </Button>
                ) : (
                  column.header
                )}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columns.length + (selectable ? 1 : 0)}
                className="text-muted-foreground h-24 text-center"
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            data.map((row) => {
              const rowId = getRowId(row);
              const isSelected = selectedIds.has(rowId);

              return (
                <TableRow key={rowId} data-state={isSelected && 'selected'}>
                  {selectable && (
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => handleSelectRow(rowId, checked as boolean)}
                        aria-label={`Select row ${rowId}`}
                      />
                    </TableCell>
                  )}
                  {columns.map((column) => (
                    <TableCell key={column.key} className={column.className}>
                      {column.render ? column.render(row) : (row as any)[column.key]}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
