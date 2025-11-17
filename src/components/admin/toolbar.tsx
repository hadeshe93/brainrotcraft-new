'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import MdiMagnify from '~icons/mdi/magnify';
import MdiPlus from '~icons/mdi/plus';
import MdiDotsVertical from '~icons/mdi/dots-vertical';

export interface ToolbarAction {
  label: string;
  onClick: () => void;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  icon?: React.ComponentType<{ className?: string }>;
}

interface ToolbarProps {
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
  onAdd?: () => void;
  addLabel?: string;
  batchActions?: ToolbarAction[];
  selectedCount?: number;
  className?: string;
}

export default function Toolbar({
  searchPlaceholder = 'Search...',
  onSearch,
  onAdd,
  addLabel = 'Add New',
  batchActions = [],
  selectedCount = 0,
  className,
}: ToolbarProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    onSearch?.(value);
  };

  return (
    <div className={cn('flex items-center justify-between gap-4', className)}>
      {/* Left: Search */}
      <div className="flex flex-1 items-center gap-2">
        <div className="relative max-w-sm flex-1">
          <MdiMagnify className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            type="text"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Batch Actions */}
        {selectedCount > 0 && batchActions.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm">{selectedCount} selected</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <MdiDotsVertical className="size-4" />
                  <span className="ml-2">Batch Actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {batchActions.map((action, index) => (
                  <DropdownMenuItem key={index} onClick={action.onClick}>
                    {action.icon && <action.icon className="mr-2 size-4" />}
                    {action.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {/* Right: Add Button */}
      {onAdd && (
        <Button onClick={onAdd}>
          <MdiPlus className="size-5" />
          <span className="ml-2">{addLabel}</span>
        </Button>
      )}
    </div>
  );
}
