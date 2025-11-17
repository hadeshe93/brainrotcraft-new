import { Breadcrumb as BreadcrumbType } from '@/types/blocks/breadcrumb';

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { cn } from '@/lib/utils';
import { Link } from '@/i18n/navigation';

interface BreadcrumbProps {
  className?: string;
  config: BreadcrumbType;
}

export function BreadcrumbComponent({ config, className }: BreadcrumbProps) {
  const { items } = config;
  const lastIndex = items.length - 1;
  return (
    <Breadcrumb className={cn('mb-4', className)}>
      <BreadcrumbList>
        {items.map((item, index) => {
          const isLast = index === lastIndex;
          return (
            <div key={`div-item-${index}`} className='flex items-center'>
              <BreadcrumbItem key={`item-${index}`}>
                {isLast ? (
                  <BreadcrumbPage>{item.title}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={item.link?.url || '/'}>{item.title}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {index < items.length - 1 && <BreadcrumbSeparator key={`separator-${index}`} />}
            </div>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
