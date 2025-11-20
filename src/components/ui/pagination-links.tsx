'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import MdiChevronLeft from '~icons/mdi/chevron-left';
import MdiChevronRight from '~icons/mdi/chevron-right';

interface PaginationLinksProps {
  currentPage: number;
  totalPages: number;
  baseUrl: string;  // Base URL for pagination (e.g., "/tag/action-games", "/games")
  className?: string;
}

export default function PaginationLinks({ currentPage, totalPages, baseUrl, className }: PaginationLinksProps) {
  const t = useTranslations('common.pagination');

  // Generate page URL: page 1 = baseUrl, page 2+ = baseUrl/page
  const getPageUrl = (page: number) => {
    if (page === 1) {
      return baseUrl;
    }
    return `${baseUrl}/${page}`;
  };

  // Calculate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 7;

    if (totalPages <= maxVisiblePages) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (currentPage > 3) {
        pages.push('...');
      }

      // Show pages around current page
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push('...');
      }

      // Always show last page
      pages.push(totalPages);
    }

    return pages;
  };

  if (totalPages <= 1) {
    return null; // Don't show pagination if only one page
  }

  return (
    <nav className={cn('flex items-center justify-center gap-1', className)} aria-label={t('aria_label')}>
      {/* Previous Button */}
      {currentPage > 1 ? (
        <Button variant="outline" size="icon" aria-label={t('previous')} className="h-9 w-9" asChild>
          <Link href={getPageUrl(currentPage - 1)}>
            <MdiChevronLeft className="size-5" />
          </Link>
        </Button>
      ) : (
        <Button variant="outline" size="icon" disabled aria-label={t('previous')} className="h-9 w-9">
          <MdiChevronLeft className="size-5" />
        </Button>
      )}

      {/* Page Numbers */}
      {getPageNumbers().map((page, index) => {
        if (page === '...') {
          return (
            <span key={`ellipsis-${index}`} className="text-muted-foreground flex h-9 w-9 items-center justify-center">
              ...
            </span>
          );
        }

        const pageNumber = page as number;
        const isActive = pageNumber === currentPage;

        return (
          <Button
            key={pageNumber}
            variant={isActive ? 'default' : 'outline'}
            size="icon"
            aria-label={t('page', { number: pageNumber })}
            aria-current={isActive ? 'page' : undefined}
            className="h-9 w-9"
            asChild={!isActive}
          >
            {isActive ? (
              <span>{pageNumber}</span>
            ) : (
              <Link href={getPageUrl(pageNumber)}>{pageNumber}</Link>
            )}
          </Button>
        );
      })}

      {/* Next Button */}
      {currentPage < totalPages ? (
        <Button variant="outline" size="icon" aria-label={t('next')} className="h-9 w-9" asChild>
          <Link href={getPageUrl(currentPage + 1)}>
            <MdiChevronRight className="size-5" />
          </Link>
        </Button>
      ) : (
        <Button variant="outline" size="icon" disabled aria-label={t('next')} className="h-9 w-9">
          <MdiChevronRight className="size-5" />
        </Button>
      )}
    </nav>
  );
}
